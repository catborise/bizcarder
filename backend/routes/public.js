const express = require('express');
const router = express.Router();
const { BusinessCard, Tag, User } = require('../models');
const { generateVCard } = require('../utils/vcard');

// Public Dashboard Stats (no auth required)
router.get('/api/cards/stats', async (req, res) => {
    try {
        const count = await BusinessCard.count({ where: { deletedAt: null } });
        res.json({ totalCards: count });
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ errorCode: 'STATS_LOAD_FAILED' });
    }
});

// Public Card View by sharing token (no auth required)
router.get('/api/cards/public/:token', async (req, res) => {
    try {
        const card = await BusinessCard.findOne({
            where: {
                sharingToken: req.params.token,
                deletedAt: null,
                visibility: 'public',
            },
            include: [
                { model: Tag, as: 'tags', through: { attributes: [] } },
                { model: User, as: 'owner', attributes: ['displayName'] },
            ],
        });

        if (!card) {
            return res.status(404).json({ errorCode: 'CARD_NOT_FOUND_OR_PRIVATE' });
        }

        res.json(card);
    } catch (error) {
        console.error('Public card error:', error);
        res.status(500).json({ errorCode: 'PUBLIC_CARD_LOAD_FAILED' });
    }
});

// Public vCard download by sharing token (no auth required)
router.get('/api/cards/public/:token/vcf', async (req, res) => {
    try {
        const card = await BusinessCard.findOne({
            where: {
                sharingToken: req.params.token,
                deletedAt: null,
                visibility: 'public',
            },
        });

        if (!card) return res.status(404).json({ errorCode: 'VCARD_NOT_FOUND' });

        const vCardContent = generateVCard(card);
        const fileName = `${card.firstName}_${card.lastName}.vcf`.replace(/\s+/g, '_');

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(vCardContent);
    } catch (error) {
        console.error('Public vcf error:', error);
        res.status(500).json({ errorCode: 'VCARD_GENERATE_FAILED' });
    }
});

module.exports = router;
