const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { syncDatabase } = require('./models');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { startAutoCleanup } = require('./utils/trashCleanup');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow localhost on any port
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true, // Cookie transferine izin ver
    exposedHeaders: ['Content-Disposition'] // Dosya isimlerini okuyabilmek için
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session Ayarları
app.use(session({
    secret: process.env.SESSION_SECRET || 'crm-bizcard-app-session-key-fallback', // Prod ortamında env'den alınmalı
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // HTTPS olmadığı için false (Prod'da true olmalı)
}));

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
        res.status(500).json({ error: error.message });
    }
});

// Public Dashboard Tiles
app.use('/api/db-tiles', require('./routes/dashboardTiles'));

// Korumalı rotalar - Oturum açmış kullanıcılar gereklidir
app.use('/api/cards', requireAuth, require('./routes/cards'));
app.use('/api/interactions', requireAuth, require('./routes/interactions'));
app.use('/api/logs', requireAuth, require('./routes/logs'));
app.use('/api/tags', requireAuth, require('./routes/tags'));
app.use('/api/users', requireAuth, requireAdmin, require('./routes/users'));
app.use('/api/settings', requireAuth, requireAdmin, require('./routes/settings'));

app.get('/', (req, res) => {
    res.json({ message: 'CRM Backend API Çalışıyor!' });
});

// Sunucuyu Başlat ve DB'yi Senkronize Et
app.listen(port, async () => {
    console.log(`Sunucu ${port} portunda çalışıyor.`);
    await syncDatabase();

    // Veritabanı sütunlarından emin ol
    try {
        const { sequelize } = require('./models');
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('BusinessCards');
        if (!tableInfo.logoUrl) {
            await queryInterface.addColumn('BusinessCards', 'logoUrl', { type: require('sequelize').DataTypes.STRING, allowNull: true });
        }
        if (!tableInfo.ownerId) {
            await queryInterface.addColumn('BusinessCards', 'ownerId', { type: require('sequelize').DataTypes.INTEGER, allowNull: true });
        }
    } catch (e) {
        console.error('Column check failed:', e.message);
    }

    // Otomatik çöp kutusu temizlemeyi başlat
    startAutoCleanup();
    console.log('Otomatik çöp kutusu temizleme aktif.');
});
