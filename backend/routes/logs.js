const express = require('express');
const router = express.Router();
const { AuditLog, User } = require('../models');
const { logger } = require('../utils/logger');

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
            limit: 500, // Client tarafında filtreleme için daha fazla veri çekiyoruz
        });

        res.json(logs);
    } catch (error) {
        console.error('Logs API Error:', error);
        logger.error('Logs list error:', error);
        res.status(500).json({ error: 'Loglar alınırken hata oluştu.' });
    }
});

// GET /api/logs/rate-limits — admin only
router.get('/rate-limits', async (req, res) => {
    try {
        // Enforce admin-only access
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        const { AuditLog } = require('../models');
        const { Op } = require('sequelize');

        const since = req.query.since || new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

        const violations = await AuditLog.findAll({
            where: {
                action: 'RATE_LIMIT_EXCEEDED',
                createdAt: { [Op.gte]: since },
            },
            order: [['createdAt', 'DESC']],
            limit: 100,
        });

        // Summary stats
        const summary = {
            total: violations.length,
            byIP: {},
            byPath: {},
        };

        violations.forEach((v) => {
            const ipMatch = v.details?.match(/IP: ([^,]+)/);
            const pathMatch = v.details?.match(/Path: (.+)/);
            const ip = ipMatch?.[1] || 'unknown';
            const path = pathMatch?.[1] || 'unknown';
            summary.byIP[ip] = (summary.byIP[ip] || 0) + 1;
            summary.byPath[path] = (summary.byPath[path] || 0) + 1;
        });

        res.json({ summary, violations });
    } catch (error) {
        logger.error('Rate limits fetch error:', error);
        res.status(500).json({ error: 'Rate limit verileri alınırken hata oluştu.' });
    }
});

module.exports = router;
