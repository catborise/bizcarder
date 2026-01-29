const express = require('express');
const router = express.Router();
const { AuditLog, User } = require('../models');

// Tüm logları getir (Sadece Admin yetkisi olmalı - Şimdilik herkese açık ama filtreli)
router.get('/', async (req, res) => {
    try {
        const whereClause = {};

        // 1. Yetki Kontrolü
        if (req.user && req.user.role !== 'admin') {
            if (!req.user.id) return res.json([]);
            whereClause.userId = req.user.id;
        } else if (req.query.userId) {
            whereClause.userId = req.query.userId;
        }

        const logs = await AuditLog.findAll({
            where: whereClause,
            include: [{ model: User, as: 'user', attributes: ['id', 'username', 'displayName', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit: 500 // Client tarafında filtreleme için daha fazla veri çekiyoruz
        });

        res.json(logs);
    } catch (error) {
        console.error("Logs API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
