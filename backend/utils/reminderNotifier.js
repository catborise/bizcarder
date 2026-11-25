const { BusinessCard, AgendaEntry, User } = require('../models');
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

async function processAgendaRemindersInTransaction(t, dueAgendaEntries) {
    if (!AgendaEntry || typeof AgendaEntry.findAll !== 'function') return;

    const now = new Date();
    let offset = 0;
    while (true) {
        const agendaBatch = await AgendaEntry.findAll({
            where: {
                reminderAt: { [Op.lte]: now },
                reminderSent: false,
                status: 'open',
                deletedAt: null,
            },
            include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'displayName'] }],
            order: [['id', 'ASC']],
            limit: BATCH_SIZE,
            offset,
            transaction: t,
        });
        dueAgendaEntries.push(...agendaBatch);
        if (agendaBatch.length < BATCH_SIZE) break;
        offset += BATCH_SIZE;
    }
}

async function sendDueAgendaEmails(dueAgendaEntries) {
    let sentCount = 0;
    for (const entry of dueAgendaEntries) {
        if (entry.owner?.email) {
            const safeNoteText = entry.isPrivate
                ? '🔒 Özel ajanda hatırlatması (içeriği görüntülemek için ajandanızı açın).'
                : entry.content;
            const mailResult = await sendReminderEmail(entry.owner, {
                id: entry.id,
                firstName: 'Ajanda',
                lastName: entry.date,
                company: entry.timeSlot || '',
                notes: safeNoteText,
            });
            if (mailResult !== null) {
                entry.reminderSent = true;
                await entry.save();
                sentCount++;
            }
        }
    }
    return sentCount;
}

async function checkAndSendAgendaReminders() {
    try {
        const dueAgendaEntries = [];
        await sequelize.transaction(async (t) => {
            const [lockResult] = await sequelize.query('SELECT pg_try_advisory_xact_lock(:lockId) AS acquired', {
                replacements: { lockId: REMINDER_LOCK_ID },
                type: sequelize.QueryTypes.SELECT,
                transaction: t,
            });
            if (!lockResult?.acquired) return;

            await processAgendaRemindersInTransaction(t, dueAgendaEntries);
        });

        const sentCount = await sendDueAgendaEmails(dueAgendaEntries);
        if (sentCount > 0) {
            console.log(`[REMINDERS] Sent ${sentCount} agenda reminder emails.`);
        }
    } catch (error) {
        console.error('[REMINDERS] Agenda reminder error:', error.message);
    }
}

async function checkAndSendReminders() {
    const todayKey = getTodayKey();
    if (lastSentDate === todayKey) {
        return;
    }

    try {
        const dueCards = [];
        const dueAgendaEntries = [];

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

            await processAgendaRemindersInTransaction(t, dueAgendaEntries);
        });

        let sentCount = 0;
        for (const card of dueCards) {
            if (card.owner?.email) {
                const mailResult = await sendReminderEmail(card.owner, card);
                if (mailResult !== null) {
                    sentCount++;
                }
            }
        }

        sentCount += await sendDueAgendaEmails(dueAgendaEntries);

        lastSentDate = todayKey;

        if (sentCount > 0) {
            console.log(`[REMINDERS] Sent ${sentCount} reminder emails.`);
        }
    } catch (error) {
        console.error('[REMINDERS] Error:', error.message);
    }
}

function startReminderNotifier() {
    // Check every minute: process exact-time agenda reminders continuously, and daily card reminders at 08:00
    intervalTimer = setInterval(() => {
        const now = new Date();
        if (now.getHours() === 8) {
            checkAndSendReminders();
        } else {
            checkAndSendAgendaReminders();
        }
    }, 60 * 1000);
    if (intervalTimer.unref) intervalTimer.unref();
}

function stopReminderNotifier() {
    if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
    }
}

module.exports = {
    startReminderNotifier,
    stopReminderNotifier,
    checkAndSendReminders,
    checkAndSendAgendaReminders,
};
