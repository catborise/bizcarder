const express = require('express');
const router = express.Router();
const { Interaction, User } = require('../models');

// Bir karta ait etkileşimleri getir
router.get('/:cardId', async (req, res) => {
    try {
        const { cardId } = req.params;
        const interactions = await Interaction.findAll({
            where: { cardId },
            include: [{ model: User, as: 'author', attributes: ['displayName'] }],
            order: [['date', 'DESC']]
        });
        res.json(interactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Yeni etkileşim ekle
router.post('/:cardId', async (req, res) => {
    try {
        const { cardId } = req.params;
        const { type, notes, date } = req.body;

        const interaction = await Interaction.create({
            cardId,
            type,
            notes,
            date: date || new Date(),
            authorId: req.user ? req.user.id : null
        });

        res.status(201).json(interaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Etkileşim güncelle
router.put('/:id', async (req, res) => {
    try {
        const interaction = await Interaction.findByPk(req.params.id);
        if (!interaction) {
            return res.status(404).json({ error: 'Kayıt bulunamadı.' });
        }

        // Yetki kontrolü: Sadece admin veya kaydı oluşturan kişi
        if (req.user.role !== 'admin' && interaction.authorId !== req.user.id) {
            return res.status(403).json({ error: 'Bu kaydı düzenleme yetkiniz yok.' });
        }

        const { type, notes, date } = req.body;
        await interaction.update({ type, notes, date: date || interaction.date });
        res.json(interaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Etkileşim sil
router.delete('/:id', async (req, res) => {
    try {
        const interaction = await Interaction.findByPk(req.params.id);
        if (!interaction) {
            return res.status(404).json({ error: 'Kayıt bulunamadı.' });
        }

        if (req.user.role !== 'admin' && interaction.authorId !== req.user.id) {
            return res.status(403).json({ error: 'Bu kaydı silme yetkiniz yok.' });
        }

        await interaction.destroy();
        res.json({ message: 'Kayıt silindi.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
