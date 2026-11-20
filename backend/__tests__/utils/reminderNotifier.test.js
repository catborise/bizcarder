jest.mock('../../utils/mailer', () => ({
    sendReminderEmail: jest.fn().mockResolvedValue(),
}));

const sequelize = require('../../config/database');
const { sendReminderEmail } = require('../../utils/mailer');
const { checkAndSendReminders, startReminderNotifier, stopReminderNotifier } = require('../../utils/reminderNotifier');
const { createTestUser, createTestCard } = require('../helpers');

const P = 'remnot';

describe('Reminder Notifier Utility', () => {
    let ownerWithEmail;

    beforeAll(async () => {
        ownerWithEmail = await createTestUser({
            username: `${P}_owner`,
            email: `${P}_owner@test.com`,
            displayName: 'Reminder Owner',
        });
    });

    beforeEach(() => {
        sendReminderEmail.mockClear();
    });

    afterEach(() => {
        stopReminderNotifier();
        jest.restoreAllMocks();
    });

    test('skips querying and emailing when advisory lock is not acquired', async () => {
        jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2099-01-01T08:00:00.000Z');

        const origQuery = sequelize.query.bind(sequelize);
        jest.spyOn(sequelize, 'query').mockImplementation((sql, opts) => {
            if (typeof sql === 'string' && sql.includes('pg_try_advisory_xact_lock')) {
                return Promise.resolve([{ acquired: false }]);
            }
            return origQuery(sql, opts);
        });

        await checkAndSendReminders();

        expect(sendReminderEmail).not.toHaveBeenCalled();
    });

    test('sends emails only for active cards due today with owner email and skips duplicate run on same day', async () => {
        const todayMidday = new Date();
        todayMidday.setHours(12, 0, 0, 0);

        const tomorrow = new Date(todayMidday);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const yesterday = new Date(todayMidday);
        yesterday.setDate(yesterday.getDate() - 1);

        const dueCard = await createTestCard(ownerWithEmail.id, {
            firstName: `${P}_DueToday`,
            reminderDate: todayMidday,
            deletedAt: null,
        });
        await createTestCard(ownerWithEmail.id, {
            firstName: `${P}_DueTomorrow`,
            reminderDate: tomorrow,
            deletedAt: null,
        });
        await createTestCard(ownerWithEmail.id, {
            firstName: `${P}_DueYesterday`,
            reminderDate: yesterday,
            deletedAt: null,
        });
        await createTestCard(ownerWithEmail.id, {
            firstName: `${P}_DeletedToday`,
            reminderDate: todayMidday,
            deletedAt: new Date(),
        });
        await createTestCard(null, {
            firstName: `${P}_NoOwnerEmail`,
            reminderDate: todayMidday,
            deletedAt: null,
        });

        await checkAndSendReminders();

        const sentCardIds = sendReminderEmail.mock.calls.map(([, card]) => card.id);
        expect(sentCardIds).toContain(dueCard.id);
        expect(sentCardIds.filter((id) => id === dueCard.id)).toHaveLength(1);
        expect(sendReminderEmail.mock.calls.every(([owner]) => Boolean(owner?.email))).toBe(true);

        const countAfterFirstRun = sendReminderEmail.mock.calls.length;

        // Second call on the same day must be skipped by lastSentDate guard
        await checkAndSendReminders();
        expect(sendReminderEmail).toHaveBeenCalledTimes(countAfterFirstRun);
    });

    test('startReminderNotifier and stopReminderNotifier manage interval safely', () => {
        startReminderNotifier();
        expect(() => stopReminderNotifier()).not.toThrow();
        expect(() => stopReminderNotifier()).not.toThrow();
    });
});
