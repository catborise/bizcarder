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

// Yeni Etiket Oluştur
router.post('/', async (req, res) => {
    try {
        const { name, color } = req.body;
        const tag = await Tag.create({
            name,
            color,
            ownerId: req.user.id
        });
        res.json(tag);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
