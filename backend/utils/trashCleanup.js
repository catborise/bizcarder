const { Op } = require('sequelize');
const { BusinessCard, SystemSetting, User } = require('../models');
const sequelize = require('../config/database');
const { removeCardImages } = require('./fileSecurity');

// Advisory lock ID for trash cleanup (arbitrary unique integer)
const CLEANUP_LOCK_ID = 294713;

let initialTimer = null;
let intervalTimer = null;

async function cleanupOldTrashItems() {
    const deletedCardsForImageCleanup = [];
    try {
        // Use transaction-scoped advisory lock so it always unlocks on the same connection
        await sequelize.transaction(async (t) => {
            const [lockResult] = await sequelize.query('SELECT pg_try_advisory_xact_lock(:lockId) AS acquired', {
                replacements: { lockId: CLEANUP_LOCK_ID },
                type: sequelize.QueryTypes.SELECT,
                transaction: t,
            });

            if (!lockResult?.acquired) {
                return;
            }

            const setting = await SystemSetting.findByPk('trashRetentionDays', { transaction: t });
            const parsedGlobal = setting ? parseInt(setting.value, 10) : 30;
            const globalRetentionDays = Number.isFinite(parsedGlobal) && parsedGlobal >= 1 ? parsedGlobal : 30;

            const trashedCards = await BusinessCard.findAll({
                where: { deletedAt: { [Op.ne]: null } },
                attributes: ['id', 'deletedAt', 'deletedBy', 'frontImageUrl', 'backImageUrl', 'logoUrl'],
                transaction: t,
            });

            const deleterIds = [...new Set(trashedCards.map((c) => c.deletedBy).filter(Boolean))];
            const retentionByUserId = new Map();
            if (deleterIds.length > 0) {
                const users = await User.findAll({
                    where: { id: { [Op.in]: deleterIds } },
                    attributes: ['id', 'trashRetentionDays'],
                    transaction: t,
                });
                for (const u of users) {
                    if (Number.isFinite(u.trashRetentionDays) && u.trashRetentionDays >= 1) {
                        retentionByUserId.set(u.id, u.trashRetentionDays);
                    }
                }
            }

            const now = Date.now();
            const expiredIds = [];
            for (const card of trashedCards) {
                const retentionDays = retentionByUserId.get(card.deletedBy) ?? globalRetentionDays;
                const cutoffMs = now - retentionDays * 24 * 60 * 60 * 1000;
                if (new Date(card.deletedAt).getTime() < cutoffMs) {
                    expiredIds.push(card.id);
                    deletedCardsForImageCleanup.push({
                        frontImageUrl: card.frontImageUrl,
                        backImageUrl: card.backImageUrl,
                        logoUrl: card.logoUrl,
                    });
                }
            }

            if (expiredIds.length > 0) {
                const deletedCount = await BusinessCard.destroy({
                    where: { id: { [Op.in]: expiredIds } },
                    force: true,
                    transaction: t,
                });
                console.log(`[AUTO-CLEANUP] ${deletedCount} cards permanently deleted.`);
            }
        });

        if (deletedCardsForImageCleanup.length > 0) {
            removeCardImages(deletedCardsForImageCleanup);
        }
    } catch (error) {
        console.error('[AUTO-CLEANUP] Error:', error.message);
    }
}

function startAutoCleanup() {
    // Delay first run by 30s to let DB connections settle
    initialTimer = setTimeout(() => cleanupOldTrashItems(), 30000);
    if (initialTimer.unref) initialTimer.unref();

    // Check every hour, run only at 2 AM
    intervalTimer = setInterval(
        () => {
            const now = new Date();
            if (now.getHours() === 2) {
                cleanupOldTrashItems();
            }
        },
        60 * 60 * 1000,
    );
    if (intervalTimer.unref) intervalTimer.unref();
}

function stopAutoCleanup() {
    if (initialTimer) {
        clearTimeout(initialTimer);
        initialTimer = null;
    }
    if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
    }
}

module.exports = { startAutoCleanup, stopAutoCleanup, cleanupOldTrashItems };
