const express = require('express');
const router = express.Router();
const { Interaction, User, BusinessCard } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { logger, logAction } = require('../utils/logger');

// All interaction routes require authentication
router.use(requireAuth);

// Helper: verify target card exists and is accessible by current user
async function checkCardAccess(cardId, user) {
    const parsedId = parseInt(cardId, 10);
    if (isNaN(parsedId)) {
        return { errorStatus: 404, errorCode: 'CARD_NOT_FOUND' };
    }
    const card = await BusinessCard.findOne({ where: { id: parsedId, deletedAt: null } });
    if (!card) {
        return { errorStatus: 404, errorCode: 'CARD_NOT_FOUND' };
    }
    if (user.role !== 'admin' && card.ownerId !== user.id && card.visibility !== 'public') {
        return { errorStatus: 403, errorCode: 'FORBIDDEN' };
    }
    return { card };
}

// Bir karta ait etkileşimleri getir
router.get('/:cardId', async (req, res) => {
    try {
        const { cardId } = req.params;
        const access = await checkCardAccess(cardId, req.user);
        if (access.errorStatus) {
            return res.status(access.errorStatus).json({ errorCode: access.errorCode });
        }

        const interactions = await Interaction.findAll({
            where: { cardId: access.card.id },
            include: [{ model: User, as: 'author', attributes: ['displayName'] }],
            order: [
                ['isPinned', 'DESC'],
                ['date', 'DESC'],
            ],
        });
        res.json(interactions);
    } catch (error) {
        logger.error('Interactions list error:', error);
        res.status(500).json({ errorCode: 'INTERACTIONS_LOAD_FAILED' });
    }
});

// Yeni etkileşim ekle
router.post('/:cardId', async (req, res) => {
    try {
        const { cardId } = req.params;
        const access = await checkCardAccess(cardId, req.user);
        if (access.errorStatus) {
            return res.status(access.errorStatus).json({ errorCode: access.errorCode });
        }

        const { type, notes, date } = req.body || {};

        const interaction = await Interaction.create({
            cardId: access.card.id,
            type,
            notes,
            date: date || new Date(),
            authorId: req.user ? req.user.id : null,
        });

        // Nurturing: Kartın son etkileşim tarihini güncelle
        await BusinessCard.update({ lastInteractionDate: interaction.date }, { where: { id: access.card.id } });

        await logAction({
            action: 'INTERACTION_CREATE',
            details: `Etkileşim eklendi (Kart #${access.card.id}): ${type || 'Not'}`,
            req,
        });

        res.status(201).json(interaction);
    } catch (error) {
        logger.error('Interaction create error:', error);
        res.status(500).json({ errorCode: 'INTERACTION_ADD_FAILED' });
    }
});

// Etkileşim güncelle
router.put('/:id', async (req, res) => {
    try {
        const interaction = await Interaction.findByPk(req.params.id);
        if (!interaction) {
            return res.status(404).json({ errorCode: 'RECORD_NOT_FOUND' });
        }

        // Yetki kontrolü: Sadece admin veya kaydı oluşturan kişi
        if (req.user.role !== 'admin' && interaction.authorId !== req.user.id) {
            return res.status(403).json({ errorCode: 'EDIT_FORBIDDEN' });
        }

        const { type, notes, date } = req.body || {};
        await interaction.update({ type, notes, date: date || interaction.date });
        await logAction({
            action: 'INTERACTION_UPDATE',
            details: `Etkileşim güncellendi (#${interaction.id})`,
            req,
        });
        res.json(interaction);
    } catch (error) {
        logger.error('Interaction update error:', error);
        res.status(500).json({ errorCode: 'INTERACTION_UPDATE_FAILED' });
    }
});

// Etkileşim sil
router.delete('/:id', async (req, res) => {
    try {
        const interaction = await Interaction.findByPk(req.params.id);
        if (!interaction) {
            return res.status(404).json({ errorCode: 'RECORD_NOT_FOUND' });
        }

        if (req.user.role !== 'admin' && interaction.authorId !== req.user.id) {
            return res.status(403).json({ errorCode: 'DELETE_FORBIDDEN' });
        }

        await interaction.destroy();
        await logAction({
            action: 'INTERACTION_DELETE',
            details: `Etkileşim silindi (#${req.params.id})`,
            req,
        });
        res.json({ message: 'Kayıt silindi.' });
    } catch (error) {
        logger.error('Interaction delete error:', error);
        res.status(500).json({ errorCode: 'INTERACTION_DELETE_FAILED' });
    }
});

// Etkileşim sabitleme/kaldırma
router.put('/:id/pin', async (req, res) => {
    try {
        const interaction = await Interaction.findByPk(req.params.id);
        if (!interaction) {
            return res.status(404).json({ errorCode: 'RECORD_NOT_FOUND' });
        }

        // Yetki kontrolü: Sadece admin veya kaydı oluşturan kişi
        if (req.user.role !== 'admin' && interaction.authorId !== req.user.id) {
            return res.status(403).json({ errorCode: 'PIN_FORBIDDEN' });
        }

        await interaction.update({ isPinned: !interaction.isPinned });
        res.json(interaction);
    } catch (error) {
        logger.error('Interaction pin toggle error:', error);
        res.status(500).json({ errorCode: 'INTERACTION_PIN_FAILED' });
    }
});

module.exports = router;
