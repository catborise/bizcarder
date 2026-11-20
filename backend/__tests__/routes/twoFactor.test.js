const supertest = require('supertest');
const speakeasy = require('speakeasy');
const app = require('../../server');
const { User } = require('../../models');
const { createTestAdmin, createTestUser, getAuthAgent } = require('../helpers');

const P = 'twofa';

describe('Two-Factor Authentication Routes (/api/2fa)', () => {
    let admin, adminAgent;

    beforeAll(async () => {
        admin = await createTestAdmin({
            username: `${P}_admin`,
            email: `${P}_admin@test.com`,
        });
        adminAgent = await getAuthAgent(admin);
    });

    beforeEach(async () => {
        await User.update({ twoFactorEnabled: false, twoFactorSecret: null }, { where: { id: admin.id } });
        await admin.reload();
    });

    describe('POST /api/2fa/setup', () => {
        test('rejects unauthenticated requests with 401', async () => {
            const res = await supertest(app).post('/api/2fa/setup');
            expect(res.status).toBe(401);
        });

        test('generates QR code and base32 secret and stores encrypted secret', async () => {
            const res = await adminAgent.post('/api/2fa/setup');

            expect(res.status).toBe(200);
            expect(res.body.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
            expect(typeof res.body.secret).toBe('string');
            expect(res.body.secret.length).toBeGreaterThanOrEqual(16);

            const reloaded = await User.findByPk(admin.id);
            expect(reloaded.twoFactorEnabled).toBe(false);
            expect(reloaded.twoFactorSecret).toBeTruthy();
            expect(reloaded.twoFactorSecret).not.toBe(res.body.secret);
            expect(reloaded.twoFactorSecret.split(':')).toHaveLength(3);
        });

        test('returns 400 if 2FA is already enabled', async () => {
            await admin.update({ twoFactorEnabled: true });

            const res = await adminAgent.post('/api/2fa/setup');
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe('TWO_FACTOR_SETUP_FAILED');
        });
    });

    describe('POST /api/2fa/verify', () => {
        test('rejects unauthenticated requests with 401', async () => {
            const res = await supertest(app).post('/api/2fa/verify').send({ token: '123456' });
            expect(res.status).toBe(401);
        });

        test('returns 400 TOKEN_REQUIRED when token is missing', async () => {
            const res = await adminAgent.post('/api/2fa/verify').send({});
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe('TOKEN_REQUIRED');
        });

        test('returns 400 TWO_FACTOR_SETUP_FAILED when secret was never generated', async () => {
            const res = await adminAgent.post('/api/2fa/verify').send({ token: '123456' });
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe('TWO_FACTOR_SETUP_FAILED');
        });

        test('returns 400 INVALID_TOKEN for wrong TOTP code', async () => {
            await adminAgent.post('/api/2fa/setup').expect(200);

            const res = await adminAgent.post('/api/2fa/verify').send({ token: '000000' });
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe('INVALID_TOKEN');

            const reloaded = await User.findByPk(admin.id);
            expect(reloaded.twoFactorEnabled).toBe(false);
        });

        test('enables 2FA with valid TOTP token and enforces 2FA on local login', async () => {
            const setupRes = await adminAgent.post('/api/2fa/setup').expect(200);
            const validToken = speakeasy.totp({ secret: setupRes.body.secret, encoding: 'base32' });

            const verifyRes = await adminAgent.post('/api/2fa/verify').send({ token: validToken });
            expect(verifyRes.status).toBe(200);
            expect(verifyRes.body.messageCode).toBe('TWO_FACTOR_ENABLED');

            const reloaded = await User.findByPk(admin.id);
            expect(reloaded.twoFactorEnabled).toBe(true);

            // Fresh agent logging in without 2FA token gets 206 requires2FA and no authenticated session
            const freshAgent = supertest.agent(app);
            const partialLogin = await freshAgent
                .post('/auth/local/login')
                .send({ username: admin.username, password: 'Test1234!' });
            expect(partialLogin.status).toBe(206);
            expect(partialLogin.body.requires2FA).toBe(true);

            const unauthCheck = await freshAgent.get('/api/tags');
            expect(unauthCheck.status).toBe(401);

            // Wrong 2FA token is rejected with 401 and still no session
            const wrongTokenLogin = await freshAgent
                .post('/auth/local/login')
                .send({ username: admin.username, password: 'Test1234!', token: '000000' });
            expect(wrongTokenLogin.status).toBe(401);
            expect(wrongTokenLogin.body.errorCode).toBe('INVALID_2FA_TOKEN');

            // Valid 2FA token establishes session
            const freshToken = speakeasy.totp({ secret: setupRes.body.secret, encoding: 'base32' });
            const successLogin = await freshAgent
                .post('/auth/local/login')
                .send({ username: admin.username, password: 'Test1234!', token: freshToken });
            expect(successLogin.status).toBe(200);
            expect(successLogin.body.success).toBe(true);

            const authCheck = await freshAgent.get('/api/tags');
            expect(authCheck.status).toBe(200);
        });
    });

    describe('POST /api/2fa/disable', () => {
        test('rejects unauthenticated requests with 401', async () => {
            const res = await supertest(app).post('/api/2fa/disable').send({ token: '123456' });
            expect(res.status).toBe(401);
        });

        test('returns 400 TOKEN_REQUIRED when token is missing', async () => {
            const res = await adminAgent.post('/api/2fa/disable').send({});
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe('TOKEN_REQUIRED');
        });

        test('returns 400 when 2FA is not enabled', async () => {
            const res = await adminAgent.post('/api/2fa/disable').send({ token: '123456' });
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe('TWO_FACTOR_DISABLE_FAILED');
        });

        test('returns 400 when stored secret is corrupted/undecryptable', async () => {
            await admin.update({ twoFactorEnabled: true, twoFactorSecret: 'corrupted-secret' });

            const res = await adminAgent.post('/api/2fa/disable').send({ token: '123456' });
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe('TWO_FACTOR_DISABLE_FAILED');
        });

        test('returns 400 INVALID_TOKEN for wrong TOTP code', async () => {
            const setupRes = await adminAgent.post('/api/2fa/setup').expect(200);
            const validToken = speakeasy.totp({ secret: setupRes.body.secret, encoding: 'base32' });
            await adminAgent.post('/api/2fa/verify').send({ token: validToken }).expect(200);

            const res = await adminAgent.post('/api/2fa/disable').send({ token: '000000' });
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe('INVALID_TOKEN');
        });

        test('disables 2FA and clears secret with valid TOTP code', async () => {
            const regularUser = await createTestUser({
                username: `${P}_regular`,
                email: `${P}_regular@test.com`,
            });
            const userAgent = await getAuthAgent(regularUser);

            const setupRes = await userAgent.post('/api/2fa/setup').expect(200);
            const validToken = speakeasy.totp({ secret: setupRes.body.secret, encoding: 'base32' });
            await userAgent.post('/api/2fa/verify').send({ token: validToken }).expect(200);

            const disableRes = await userAgent.post('/api/2fa/disable').send({ token: validToken });
            expect(disableRes.status).toBe(200);
            expect(disableRes.body.messageCode).toBe('TWO_FACTOR_DISABLED');

            const reloaded = await User.findByPk(regularUser.id);
            expect(reloaded.twoFactorEnabled).toBe(false);
            expect(reloaded.twoFactorSecret).toBeNull();
        });
    });
});
