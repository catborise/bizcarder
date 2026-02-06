const express = require('express');
const router = express.Router();
const { DashboardTile } = require('../models');
const { requireAdmin } = require('../middleware/auth');

// Tüm tile'ları getir (Herkes görebilir)
router.get('/', async (req, res) => {
    try {
        const tiles = await DashboardTile.findAll({
            order: [['order', 'ASC']]
        });
        res.json(tiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Yeni tile ekle (Admin)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { title, subtitle, url, icon, backgroundColor, order, isInternal } = req.body;
        const tile = await DashboardTile.create({ title, subtitle, url, icon, backgroundColor, order, isInternal });
        res.status(201).json(tile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tile güncelle (Admin)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { title, subtitle, url, icon, backgroundColor, order, isInternal } = req.body;
        const tile = await DashboardTile.findByPk(req.params.id);
        if (!tile) return res.status(404).json({ message: 'Tile bulunamadı' });

        await tile.update({ title, subtitle, url, icon, backgroundColor, order, isInternal });
        res.json(tile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tile sil (Admin)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const tile = await DashboardTile.findByPk(req.params.id);
        if (!tile) return res.status(404).json({ message: 'Tile bulunamadı' });

        await tile.destroy();
        res.json({ message: 'Tile silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
