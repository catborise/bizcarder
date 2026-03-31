const { BusinessCard } = require('../models');
const sequelize = require('../config/database');

// Advisory lock ID for trash cleanup (arbitrary unique integer)
const CLEANUP_LOCK_ID = 294713;

async function cleanupOldTrashItems() {
    try {
        const { Op } = require('sequelize');

        // Try to acquire advisory lock — only one instance wins
        const [lockResult] = await sequelize.query('SELECT pg_try_advisory_lock(:lockId) AS acquired', {
            replacements: { lockId: CLEANUP_LOCK_ID },
            type: sequelize.QueryTypes.SELECT,
        });

        if (!lockResult.acquired) {
            // Another instance is already running cleanup
            return;
        }

        try {
            const { SystemSetting } = require('../models');
            const setting = await SystemSetting.findByPk('trashRetentionDays');
            const retentionDays = setting ? parseInt(setting.value, 10) : 30;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const deletedCount = await BusinessCard.destroy({
                where: {
                    deletedAt: {
                        [Op.ne]: null,
                        [Op.lt]: cutoffDate
                    }
                },
                force: true
            });

            if (deletedCount > 0) {
                console.log(`[AUTO-CLEANUP] ${deletedCount} cards permanently deleted (retention: ${retentionDays} days).`);
            }
        } finally {
            // Always release the lock
            await sequelize.query('SELECT pg_advisory_unlock(:lockId)', {
                replacements: { lockId: CLEANUP_LOCK_ID },
            });
        }
    } catch (error) {
        console.error('[AUTO-CLEANUP] Error:', error.message);
    }
}

function startAutoCleanup() {
    // Delay first run by 30s to let DB connections settle
    setTimeout(() => cleanupOldTrashItems(), 30000);

    // Check every hour, run only at 2 AM
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 2) {
            cleanupOldTrashItems();
        }
    }, 60 * 60 * 1000);
}

module.exports = { startAutoCleanup, cleanupOldTrashItems };
