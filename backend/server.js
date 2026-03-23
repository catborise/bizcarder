require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const { logger } = require('./utils/logger');
const passport = require('./config/passport');
const flash = require('connect-flash');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize, connectDatabase } = require('./models');
const authRoutes = require('./routes/auth');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { startAutoCleanup } = require('./utils/trashCleanup');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const port = process.env.PORT || 5000;

// Caddy arkasında çalışırken HTTPS/Session sağlıklı çalışması için kritik.
// Reverse proxy (Caddy/Nginx) arkasında IP limitlerini ve Secure cookie'yi doğru alabilmesi için 1 olmalı.
app.set('trust proxy', 1);


// HTTP Request Logging (Morgan) - Tüm istekleri yakalaması için en üstte
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Determine IdP Domain for CSP dynamically
let idpDomain = '';
if (process.env.SAML_ENTRY_POINT) {
    try {
        idpDomain = new URL(process.env.SAML_ENTRY_POINT).origin;
    } catch (e) {}
}

const connectSrcList = ["'self'", "*"];
if (idpDomain) connectSrcList.push(idpDomain);

// Security Middleware (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "*"],
            connectSrc: connectSrcList
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));


// Debug Middleware: Gelen isteklerin yetki durumunu logla
app.use((req, res, next) => {
    // console.log(`[DEBUG] ${req.method} ${req.path} - Authenticated: ${req.isAuthenticated()} - SessionID: ${req.sessionID}`);
    next();
});

// Middleware
// CORS Configuration
const allowedOrigins = [
    'http://localhost',
    'http://127.0.0.1',
];

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
    const origins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    allowedOrigins.push(...origins);
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if origin is whitelisted or starts with a whitelisted pattern
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
    exposedHeaders: ['Content-Disposition'] // Dosya isimlerini okuyabilmek için
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate Limiting (Tüm API rotalarına uygula)
app.use('/api/', apiLimiter);


const sessionStore = new SequelizeStore({
    db: sequelize,
    checkExpirationInterval: 15 * 60 * 1000, // Temizlik aralığı (15 dk)
    expiration: 24 * 60 * 60 * 1000  // Oturum ömrü (24 saat)
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'varsayilan-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: false, // Doğrudan erişim için false olmalı
    name: 'bizcarder.sid', 
    cookie: {
        secure: process.env.SESSION_SECURE === 'true', 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax' 
    }
}));

// Session tablosunu oluştur (ilk seferde)
sessionStore.sync();

// Flash Messages
app.use(flash());

// Passport Başlatma
app.use(passport.initialize());
app.use(passport.session());

// Statik Dosyalar (Yüklenen Resimler)
app.use('/uploads', express.static('uploads'));

// Rotalar
app.use('/auth', authRoutes);

// Public Dashboard Stats
app.get('/api/cards/stats', async (req, res) => {
    try {
        const { BusinessCard } = require('./models');
        const count = await BusinessCard.count({ where: { deletedAt: null } });
        res.json({ totalCards: count });
    } catch (error) {
        console.error("Stats fetch error:", error);
        res.status(500).json({ error: 'İstatistikler alınamadı.' });
    }
});

// Public Dashboard Tiles
app.use('/api/db-tiles', require('./routes/dashboardTiles'));

// Public Card View (sharingToken üzerinden)
app.get('/api/cards/public/:token', async (req, res) => {
    try {
        const { BusinessCard, Tag, User } = require('./models');
        const card = await BusinessCard.findOne({
            where: {
                sharingToken: req.params.token,
                deletedAt: null,
                visibility: 'public'
            },
            include: [
                { model: Tag, as: 'tags', through: { attributes: [] } },
                { model: User, as: 'owner', attributes: ['displayName'] }
            ]
        });

        if (!card) {
            return res.status(404).json({ error: 'Kartvizit bulunamadı veya paylaşım gizli.' });
        }

        res.json(card);
    } catch (error) {
        console.error("Public card error:", error);
        res.status(500).json({ error: 'Kartvizit bilgileri alınamadı.' });
    }
});

// vCard (Public Download via Token)
app.get('/api/cards/public/:token/vcf', async (req, res) => {
    try {
        const { BusinessCard } = require('./models');
        const { generateVCard } = require('./utils/vcard');
        const card = await BusinessCard.findOne({
            where: {
                sharingToken: req.params.token,
                deletedAt: null,
                visibility: 'public'
            }
        });

        if (!card) return res.status(404).json({ error: 'vCard bulunamadı.' });

        const vCardContent = generateVCard(card);
        const fileName = `${card.firstName}_${card.lastName}.vcf`.replace(/\s+/g, '_');

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(vCardContent);
    } catch (error) {
        console.error("Public vcf error:", error);
        res.status(500).json({ error: 'vCard dosyası oluşturulamadı.' });
    }
});

// Korumalı rotalar - Oturum açmış kullanıcılar gereklidir
app.use('/api/cards', requireAuth, require('./routes/cards'));
app.use('/api/interactions', requireAuth, require('./routes/interactions'));
app.use('/api/logs', requireAuth, require('./routes/logs'));
app.use('/api/tags', requireAuth, require('./routes/tags'));
app.use('/api/users', requireAuth, requireAdmin, require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));

app.get('/', (req, res) => {
    res.json({ message: 'CRM Backend API Çalışıyor!' });
});

// Merkezi Hata Yönetimi (Error Handler)
app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    
    // Üretim ortamında detaylı stack trace gönderme
    const response = {
        error: 'Sunucu Hatası',
        message: process.env.NODE_ENV === 'production' ? 'Bir şeyler ters gitti.' : err.message
    };

    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(err.status || 500).json(response);
});

// Sunucuyu Başlat ve DB'ye Bağlan
app.listen(port, () => {
    logger.info(`Sunucu ${port} portunda çalışıyor...`);
    connectDatabase();
    startAutoCleanup();
    console.log('Otomatik çöp kutusu temizleme aktif.');
});
