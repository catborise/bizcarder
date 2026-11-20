const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { BusinessCard, User, BusinessCardTag } = require('../models');
const { logAction } = require('../utils/logger');
const { removeCardImages } = require('../utils/fileSecurity');
const { getAuthorizedTagIds } = require('../utils/cardHelpers');

exports.bulkDelete = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'BULK_IDS_REQUIRED' });
        }

        const whereClause = { id: { [Op.in]: ids } };
        if (req.user.role !== 'admin') {
            whereClause.ownerId = req.user.id;
        }

        const [updatedCount] = await BusinessCard.update(
            {
                deletedAt: new Date(),
                deletedBy: req.user.id,
            },
            { where: whereClause, transaction: t },
        );

        await logAction({
            action: 'CARD_BULK_DELETE',
            details: `${updatedCount} adet kart çöp kutusuna taşındı.`,
            req,
        });

        await t.commit();
        res.json({ messageCode: 'BULK_DELETE_SUCCESS', count: updatedCount });
    } catch (error) {
        await t.rollback();
        console.error('Bulk delete error:', error);
        res.status(500).json({ errorCode: 'BULK_DELETE_FAILED' });
    }
};

exports.bulkVisibility = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { ids, visibility } = req.body;
        if (!ids || !Array.isArray(ids) || !['public', 'private'].includes(visibility)) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'INVALID_PARAMS' });
        }

        const whereClause = { id: { [Op.in]: ids } };
        if (req.user.role !== 'admin') {
            whereClause.ownerId = req.user.id;
        }

        const [updatedCount] = await BusinessCard.update({ visibility }, { where: whereClause, transaction: t });

        await logAction({
            action: 'CARD_BULK_VISIBILITY',
            details: `${updatedCount} adet kartın görünürlüğü ${visibility} yapıldı.`,
            req,
        });

        await t.commit();
        res.json({ messageCode: 'BULK_UPDATE_SUCCESS', count: updatedCount });
    } catch (error) {
        await t.rollback();
        console.error('Bulk visibility error:', error);
        res.status(500).json({ errorCode: 'BULK_UPDATE_FAILED' });
    }
};

exports.bulkTags = async (req, res) => {
    const { ids, tagIds, mode = 'add' } = req.body || {};

    if (!ids || !Array.isArray(ids) || !tagIds || !Array.isArray(tagIds)) {
        return res.status(400).json({ errorCode: 'INVALID_PARAMS' });
    }

    const t = await sequelize.transaction();
    try {
        const whereClause = { id: { [Op.in]: ids }, deletedAt: null };
        if (req.user.role !== 'admin') {
            whereClause.ownerId = req.user.id;
        }

        const authorizedTagIds = await getAuthorizedTagIds(tagIds, req.user, t);
        const cards = await BusinessCard.findAll({
            where: whereClause,
            attributes: ['id'],
            transaction: t,
        });
        const cardIds = cards.map((c) => c.id);

        if (cardIds.length > 0) {
            if (mode !== 'add') {
                await BusinessCardTag.destroy({
                    where: { cardId: { [Op.in]: cardIds } },
                    transaction: t,
                });
            }

            if (authorizedTagIds.length > 0) {
                const rows = [];
                for (const cardId of cardIds) {
                    for (const tagId of authorizedTagIds) {
                        rows.push({ cardId, tagId });
                    }
                }
                await BusinessCardTag.bulkCreate(rows, {
                    ignoreDuplicates: true,
                    transaction: t,
                });
            }
        }

        await t.commit();

        await logAction({
            action: 'CARD_BULK_TAGS',
            details: `${cards.length} adet karta toplu etiket işlemi yapıldı.`,
            req,
        });

        res.json({ messageCode: 'BULK_TAG_SUCCESS', count: cards.length });
    } catch (error) {
        await t.rollback();
        console.error('Bulk tags error:', error);
        res.status(500).json({ errorCode: 'BULK_TAG_FAILED' });
    }
};

exports.getTrash = async (req, res) => {
    try {
        const whereClause = {
            deletedAt: { [Op.not]: null },
        };

        if (req.user && req.user.role !== 'admin') {
            whereClause[Op.or] = [{ deletedBy: req.user.id }, { visibility: 'public' }];
        }

        const cards = await BusinessCard.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'owner', attributes: ['displayName', 'email'] },
                { model: User, as: 'deleter', foreignKey: 'deletedBy', attributes: ['displayName', 'username'] },
            ],
            order: [['deletedAt', 'DESC']],
        });

        res.json(cards);
    } catch (error) {
        console.error('Trash list error:', error);
        res.status(500).json({ errorCode: 'TRASH_LIST_FAILED' });
    }
};

exports.restoreCard = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!card) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'CARD_NOT_FOUND' });
        }

        if (!card.deletedAt) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'CARD_RESTORE_NOT_DELETED' });
        }

        if (req.user.role !== 'admin' && card.deletedBy !== req.user.id) {
            await t.rollback();
            return res.status(403).json({ errorCode: 'CARD_RESTORE_FORBIDDEN' });
        }

        await card.update(
            {
                deletedAt: null,
                deletedBy: null,
            },
            { transaction: t, req },
        );

        await t.commit();

        await logAction({
            action: 'CARD_RESTORE',
            details: `Kart geri yüklendi: ${card.firstName} ${card.lastName}`,
            req,
        });

        res.json({ messageCode: 'CARD_RESTORED', card });
    } catch (error) {
        await t.rollback();
        console.error('Restore error:', error);
        res.status(500).json({ errorCode: 'CARD_RESTORE_FAILED' });
    }
};

exports.permanentDeleteCard = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!card) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'CARD_NOT_FOUND' });
        }

        if (req.user.role !== 'admin' && card.deletedBy !== req.user.id) {
            await t.rollback();
            return res.status(403).json({ errorCode: 'CARD_PERMANENT_DELETE_FORBIDDEN' });
        }

        const cardInfo = `${card.firstName} ${card.lastName}`;
        const imagesToRemove = {
            frontImageUrl: card.frontImageUrl,
            backImageUrl: card.backImageUrl,
            logoUrl: card.logoUrl,
        };
        await card.destroy({ transaction: t });

        await logAction({
            action: 'CARD_PERMANENT_DELETE',
            details: `Kart kalıcı olarak silindi: ${cardInfo}`,
            req,
        });

        await t.commit();
        removeCardImages(imagesToRemove);
        res.json({ messageCode: 'CARD_PERMANENT_DELETED' });
    } catch (error) {
        await t.rollback();
        console.error('Permanent delete error:', error);
        res.status(500).json({ errorCode: 'CARD_PERMANENT_DELETE_FAILED' });
    }
};

exports.emptyTrash = async (req, res) => {
    try {
        const whereClause = {
            deletedAt: { [Op.not]: null },
        };

        if (req.user.role !== 'admin') {
            whereClause.deletedBy = req.user.id;
        }

        const cardsToDelete = await BusinessCard.findAll({
            where: whereClause,
            attributes: ['frontImageUrl', 'backImageUrl', 'logoUrl'],
        });

        const deletedCount = await BusinessCard.destroy({
            where: whereClause,
        });

        removeCardImages(cardsToDelete);

        await logAction({
            action: 'TRASH_EMPTY',
            details: `Çöp kutusu boşaltıldı. ${deletedCount} kart kalıcı olarak silindi.`,
            req,
        });

        res.json({ messageCode: 'TRASH_EMPTIED', count: deletedCount });
    } catch (error) {
        console.error('Trash empty error:', error);
        res.status(500).json({ errorCode: 'TRASH_EMPTY_FAILED' });
    }
};
