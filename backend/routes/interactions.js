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

module.exports = router;
