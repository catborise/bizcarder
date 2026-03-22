const express = require('express');
const router = express.Router();
const { Tag, BusinessCard, sequelize } = require('../models');

// Tüm Etiketleri Getir
router.get('/', async (req, res) => {
    try {
        const tags = await Tag.findAll({
            order: [['name', 'ASC']]
        });
        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Etiket İstatistiklerini Getir (En çok kullanılanlar)
router.get('/stats', async (req, res) => {
    try {
        // BusinessCardTags tablosu üzerinden sayıları al
        const stats = await Tag.findAll({
            attributes: [
                'id', 
                'name', 
                'color',
                [sequelize.fn('COUNT', sequelize.col('cards.id')), 'cardCount']
            ],
            include: [{
                model: BusinessCard,
                as: 'cards',
                attributes: [],
                through: { attributes: [] },
                where: { deletedAt: null },
                required: false
            }],
            group: ['Tag.id'],
            order: [[sequelize.literal('"cardCount"'), 'DESC']],
            limit: 10
        });
        res.json(stats);
    } catch (error) {
        console.error('Tag stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Yeni Etiket Oluştur
router.post('/', async (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Etiket ismi zorunludur.' });
        }

        const newTag = await Tag.create({
            name,
            color: color || '#3b82f6',
            ownerId: req.user.id
        });
        res.status(201).json(newTag);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Etiket Güncelle
router.put('/:id', async (req, res) => {
    try {
        const { name, color } = req.body;
        const tag = await Tag.findByPk(req.params.id);

        if (!tag) {
            return res.status(404).json({ error: 'Etiket bulunamadı.' });
        }

        // Sadece admin veya sahibinin düzenlemesine izin ver (ownerId null ise sistem etiketidir, admin düzenleyebilir)
        if (req.user.role !== 'admin' && tag.ownerId && tag.ownerId !== req.user.id) {
            return res.status(403).json({ error: 'Bu etiketi düzenleme yetkiniz yok.' });
        }

        await tag.update({ name, color });
        res.json(tag);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Etiket Sil
router.delete('/:id', async (req, res) => {
    try {
        const tag = await Tag.findByPk(req.params.id);

        if (!tag) {
            return res.status(404).json({ error: 'Etiket bulunamadı.' });
        }

        if (req.user.role !== 'admin' && tag.ownerId && tag.ownerId !== req.user.id) {
            return res.status(403).json({ error: 'Bu etiketi silme yetkiniz yok.' });
        }

        await tag.destroy();
        res.json({ message: 'Etiket başarıyla silindi.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
