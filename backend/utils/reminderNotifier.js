const { BusinessCard, User } = require('../models');
const { Op } = require('sequelize');
const { sendReminderEmail } = require('./mailer');
const sequelize = require('../config/database');

const REMINDER_LOCK_ID = 294714; // Different from trash cleanup lock
const BATCH_SIZE = 100;

let intervalTimer = null;
let lastSentDate = null;

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

async function checkAndSendReminders() {
    const todayKey = getTodayKey();
    if (lastSentDate === todayKey) {
        return;
    }

    try {
        const dueCards = [];

        // Transaction-scoped advisory lock guarantees release on the exact same pooled connection
        await sequelize.transaction(async (t) => {
            const [lockResult] = await sequelize.query('SELECT pg_try_advisory_xact_lock(:lockId) AS acquired', {
                replacements: { lockId: REMINDER_LOCK_ID },
                type: sequelize.QueryTypes.SELECT,
                transaction: t,
            });
            if (!lockResult?.acquired) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            let offset = 0;
            while (true) {
                const batch = await BusinessCard.findAll({
                    where: {
                        reminderDate: { [Op.gte]: today, [Op.lt]: tomorrow },
                        deletedAt: null,
                    },
                    include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'displayName'] }],
                    order: [['id', 'ASC']],
                    limit: BATCH_SIZE,
                    offset,
                    transaction: t,
                });
                dueCards.push(...batch);
                if (batch.length < BATCH_SIZE) break;
                offset += BATCH_SIZE;
            }
        });

        let sentCount = 0;
        for (const card of dueCards) {
            if (card.owner?.email) {
                await sendReminderEmail(card.owner, card);
                sentCount++;
            }
        }

        lastSentDate = todayKey;

        if (sentCount > 0) {
            console.log(`[REMINDERS] Sent ${sentCount} reminder emails.`);
        }
    } catch (error) {
        console.error('[REMINDERS] Error:', error.message);
    }
}

function startReminderNotifier() {
    // Check every hour, send once per day at 8 AM (avoids duplicate blasts on server restart)
    intervalTimer = setInterval(
        () => {
            const now = new Date();
            if (now.getHours() === 8) {
                checkAndSendReminders();
            }
        },
        60 * 60 * 1000,
    );
    if (intervalTimer.unref) intervalTimer.unref();
}

function stopReminderNotifier() {
    if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
    }
}

module.exports = { startReminderNotifier, stopReminderNotifier, checkAndSendReminders };
