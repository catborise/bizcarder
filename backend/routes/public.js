const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { BusinessCard, Tag, User } = require('../models');
const { generateVCard } = require('../utils/vcard');
const { getPublicSharedAgenda } = require('../controllers/agendaShareController');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Allowlist of fields safe for public sharing (excludes internal CRM notes, OCR text, lead scoring, reminders, etc.)
const PUBLIC_CARD_ATTRIBUTES = [
    'id',
    'firstName',
    'lastName',
    'company',
    'title',
    'email',
    'phone',
    'address',
    'city',
    'country',
    'website',
    'frontImageUrl',
    'backImageUrl',
    'logoUrl',
    'visibility',
    'isPersonal',
    'sharingToken',
];

// Public Dashboard Stats (no auth required)
router.get('/api/cards/stats', async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [totalCards, thisWeek, followUps] = await Promise.all([
            BusinessCard.count({ where: { deletedAt: null } }),
            BusinessCard.count({
                where: {
                    deletedAt: null,
                    createdAt: { [Op.gte]: sevenDaysAgo },
                },
            }),
            BusinessCard.count({
                where: {
                    deletedAt: null,
                    leadStatus: 'Following-up',
                },
            }),
        ]);

        res.json({ totalCards, thisWeek, followUps });
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ errorCode: 'STATS_LOAD_FAILED' });
    }
});

// Public Card View by sharing token (no auth required)
router.get('/api/cards/public/:token', async (req, res) => {
    try {
        if (!UUID_REGEX.test(req.params.token)) {
            return res.status(404).json({ errorCode: 'CARD_NOT_FOUND_OR_PRIVATE' });
        }

        const card = await BusinessCard.findOne({
            attributes: PUBLIC_CARD_ATTRIBUTES,
            where: {
                sharingToken: req.params.token,
                deletedAt: null,
                visibility: 'public',
            },
            include: [
                { model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } },
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
        if (!UUID_REGEX.test(req.params.token)) {
            return res.status(404).json({ errorCode: 'VCARD_NOT_FOUND' });
        }

        const card = await BusinessCard.findOne({
            attributes: PUBLIC_CARD_ATTRIBUTES,
            where: {
                sharingToken: req.params.token,
                deletedAt: null,
                visibility: 'public',
            },
        });

        if (!card) return res.status(404).json({ errorCode: 'VCARD_NOT_FOUND' });

        // Never expose internal CRM notes in public vCard downloads
        const vCardContent = generateVCard({ ...card.toJSON(), notes: null });
        const safeLast = card.lastName ? `_${card.lastName}` : '';
        const fileName = `${card.firstName}${safeLast}.vcf`.replace(/\s+/g, '_');

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(vCardContent);
    } catch (error) {
        console.error('Public vcf error:', error);
        res.status(500).json({ errorCode: 'VCARD_GENERATE_FAILED' });
    }
});

// Public Shared Agenda Page View (no auth required, rate-limited by /api/ apiLimiter)
router.get('/api/public/agenda/:token', getPublicSharedAgenda);

module.exports = router;
