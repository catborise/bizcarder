const { BusinessCard, AgendaEntry, User } = require('../models');
const { Op } = require('sequelize');
const { sendReminderEmail } = require('./mailer');
const sequelize = require('../config/database');

const REMINDER_LOCK_ID = 294714; // Different from trash cleanup lock
const BATCH_SIZE = 100;

let intervalTimer = null;
let lastSentDate = null;
let isAgendaRunning = false;

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

function isSmtpConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function claimDueAgendaEntriesInTransaction(t, claimedAgendaEntries) {
    if (!AgendaEntry || typeof AgendaEntry.findAll !== 'function') return;

    const now = new Date();
    const lookback24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const agendaBatch = await AgendaEntry.findAll({
        where: {
            reminderAt: { [Op.gte]: lookback24h, [Op.lte]: now },
            reminderSent: false,
            status: 'open',
            deletedAt: null,
        },
        include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'displayName'] }],
        order: [['id', 'ASC']],
        limit: BATCH_SIZE,
        transaction: t,
    });

    for (const entry of agendaBatch) {
        const claimedReminderAt = entry.reminderAt;
        entry.reminderSent = true;
        await entry.save({ transaction: t });
        if (entry.owner?.email) {
            claimedAgendaEntries.push({ entry, claimedReminderAt });
        }
    }
}

async function sendClaimedAgendaEmails(claimedAgendaEntries) {
    let sentCount = 0;
    for (const { entry, claimedReminderAt } of claimedAgendaEntries) {
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
                sentCount++;
            } else if (isSmtpConfigured()) {
                // Revert claim only if SMTP was configured (transient failure) AND user did not snooze/change reminderAt
                await AgendaEntry.update(
                    { reminderSent: false },
                    {
                        where: {
                            id: entry.id,
                            reminderAt: claimedReminderAt,
                        },
                    },
                );
            }
        }
    }
    return sentCount;
}

async function checkAndSendAgendaReminders() {
    if (isAgendaRunning) return;
    isAgendaRunning = true;
    try {
        const claimedAgendaEntries = [];
        await sequelize.transaction(async (t) => {
            const [lockResult] = await sequelize.query('SELECT pg_try_advisory_xact_lock(:lockId) AS acquired', {
                replacements: { lockId: REMINDER_LOCK_ID },
                type: sequelize.QueryTypes.SELECT,
                transaction: t,
            });
            if (!lockResult?.acquired) return;

            await claimDueAgendaEntriesInTransaction(t, claimedAgendaEntries);
        });

        const sentCount = await sendClaimedAgendaEmails(claimedAgendaEntries);
        if (sentCount > 0) {
            console.log(`[REMINDERS] Sent ${sentCount} agenda reminder emails.`);
        }
    } catch (error) {
        console.error('[REMINDERS] Agenda reminder error:', error.message);
    } finally {
        isAgendaRunning = false;
    }
}

async function checkAndSendReminders() {
    const todayKey = getTodayKey();
    if (lastSentDate === todayKey) {
        return;
    }

    try {
        const dueCards = [];
        const claimedAgendaEntries = [];

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

            await claimDueAgendaEntriesInTransaction(t, claimedAgendaEntries);
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

        sentCount += await sendClaimedAgendaEmails(claimedAgendaEntries);

        lastSentDate = todayKey;

        if (sentCount > 0) {
            console.log(`[REMINDERS] Sent ${sentCount} reminder emails.`);
        }
    } catch (error) {
        console.error('[REMINDERS] Error:', error.message);
    }
}

function startReminderNotifier() {
    // Check every minute: always process exact-time agenda reminders, and run daily card reminders at 08:00
    intervalTimer = setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 8) {
            await checkAndSendReminders();
        }
        await checkAndSendAgendaReminders();
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
