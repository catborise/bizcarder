const express = require('express');
const router = express.Router();
const { Tag } = require('../models');

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
