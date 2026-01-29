const express = require('express');
const router = express.Router();
const { SystemSetting } = require('../models');

// Ayarları Getir
router.get('/', async (req, res) => {
    try {
        const settings = await SystemSetting.findAll();

        // Varsayılan Değerler
        const defaults = {
            logRetentionLimit: 1000,
            trashRetentionDays: 30,
            allowPublicRegistration: 'true'
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

        res.json(result);
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ayarları Güncelle
router.put('/', async (req, res) => {
    try {
        const { logRetentionLimit, trashRetentionDays, allowPublicRegistration } = req.body;

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

        res.json({ message: 'Ayarlar güncellendi.', settings: req.body });
    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
