const express = require('express');
const router = express.Router();
const { SystemSetting } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middleware/auth');

// Multer Ayarları (Branding Dosyaları)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/branding/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'branding-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Ayarları Getir
router.get('/', async (req, res) => {
    try {
        const settings = await SystemSetting.findAll();

        // Varsayılan Değerler
        const defaults = {
            logRetentionLimit: 1000,
            trashRetentionDays: 30,
            allowPublicRegistration: 'true',
            developerName: 'Developer',
            developerEmail: 'catborise@gmail.com',
            developerGithub: 'https://github.com/catborise/bizcarder',
            developerLinkedin: 'https://linkedin.com/in/muhammetalisag',
            companyName: 'BizCarder',
            companyLogo: '',
            companyIcon: '',
            appBanner: '',
            footerText: '© 2026 BizCarder. Tüm Hakları Saklıdır.'
        };

        // DB'den gelenleri objeye çevir
        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        // Merge defaults
        const result = { ...defaults, ...settingsMap };

        // Sayıya ve Boolean'a çevirme (DB'de string tutuluyor)
        result.logRetentionLimit = parseInt(result.logRetentionLimit, 10);
        result.trashRetentionDays = parseInt(result.trashRetentionDays, 10);
        result.allowPublicRegistration = result.allowPublicRegistration === 'true';

        // Yetki kontrolü: Admin değilse sadece branding bilgilerini döndür
        if (!req.isAuthenticated || !req.isAuthenticated() || req.user?.role !== 'admin') {
            const passport = require('passport');
            const samlEnabled = !!(passport._strategies && passport._strategies.saml);

            return res.json({
                companyName: result.companyName,
                companyLogo: result.companyLogo,
                companyIcon: result.companyIcon,
                appBanner: result.appBanner,
                footerText: result.footerText,
                allowPublicRegistration: result.allowPublicRegistration,
                samlEnabled: samlEnabled
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ayarları Güncelle
router.put('/', requireAdmin, async (req, res) => {
    try {
        const {
            logRetentionLimit,
            trashRetentionDays,
            allowPublicRegistration,
            developerName,
            developerEmail,
            developerGithub,
            developerLinkedin,
            companyName,
            companyLogo,
            companyIcon,
            appBanner,
            footerText
        } = req.body;

        // Validasyon
        if (logRetentionLimit && (isNaN(logRetentionLimit) || logRetentionLimit < 10)) {
            return res.status(400).json({ error: 'Geçersiz log limiti.' });
        }
        if (trashRetentionDays && (isNaN(trashRetentionDays) || trashRetentionDays < 1)) {
            return res.status(400).json({ error: 'Geçersiz çöp kutusu süresi.' });
        }

        // Upsert - Varsa güncelle, yoksa oluştur
        // Transaction kullanılabilir ama basit update yeterli

        if (logRetentionLimit !== undefined) {
            await SystemSetting.upsert({
                key: 'logRetentionLimit',
                value: String(logRetentionLimit),
                description: 'Maksimum log kayıt sayısı'
            });
        }

        if (trashRetentionDays !== undefined) {
            await SystemSetting.upsert({
                key: 'trashRetentionDays',
                value: String(trashRetentionDays),
                description: 'Silinen kartların saklanma süresi (gün)'
            });
        }

        if (allowPublicRegistration !== undefined) {
            await SystemSetting.upsert({
                key: 'allowPublicRegistration',
                value: String(allowPublicRegistration),
                description: 'Yeni kullanıcı kaydı açık mı?'
            });
        }

        if (developerName !== undefined) {
            await SystemSetting.upsert({
                key: 'developerName',
                value: String(developerName),
                description: 'Hakkında sayfasında görünen geliştirici adı'
            });
        }

        if (developerEmail !== undefined) {
            await SystemSetting.upsert({
                key: 'developerEmail',
                value: String(developerEmail),
                description: 'Hakkında sayfasında görünen geliştirici e-postası'
            });
        }

        if (developerGithub !== undefined) {
            await SystemSetting.upsert({
                key: 'developerGithub',
                value: String(developerGithub),
                description: 'Hakkında sayfasında görünen GitHub linki'
            });
        }

        if (developerLinkedin !== undefined) {
            await SystemSetting.upsert({
                key: 'developerLinkedin',
                value: String(developerLinkedin),
                description: 'Hakkında sayfasında görünen LinkedIn linki'
            });
        }

        if (companyName !== undefined) {
            await SystemSetting.upsert({
                key: 'companyName',
                value: String(companyName),
                description: 'Şirket/Uygulama adı'
            });
        }

        if (companyLogo !== undefined) {
            await SystemSetting.upsert({
                key: 'companyLogo',
                value: String(companyLogo),
                description: 'Uygulama logosu URL'
            });
        }

        if (companyIcon !== undefined) {
            await SystemSetting.upsert({
                key: 'companyIcon',
                value: String(companyIcon),
                description: 'Uygulama simgesi (favicon) URL'
            });
        }

        if (appBanner !== undefined) {
            await SystemSetting.upsert({
                key: 'appBanner',
                value: String(appBanner),
                description: 'Dashboard banner görseli URL'
            });
        }

        if (footerText !== undefined) {
            await SystemSetting.upsert({
                key: 'footerText',
                value: String(footerText),
                description: 'Sayfa altı (footer) trademark metni'
            });
        }

        res.json({ message: 'Ayarlar güncellendi.', settings: req.body });
    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Branding Dosyası Yükle
router.post('/upload-branding', requireAdmin, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Dosya yüklenemedi.' });
        }
        const fileUrl = `/uploads/branding/${req.file.filename}`;
        res.json({ url: fileUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
