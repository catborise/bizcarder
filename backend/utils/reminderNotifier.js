const { BusinessCard, User } = require('../models');
const { Op } = require('sequelize');
const { sendReminderEmail } = require('./mailer');
const sequelize = require('../config/database');

const REMINDER_LOCK_ID = 294714; // Different from trash cleanup lock

async function checkAndSendReminders() {
    try {
        // Advisory lock — only one instance
        const [lockResult] = await sequelize.query('SELECT pg_try_advisory_lock(:lockId) AS acquired', {
            replacements: { lockId: REMINDER_LOCK_ID },
            type: sequelize.QueryTypes.SELECT,
        });
        if (!lockResult.acquired) return;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const dueCards = await BusinessCard.findAll({
                where: {
                    reminderDate: { [Op.gte]: today, [Op.lt]: tomorrow },
                    deletedAt: null,
                },
                include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'displayName'] }],
                limit: 50,
            });

            for (const card of dueCards) {
                if (card.owner?.email) {
                    await sendReminderEmail(card.owner, card);
                }
            }

            if (dueCards.length > 0) {
                console.log(`[REMINDERS] Sent ${dueCards.length} reminder emails.`);
            }
        } finally {
            await sequelize.query('SELECT pg_advisory_unlock(:lockId)', {
                replacements: { lockId: REMINDER_LOCK_ID },
            });
        }
    } catch (error) {
        console.error('[REMINDERS] Error:', error.message);
    }
}

function startReminderNotifier() {
    // Check every hour, send at 8 AM
    setTimeout(() => checkAndSendReminders(), 60000);
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 8) {
            checkAndSendReminders();
        }
    }, 60 * 60 * 1000);
}

module.exports = { startReminderNotifier, checkAndSendReminders };
