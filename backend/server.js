const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { logger } = require('./utils/logger');
const passport = require('./config/passport');
const flash = require('connect-flash');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize, connectDatabase } = require('./models');
const authRoutes = require('./routes/auth');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { startAutoCleanup } = require('./utils/trashCleanup');
const { startReminderNotifier } = require('./utils/reminderNotifier');
const { apiLimiter } = require('./middleware/rateLimiter');
const csrfProtection = require('./middleware/csrf');

const app = express();
const port = process.env.PORT || 5000;

// Caddy veya çoklu Reverse proxy (Nginx, LB vb.) arkasında IP limitlerini ve Secure cookie'yi doğru alabilmesi için
app.set('trust proxy', 1);

// HTTP Request Logging (Morgan) - Tüm istekleri yakalaması için en üstte
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Determine IdP Domain for CSP dynamically
let idpDomain = '';
if (process.env.SAML_ENTRY_POINT) {
    try {
        idpDomain = new URL(process.env.SAML_ENTRY_POINT).origin;
    } catch (e) {}
}

const connectSrcList = ["'self'"];
if (idpDomain) connectSrcList.push(idpDomain);
if (process.env.FRONTEND_URL) connectSrcList.push(process.env.FRONTEND_URL);

// Security Middleware (Helmet)
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:', '*'],
                connectSrc: connectSrcList,
            },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
    }),
);

// Debug Middleware: Gelen isteklerin yetki durumunu logla
app.use((req, res, next) => {
    // console.log(`[DEBUG] ${req.method} ${req.path} - Authenticated: ${req.isAuthenticated()} - SessionID: ${req.sessionID}`);
    next();
});

// Middleware
// CORS Configuration
const allowedOrigins = ['http://localhost', 'http://127.0.0.1'];

// FRONTEND_URL ekle
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

// SAML IdP domainini ekle (CORS hatasını önlemek için)
if (process.env.SAML_ENTRY_POINT) {
    try {
        const samlUrl = new URL(process.env.SAML_ENTRY_POINT);
        allowedOrigins.push(`${samlUrl.protocol}//${samlUrl.host}`);
    } catch (e) {
        // Geçersiz URL ise pas geç
    }
}

if (process.env.ALLOWED_ORIGINS) {
    const origins = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    allowedOrigins.push(...origins);
}

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (same-origin requests, server-to-server)
            if (!origin) return callback(null, true);

            // Sadece tam eşleşmeye izin ver
            const isAllowed = allowedOrigins.includes(origin);

            if (isAllowed) {
                return callback(null, true);
            }

            console.warn(`[CORS REJECTED] Origin: ${origin} is not in allowedOrigins:`, allowedOrigins);
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            return callback(new Error(msg), false);
        },
        credentials: true, // Cookie transferine izin ver
        exposedHeaders: ['Content-Disposition'], // Dosya isimlerini okuyabilmek için
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Rate Limiting (Tüm API rotalarına uygula)
app.use('/api/', apiLimiter);

const sessionStore = new SequelizeStore({
    db: sequelize,
    checkExpirationInterval: 15 * 60 * 1000, // Temizlik aralığı (15 dk)
    expiration: 24 * 60 * 60 * 1000, // Oturum ömrü (24 saat)
});

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    if (process.env.NODE_ENV === 'production') {
        logger.error('SESSION_SECRET env var is missing or too short (min 32 chars). Server cannot start securely.');
        process.exit(1);
    }
    logger.warn('SESSION_SECRET is missing or too short (min 32 chars). Using insecure fallback for development only.');
}

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        proxy: true, // Express trust proxy yetersiz kalırsa diye, force proxy modu. (Secure cookie logiği için kritik)
        name: 'bizcarder.sid',
        cookie: {
            secure: process.env.SESSION_SECURE === 'true',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            path: '/', // Path garanti altına alınıyor
            sameSite: process.env.SESSION_SECURE === 'true' ? 'none' : 'lax',
        },
    }),
);

// Session tablosunu oluştur (ilk seferde)
sessionStore.sync();

// Flash Messages
app.use(flash());

// Passport Başlatma
app.use(passport.initialize());
app.use(passport.session());

// CSRF Protection (double-submit cookie pattern)
app.use(csrfProtection);

// Statik Dosyalar — branding public, kart görselleri auth'lu
app.use('/uploads/branding', express.static('uploads/branding'));
app.use('/uploads', requireAuth, express.static('uploads'));

// Rotalar
app.use('/auth', authRoutes);

// Public routes (no auth required)
app.use(require('./routes/public'));

// Public Dashboard Tiles
app.use('/api/db-tiles', require('./routes/dashboardTiles'));

// Korumalı rotalar - Oturum açmış kullanıcılar gereklidir
app.use('/api/cards', requireAuth, require('./routes/cards'));
app.use('/api/interactions', requireAuth, require('./routes/interactions'));
app.use('/api/logs', requireAuth, require('./routes/logs'));
app.use('/api/tags', requireAuth, require('./routes/tags'));
app.use('/api/users', requireAuth, requireAdmin, require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/2fa', require('./routes/twoFactor'));

app.get('/', (req, res) => {
    res.json({ message: 'CRM Backend API Çalışıyor!' });
});

// Merkezi Hata Yönetimi (Error Handler)
app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

    // Üretim ortamında detaylı stack trace gönderme
    const response = {
        error: 'Sunucu Hatası',
        message: process.env.NODE_ENV === 'production' ? 'Bir şeyler ters gitti.' : err.message,
    };

    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(err.status || 500).json(response);
});

if (require.main === module) {
    const startServer = async () => {
        await connectDatabase();
        app.listen(port, () => {
            logger.info(`Server running on port ${port}`);
            startAutoCleanup();
            startReminderNotifier();
        });
    };
    startServer();
}

module.exports = app;
