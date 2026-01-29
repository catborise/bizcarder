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

module.exports = router;
