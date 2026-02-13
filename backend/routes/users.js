const express = require('express');
const router = express.Router();
const { User, BusinessCard } = require('../models');
const { logAction } = require('../utils/logger');

// Tüm Kullanıcıları Getir
router.get('/', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'displayName', 'role', 'isApproved', 'createdAt'],
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

// Admin Tarafından Kullanıcı Onaylama
router.put('/:id/approve', async (req, res) => {
    try {
        // Sadece admin yapabilir
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }

        const { id } = req.params;
        const { isApproved } = req.body;

        if (typeof isApproved !== 'boolean') {
            return res.status(400).json({ error: 'isApproved boolean değeri olmalıdır.' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        // Onay durumunu güncelle
        await user.update({ isApproved });

        // LOG: Kullanıcı onaylama
        await logAction({
            action: 'USER_APPROVAL_UPDATE',
            details: `Admin ${req.user.username}, ${user.username} kullanıcısının onay durumunu güncelledi: ${isApproved}`,
            req
        });

        res.json({
            message: isApproved ? 'Kullanıcı onaylandı.' : 'Kullanıcı onayı kaldırıldı.',
            user: {
                id: user.id,
                username: user.username,
                isApproved: user.isApproved
            }
        });
    } catch (error) {
        console.error('User approval error:', error);
        res.status(500).json({ error: 'Onay işlemi sırasında hata oluştu.' });
    }
});

// Kullanıcıyı Sil (Kartvizitleri Sil veya Aktar)
router.delete('/:id', async (req, res) => {
    try {
        // Sadece admin yapabilir
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }

        const { id } = req.params;
        const { transferCards } = req.body; // true: aktar, false: kartları da sil (soft delete)

        // Kendini silmeyi engelle
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Kendinizi silemezsiniz.' });
        }

        const userToDelete = await User.findByPk(id);
        if (!userToDelete) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const cardCount = await BusinessCard.count({ where: { ownerId: id } });

        if (transferCards === true) {
            // Kartları admin'e aktar
            await BusinessCard.update(
                { ownerId: req.user.id },
                { where: { ownerId: id } }
            );
            await logAction({
                action: 'USER_DELETE_TRANSFER',
                details: `Admin ${req.user.username}, ${userToDelete.username} kullanıcısını sildi ve ${cardCount} kartviziti devraldı.`,
                req
            });
        } else {
            // Kartları soft delete yap ve admin'e ata (çöp kutusunda admin görsün diye)
            await BusinessCard.update(
                {
                    ownerId: req.user.id,
                    deletedAt: new Date(),
                    deletedBy: req.user.id
                },
                { where: { ownerId: id } }
            );
            await logAction({
                action: 'USER_DELETE_WITH_CARDS',
                details: `Admin ${req.user.username}, ${userToDelete.username} kullanıcısını ve ${cardCount} kartvizitini sildi.`,
                req
            });
        }

        // Kullanıcıyı sil
        await userToDelete.destroy();

        res.json({ message: 'Kullanıcı başarıyla silindi.' });

    } catch (error) {
        console.error('User delete error:', error);
        res.status(500).json({ error: 'Kullanıcı silinirken hata oluştu.' });
    }
});

module.exports = router;
