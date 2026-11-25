const { BusinessCard, AgendaEntry, User } = require('../models');
const { Op } = require('sequelize');
const { sendReminderEmail } = require('./mailer');
const sequelize = require('../config/database');

const REMINDER_LOCK_ID = 294714; // Different from trash cleanup lock
const BATCH_SIZE = 100;

let intervalTimer = null;
let lastSentDate = null;
let isAgendaRunning = false;
const agendaRetryBackoffUntil = new Map();

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

async function queryDueAgendaCandidatesInTransaction(t, candidateIds) {
    if (!AgendaEntry || typeof AgendaEntry.findAll !== 'function') return;

    const now = new Date();
    const lookback7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const agendaBatch = await AgendaEntry.findAll({
        attributes: ['id'],
        where: {
            reminderAt: { [Op.gte]: lookback7d, [Op.lte]: now },
            reminderSent: false,
            status: 'open',
            deletedAt: null,
        },
        include: [
            {
                model: User,
                as: 'owner',
                attributes: ['id', 'email'],
                where: { email: { [Op.ne]: null } },
                required: true,
            },
        ],
        order: [
            ['reminderAt', 'ASC'],
            ['id', 'ASC'],
        ],
        limit: BATCH_SIZE,
        transaction: t,
    });

    const nowMs = Date.now();
    for (const row of agendaBatch) {
        const backoffUntil = agendaRetryBackoffUntil.get(row.id) || 0;
        if (backoffUntil <= nowMs) {
            candidateIds.push(row.id);
        }
    }
}

async function sendDueAgendaEmailsByIds(candidateIds) {
    if (!AgendaEntry || typeof AgendaEntry.findOne !== 'function') return 0;

    let sentCount = 0;
    for (const entryId of candidateIds) {
        const freshEntry = await AgendaEntry.findOne({
            where: {
                id: entryId,
                reminderSent: false,
                status: 'open',
                deletedAt: null,
                reminderAt: { [Op.lte]: new Date() },
            },
            include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'displayName'] }],
        });

        if (!freshEntry || !freshEntry.owner?.email) {
            continue;
        }

        const targetReminderAt = freshEntry.reminderAt;
        const safeNoteText = freshEntry.isPrivate
            ? '🔒 Özel ajanda hatırlatması (içeriği görüntülemek için ajandanızı açın).'
            : freshEntry.content;

        const mailResult = await sendReminderEmail(freshEntry.owner, {
            id: freshEntry.id,
            firstName: 'Ajanda',
            lastName: freshEntry.isPrivate ? '' : freshEntry.date,
            company: freshEntry.isPrivate ? '' : freshEntry.timeSlot || '',
            notes: safeNoteText,
        });

        if (mailResult !== null) {
            agendaRetryBackoffUntil.delete(freshEntry.id);
            await AgendaEntry.update(
                { reminderSent: true },
                {
                    where: {
                        id: freshEntry.id,
                        reminderAt: targetReminderAt,
                    },
                },
            );
            sentCount++;
        } else {
            // Back off for 10 minutes on failed/unconfigured SMTP without losing reminderSent=false
            agendaRetryBackoffUntil.set(freshEntry.id, Date.now() + 10 * 60 * 1000);
        }
    }
    return sentCount;
}

async function checkAndSendAgendaReminders() {
    if (isAgendaRunning) return;
    isAgendaRunning = true;
    try {
        const candidateIds = [];
        await sequelize.transaction(async (t) => {
            const [lockResult] = await sequelize.query('SELECT pg_try_advisory_xact_lock(:lockId) AS acquired', {
                replacements: { lockId: REMINDER_LOCK_ID },
                type: sequelize.QueryTypes.SELECT,
                transaction: t,
            });
            if (!lockResult?.acquired) return;

            await queryDueAgendaCandidatesInTransaction(t, candidateIds);
        });

        const sentCount = await sendDueAgendaEmailsByIds(candidateIds);
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
        const candidateIds = [];

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

            await queryDueAgendaCandidatesInTransaction(t, candidateIds);
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

        sentCount += await sendDueAgendaEmailsByIds(candidateIds);

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
