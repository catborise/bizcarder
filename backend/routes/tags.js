const express = require('express');
const router = express.Router();
const { Tag, BusinessCard, sequelize } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { logger, logAction } = require('../utils/logger');

// All tag routes require authentication
router.use(requireAuth);

// Tüm Etiketleri Getir
router.get('/', async (req, res) => {
    try {
        const tags = await Tag.findAll({
            order: [['name', 'ASC']],
        });
        res.json(tags);
    } catch (error) {
        logger.error('Tags list error:', error);
        res.status(500).json({ errorCode: 'TAGS_LOAD_FAILED' });
    }
});

// Etiket İstatistiklerini Getir (En çok kullanılanlar)
router.get('/stats', async (req, res) => {
    try {
        // BusinessCardTags tablosu üzerinden sayıları al
        const stats = await Tag.findAll({
            attributes: ['id', 'name', 'color', [sequelize.fn('COUNT', sequelize.col('cards.id')), 'cardCount']],
            include: [
                {
                    model: BusinessCard,
                    as: 'cards',
                    attributes: [],
                    through: { attributes: [] },
                    where: { deletedAt: null },
                    required: false,
                },
            ],
            group: ['Tag.id'],
            order: [[sequelize.literal('"cardCount"'), 'DESC']],
            subQuery: false,
            limit: 10,
        });
        res.json(stats);
    } catch (error) {
        console.error('Tag stats error:', error);
        logger.error('Tag stats error:', error);
        res.status(500).json({ errorCode: 'TAG_STATS_FAILED' });
    }
});

// Yeni Etiket Oluştur
router.post('/', async (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name) {
            return res.status(400).json({ errorCode: 'TAG_NAME_REQUIRED' });
        }

        const newTag = await Tag.create({
            name,
            color: color || '#3b82f6',
            ownerId: req.user.id,
        });

        await logAction({
            action: 'TAG_CREATE',
            details: `Tag created: "${name}" (color: ${color || '#3b82f6'})`,
            req,
        });

        res.status(201).json(newTag);
    } catch (error) {
        logger.error('Tag create error:', error);
        res.status(500).json({ errorCode: 'TAG_CREATE_FAILED' });
    }
});

// Etiket Güncelle
router.put('/:id', async (req, res) => {
    const { name, color } = req.body;
    const t = await sequelize.transaction();
    try {
        const tag = await Tag.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!tag) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'TAG_NOT_FOUND' });
        }

        // Sadece admin veya sahibinin düzenlemesine izin ver (ownerId null ise sistem etiketidir, admin düzenleyebilir)
        if (req.user.role !== 'admin' && tag.ownerId && tag.ownerId !== req.user.id) {
            await t.rollback();
            return res.status(403).json({ errorCode: 'TAG_EDIT_FORBIDDEN' });
        }

        const oldName = tag.name;
        const oldColor = tag.color;
        await tag.update({ name, color }, { transaction: t });
        await t.commit();

        await logAction({
            action: 'TAG_UPDATE',
            details: `Tag updated: "${oldName}" -> "${name || oldName}" (color: ${oldColor} -> ${color || oldColor})`,
            req,
        });

        res.json(tag);
    } catch (error) {
        await t.rollback();
        logger.error('Tag update error:', error);
        res.status(500).json({ errorCode: 'TAG_UPDATE_FAILED' });
    }
});

// Etiket Sil
router.delete('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const tag = await Tag.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!tag) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'TAG_NOT_FOUND' });
        }

        if (req.user.role !== 'admin' && tag.ownerId && tag.ownerId !== req.user.id) {
            await t.rollback();
            return res.status(403).json({ errorCode: 'TAG_DELETE_FORBIDDEN' });
        }

        const tagName = tag.name;
        await tag.destroy({ transaction: t });
        await t.commit();

        await logAction({
            action: 'TAG_DELETE',
            details: `Tag deleted: "${tagName}" (id: ${req.params.id})`,
            req,
        });

        res.json({ message: 'Etiket başarıyla silindi.' });
    } catch (error) {
        await t.rollback();
        logger.error('Tag delete error:', error);
        res.status(500).json({ errorCode: 'TAG_DELETE_FAILED' });
    }
});

module.exports = router;
