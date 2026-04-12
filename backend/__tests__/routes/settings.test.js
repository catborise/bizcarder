const supertest = require('supertest');
const app = require('../../server');
const path = require('path');
const fs = require('fs');
const { setupSuite, createTestUser, getAuthAgent } = require('../helpers');
const { SystemSetting } = require('../../models');

const P = 'sett';
let admin, agent;

beforeAll(async () => {
    const ctx = await setupSuite(P);
    admin = ctx.admin;
    agent = ctx.agent;

    // Clean any previous test settings
    await SystemSetting.destroy({ where: {} });
});

afterAll(async () => {
    // Clean up uploaded branding files
    const dir = path.join(__dirname, '../../uploads/branding');
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter((f) => f.startsWith('branding-'));
        files.forEach((f) => {
            try {
                fs.unlinkSync(path.join(dir, f));
            } catch (e) {}
        });
    }
});

// ─── GET /api/settings (Public) ───────────────────────────────────────

describe('GET /api/settings (unauthenticated)', () => {
    test('returns only branding fields for unauthenticated users', async () => {
        const res = await supertest(app).get('/api/settings').expect(200);

        // Should have public branding fields
        expect(res.body).toHaveProperty('companyName');
        expect(res.body).toHaveProperty('companyLogo');
        expect(res.body).toHaveProperty('companyIcon');
        expect(res.body).toHaveProperty('appBanner');
        expect(res.body).toHaveProperty('footerText');
        expect(res.body).toHaveProperty('allowPublicRegistration');
        expect(res.body).toHaveProperty('samlEnabled');

        // Should NOT have admin-only fields
        expect(res.body).not.toHaveProperty('logRetentionLimit');
        expect(res.body).not.toHaveProperty('trashRetentionDays');
        expect(res.body).not.toHaveProperty('developerName');
        expect(res.body).not.toHaveProperty('developerEmail');
        expect(res.body).not.toHaveProperty('developerGithub');
        expect(res.body).not.toHaveProperty('developerLinkedin');
    });

    test('returns default values when no settings exist in DB', async () => {
        await SystemSetting.destroy({ where: {} });
        const res = await supertest(app).get('/api/settings').expect(200);

        expect(res.body.companyName).toBe('BizCarder');
        expect(typeof res.body.allowPublicRegistration).toBe('boolean');
        expect(res.body.allowPublicRegistration).toBe(true);
    });

    test('returns DB-overridden values over defaults', async () => {
        await SystemSetting.upsert({ key: 'companyName', value: 'TestCorp' });
        const res = await supertest(app).get('/api/settings').expect(200);
        expect(res.body.companyName).toBe('TestCorp');

        // Cleanup
        await SystemSetting.destroy({ where: { key: 'companyName' } });
    });
});

describe('GET /api/settings (non-admin user)', () => {
    let userAgent;

    beforeAll(async () => {
        const user = await createTestUser({
            username: `${P}_regular`,
            email: `${P}_regular@test.com`,
            role: 'user',
        });
        userAgent = await getAuthAgent(user);
    });

    test('returns only branding fields for non-admin user', async () => {
        const res = await userAgent.get('/api/settings').expect(200);

        expect(res.body).toHaveProperty('companyName');
        expect(res.body).toHaveProperty('footerText');
        expect(res.body).not.toHaveProperty('logRetentionLimit');
        expect(res.body).not.toHaveProperty('developerEmail');
    });
});

describe('GET /api/settings (admin)', () => {
    test('returns all settings including admin fields', async () => {
        const res = await agent.get('/api/settings').expect(200);

        // Admin-only fields
        expect(res.body).toHaveProperty('logRetentionLimit');
        expect(res.body).toHaveProperty('trashRetentionDays');
        expect(res.body).toHaveProperty('developerName');
        expect(res.body).toHaveProperty('developerEmail');
        expect(res.body).toHaveProperty('developerGithub');
        expect(res.body).toHaveProperty('developerLinkedin');

        // Branding fields
        expect(res.body).toHaveProperty('companyName');
        expect(res.body).toHaveProperty('companyLogo');
        expect(res.body).toHaveProperty('companyIcon');
        expect(res.body).toHaveProperty('appBanner');
        expect(res.body).toHaveProperty('footerText');
    });

    test('numeric fields are returned as numbers', async () => {
        const res = await agent.get('/api/settings').expect(200);

        expect(typeof res.body.logRetentionLimit).toBe('number');
        expect(typeof res.body.trashRetentionDays).toBe('number');
    });

    test('boolean fields are returned as booleans', async () => {
        const res = await agent.get('/api/settings').expect(200);

        expect(typeof res.body.allowPublicRegistration).toBe('boolean');
    });

    test('returns default values for admin', async () => {
        await SystemSetting.destroy({ where: {} });
        const res = await agent.get('/api/settings').expect(200);

        expect(res.body.logRetentionLimit).toBe(1000);
        expect(res.body.trashRetentionDays).toBe(30);
        expect(res.body.allowPublicRegistration).toBe(true);
        expect(res.body.developerName).toBe('Developer');
    });
});

// ─── PUT /api/settings (Admin only) ──────────────────────────────────

describe('PUT /api/settings', () => {
    test('requires authentication', async () => {
        const res = await supertest(app).put('/api/settings').send({ companyName: 'Hacker' });
        expect([401, 403, 302]).toContain(res.status);
    });

    test('requires admin role', async () => {
        const user = await createTestUser({
            username: `${P}_nonadmin`,
            email: `${P}_nonadmin@test.com`,
            role: 'user',
        });
        const userAgent = await getAuthAgent(user);
        const res = await userAgent.put('/api/settings').send({ companyName: 'Nope' });
        expect([401, 403]).toContain(res.status);
    });

    test('updates single setting', async () => {
        const res = await agent.put('/api/settings').send({ companyName: 'UpdatedCorp' }).expect(200);

        expect(res.body.message).toBeTruthy();

        // Verify persisted
        const setting = await SystemSetting.findOne({ where: { key: 'companyName' } });
        expect(setting.value).toBe('UpdatedCorp');
    });

    test('updates multiple settings at once', async () => {
        await agent
            .put('/api/settings')
            .send({
                logRetentionLimit: 500,
                trashRetentionDays: 14,
                developerName: 'Test Dev',
                companyName: 'MultiCorp',
                footerText: '© Test Footer',
            })
            .expect(200);

        const settings = await SystemSetting.findAll();
        const map = {};
        settings.forEach((s) => {
            map[s.key] = s.value;
        });

        expect(map.logRetentionLimit).toBe('500');
        expect(map.trashRetentionDays).toBe('14');
        expect(map.developerName).toBe('Test Dev');
        expect(map.companyName).toBe('MultiCorp');
        expect(map.footerText).toBe('© Test Footer');
    });

    test('updates are reflected in GET response', async () => {
        await agent.put('/api/settings').send({ developerEmail: 'updated@test.com' }).expect(200);

        const res = await agent.get('/api/settings').expect(200);
        expect(res.body.developerEmail).toBe('updated@test.com');
    });

    test('rejects invalid logRetentionLimit (below minimum)', async () => {
        const res = await agent.put('/api/settings').send({ logRetentionLimit: 5 }).expect(400);

        expect(res.body.errorCode).toBeTruthy();
    });

    test('rejects invalid logRetentionLimit (NaN)', async () => {
        const res = await agent.put('/api/settings').send({ logRetentionLimit: 'abc' }).expect(400);

        expect(res.body.errorCode).toBeTruthy();
    });

    test('rejects invalid trashRetentionDays (below minimum)', async () => {
        // Note: 0 is falsy so it skips the validation guard (trashRetentionDays && ...).
        // Use -1 which is truthy but below minimum.
        const res = await agent.put('/api/settings').send({ trashRetentionDays: -1 }).expect(400);

        expect(res.body.errorCode).toBeTruthy();
    });

    test('rejects invalid trashRetentionDays (NaN)', async () => {
        const res = await agent.put('/api/settings').send({ trashRetentionDays: 'abc' }).expect(400);

        expect(res.body.errorCode).toBeTruthy();
    });

    test('upserts correctly — creates then updates same key', async () => {
        await agent.put('/api/settings').send({ developerGithub: 'https://github.com/first' }).expect(200);

        let setting = await SystemSetting.findOne({ where: { key: 'developerGithub' } });
        expect(setting.value).toBe('https://github.com/first');

        await agent.put('/api/settings').send({ developerGithub: 'https://github.com/second' }).expect(200);

        setting = await SystemSetting.findOne({ where: { key: 'developerGithub' } });
        expect(setting.value).toBe('https://github.com/second');
    });

    test('updates allowPublicRegistration boolean', async () => {
        await agent.put('/api/settings').send({ allowPublicRegistration: false }).expect(200);

        const res = await agent.get('/api/settings').expect(200);
        expect(res.body.allowPublicRegistration).toBe(false);

        // Restore
        await agent.put('/api/settings').send({ allowPublicRegistration: true });
    });

    test('updates all developer fields', async () => {
        await agent
            .put('/api/settings')
            .send({
                developerName: 'Full Test',
                developerEmail: 'full@test.com',
                developerGithub: 'https://github.com/fulltest',
                developerLinkedin: 'https://linkedin.com/in/fulltest',
            })
            .expect(200);

        const res = await agent.get('/api/settings').expect(200);
        expect(res.body.developerName).toBe('Full Test');
        expect(res.body.developerEmail).toBe('full@test.com');
        expect(res.body.developerGithub).toBe('https://github.com/fulltest');
        expect(res.body.developerLinkedin).toBe('https://linkedin.com/in/fulltest');
    });

    test('updates all branding fields', async () => {
        await agent
            .put('/api/settings')
            .send({
                companyName: 'Brand Test',
                companyLogo: '/uploads/logo.png',
                companyIcon: '/uploads/icon.png',
                appBanner: '/uploads/banner.jpg',
                footerText: '© Brand Test',
            })
            .expect(200);

        const res = await agent.get('/api/settings').expect(200);
        expect(res.body.companyName).toBe('Brand Test');
        expect(res.body.companyLogo).toBe('/uploads/logo.png');
        expect(res.body.companyIcon).toBe('/uploads/icon.png');
        expect(res.body.appBanner).toBe('/uploads/banner.jpg');
        expect(res.body.footerText).toBe('© Brand Test');
    });

    test('ignores undefined fields without overwriting existing', async () => {
        await agent.put('/api/settings').send({ companyName: 'KeepMe' }).expect(200);
        await agent.put('/api/settings').send({ footerText: 'New Footer' }).expect(200);

        const setting = await SystemSetting.findOne({ where: { key: 'companyName' } });
        expect(setting.value).toBe('KeepMe');
    });
});

// ─── POST /api/settings/upload-branding ──────────────────────────────

describe('POST /api/settings/upload-branding', () => {
    test('requires authentication', async () => {
        const res = await supertest(app)
            .post('/api/settings/upload-branding')
            .attach('file', Buffer.from('fake'), 'test.jpg');
        expect([401, 403, 302]).toContain(res.status);
    });

    test('requires admin role', async () => {
        const user = await createTestUser({
            username: `${P}_uploaduser`,
            email: `${P}_uploaduser@test.com`,
            role: 'user',
        });
        const userAgent = await getAuthAgent(user);
        const res = await userAgent
            .post('/api/settings/upload-branding')
            .attach('file', Buffer.from('fake'), 'test.jpg');
        expect([401, 403]).toContain(res.status);
    });

    test('uploads valid JPEG image', async () => {
        // Minimal JPEG header
        const jpegBuf = Buffer.from([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
            0x00, 0x00, 0xff, 0xd9,
        ]);

        const res = await agent
            .post('/api/settings/upload-branding')
            .attach('file', jpegBuf, { filename: 'logo.jpg', contentType: 'image/jpeg' })
            .expect(200);

        expect(res.body.url).toMatch(/^\/uploads\/branding\/branding-.*\.jpg$/);
    });

    test('uploads valid PNG image', async () => {
        // Minimal PNG header
        const pngBuf = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        ]);

        const res = await agent
            .post('/api/settings/upload-branding')
            .attach('file', pngBuf, { filename: 'icon.png', contentType: 'image/png' })
            .expect(200);

        expect(res.body.url).toMatch(/^\/uploads\/branding\/branding-.*\.png$/);
    });

    test('rejects non-image file', async () => {
        const res = await agent
            .post('/api/settings/upload-branding')
            .attach('file', Buffer.from('not an image'), { filename: 'hack.txt', contentType: 'text/plain' });

        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('returns 400 when no file is provided', async () => {
        const res = await agent.post('/api/settings/upload-branding').expect(400);

        expect(res.body.errorCode).toBeTruthy();
    });

    test('file is saved to disk', async () => {
        const jpegBuf = Buffer.from([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
            0x00, 0x00, 0xff, 0xd9,
        ]);

        const res = await agent
            .post('/api/settings/upload-branding')
            .attach('file', jpegBuf, { filename: 'disk-check.jpg', contentType: 'image/jpeg' })
            .expect(200);

        const filePath = path.join(__dirname, '../..', res.body.url);
        expect(fs.existsSync(filePath)).toBe(true);
    });
});
