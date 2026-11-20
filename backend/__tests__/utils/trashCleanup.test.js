const fs = require('fs');
const path = require('path');
const sequelize = require('../../config/database');
const { BusinessCard, SystemSetting } = require('../../models');
const { cleanupOldTrashItems, startAutoCleanup, stopAutoCleanup } = require('../../utils/trashCleanup');
const { createTestUser, createTestCard } = require('../helpers');

const P = 'trashclean';
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

describe('Trash Cleanup Utility', () => {
    let defaultUser, customRetentionUser;
    const createdFiles = [];

    beforeAll(async () => {
        defaultUser = await createTestUser({
            username: `${P}_default`,
            email: `${P}_default@test.com`,
            trashRetentionDays: 30,
        });
        customRetentionUser = await createTestUser({
            username: `${P}_custom`,
            email: `${P}_custom@test.com`,
            trashRetentionDays: 5,
        });
        await SystemSetting.upsert({ key: 'trashRetentionDays', value: '30' });
    });

    afterEach(() => {
        stopAutoCleanup();
        jest.restoreAllMocks();
        while (createdFiles.length > 0) {
            const fp = createdFiles.pop();
            try {
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
            } catch (_) {}
        }
    });

    test('permanently deletes expired trashed cards, removes their images, and keeps recent/active cards', async () => {
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const imgName = `${P}-expired-front.png`;
        const imgPath = path.join(UPLOADS_DIR, imgName);
        fs.writeFileSync(imgPath, 'dummy');
        createdFiles.push(imgPath);

        const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

        const expiredGlobal = await createTestCard(defaultUser.id, {
            firstName: `${P}_ExpiredGlobal`,
            deletedAt: fortyDaysAgo,
            deletedBy: defaultUser.id,
            frontImageUrl: `/uploads/${imgName}`,
        });
        const keptGlobal = await createTestCard(defaultUser.id, {
            firstName: `${P}_KeptGlobal`,
            deletedAt: tenDaysAgo,
            deletedBy: defaultUser.id,
        });
        const expiredCustomUser = await createTestCard(customRetentionUser.id, {
            firstName: `${P}_ExpiredCustom`,
            deletedAt: tenDaysAgo,
            deletedBy: customRetentionUser.id,
        });
        const activeCard = await createTestCard(defaultUser.id, {
            firstName: `${P}_Active`,
            deletedAt: null,
        });

        await cleanupOldTrashItems();

        expect(await BusinessCard.findByPk(expiredGlobal.id)).toBeNull();
        expect(await BusinessCard.findByPk(expiredCustomUser.id)).toBeNull();
        expect(await BusinessCard.findByPk(keptGlobal.id)).not.toBeNull();
        expect(await BusinessCard.findByPk(activeCard.id)).not.toBeNull();
        expect(fs.existsSync(imgPath)).toBe(false);
    });

    test('skips cleanup when advisory lock is not acquired', async () => {
        const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
        const card = await createTestCard(defaultUser.id, {
            firstName: `${P}_LockedCard`,
            deletedAt: fortyDaysAgo,
            deletedBy: defaultUser.id,
        });

        const origQuery = sequelize.query.bind(sequelize);
        jest.spyOn(sequelize, 'query').mockImplementation((sql, opts) => {
            if (typeof sql === 'string' && sql.includes('pg_try_advisory_xact_lock')) {
                return Promise.resolve([{ acquired: false }]);
            }
            return origQuery(sql, opts);
        });

        await cleanupOldTrashItems();

        expect(await BusinessCard.findByPk(card.id)).not.toBeNull();
    });

    test('startAutoCleanup and stopAutoCleanup register and clear timers safely', () => {
        startAutoCleanup();
        expect(() => stopAutoCleanup()).not.toThrow();
        expect(() => stopAutoCleanup()).not.toThrow();
    });
});
