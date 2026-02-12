const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { logAction } = require('../utils/logger');

// Tüm Kullanıcıları Getir
router.get('/', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'displayName', 'role', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Kullanıcı Rolünü Güncelle
router.put('/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Geçersiz rol.' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const oldRole = user.role;
        await user.update({ role });

        // LOG: Role değişimi
        await logAction({
            action: 'USER_ROLE_UPDATE',
            details: `Kullanıcı rolü güncellendi: ${user.username} (${oldRole} -> ${role})`,
            req
        });

        res.json({ message: 'Kullanıcı rolü güncellendi.', user });
    } catch (error) {
        await logAction({
            action: 'USER_ROLE_UPDATE_ERROR',
            details: error.message,
            req
        });
        res.status(500).json({ error: error.message });
    }
});

// Admin Tarafından Kullanıcı Şifresi Sıfırlama
router.put('/:id/password', async (req, res) => {
    try {
        // Sadece admin yapabilir (Middleware olmadığı için manuel kontrol - normalde middleware kullanılmalı)
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }

        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'Yeni şifre gereklidir.' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        // Şifreyi güncelle (Model hook'u hashleyecek)
        user.password = newPassword;
        await user.save();

        // LOG: Şifre sıfırlama
        await logAction({
            action: 'ADMIN_PASSWORD_RESET',
            details: `Admin ${req.user.username}, ${user.username} kullanıcısının şifresini sıfırladı.`,
            req
        });

        res.json({ message: 'Kullanıcı şifresi başarıyla güncellendi.' });
    } catch (error) {
        console.error('Admin password reset error:', error);
        res.status(500).json({ error: 'Şifre sıfırlanırken hata oluştu.' });
    }
});

module.exports = router;
