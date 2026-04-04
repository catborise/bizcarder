const supertest = require('supertest');
const app = require('../../server');
const { setupSuite, createTestUser, getAuthAgent } = require('../helpers');
const { AuditLog } = require('../../models');

const P = 'logs';
let admin, agent;

beforeAll(async () => {
    const ctx = await setupSuite(P);
    admin = ctx.admin;
    agent = ctx.agent;

    // Seed some audit logs
    await AuditLog.bulkCreate([
        { action: 'LOGIN', details: 'Admin login', userId: admin.id, ipAddress: '127.0.0.1' },
        { action: 'CARD_CREATE', details: 'Created card', userId: admin.id, ipAddress: '127.0.0.1' },
        { action: 'SETTINGS_UPDATE', details: 'Updated settings', userId: admin.id, ipAddress: '127.0.0.1' },
    ]);
});

// ─── GET /api/logs ───────────────────────────────────────────────────

describe('GET /api/logs', () => {
    test('admin sees all logs', async () => {
        const res = await agent.get('/api/logs').expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    test('logs include user association', async () => {
        const res = await agent.get('/api/logs').expect(200);

        const withUser = res.body.find(l => l.user);
        expect(withUser).toBeTruthy();
        expect(withUser.user).toHaveProperty('username');
        expect(withUser.user).toHaveProperty('displayName');
        expect(withUser.user).toHaveProperty('email');
    });

    test('logs are ordered by createdAt DESC', async () => {
        const res = await agent.get('/api/logs').expect(200);

        for (let i = 1; i < res.body.length; i++) {
            const prev = new Date(res.body[i - 1].createdAt).getTime();
            const curr = new Date(res.body[i].createdAt).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
        }
    });

    test('admin can filter by userId', async () => {
        const res = await agent.get(`/api/logs?userId=${admin.id}`).expect(200);

        res.body.forEach(log => {
            expect(log.userId).toBe(admin.id);
        });
    });

    test('non-admin user sees only own logs', async () => {
        const user = await createTestUser({
            username: `${P}_regular`,
            email: `${P}_regular@test.com`,
            role: 'user',
        });

        // Create a log for this user
        await AuditLog.create({ action: 'LOGIN', details: 'User login', userId: user.id, ipAddress: '127.0.0.1' });

        const userAgent = await getAuthAgent(user);
        const res = await userAgent.get('/api/logs').expect(200);

        // Should only see own logs
        res.body.forEach(log => {
            expect(log.userId).toBe(user.id);
        });
    });

    test('returns max 500 logs', async () => {
        const res = await agent.get('/api/logs').expect(200);
        expect(res.body.length).toBeLessThanOrEqual(500);
    });
});

// ─── GET /api/logs/rate-limits ───────────────────────────────────────

describe('GET /api/logs/rate-limits', () => {
    beforeAll(async () => {
        // Seed rate limit violations
        await AuditLog.bulkCreate([
            { action: 'RATE_LIMIT_EXCEEDED', details: 'IP: 192.168.1.1, Path: /api/auth/login', ipAddress: '192.168.1.1' },
            { action: 'RATE_LIMIT_EXCEEDED', details: 'IP: 192.168.1.1, Path: /api/auth/login', ipAddress: '192.168.1.1' },
            { action: 'RATE_LIMIT_EXCEEDED', details: 'IP: 10.0.0.5, Path: /api/cards', ipAddress: '10.0.0.5' },
        ]);
    });

    test('requires admin role', async () => {
        const user = await createTestUser({
            username: `${P}_nonadmin_rl`,
            email: `${P}_nonadmin_rl@test.com`,
            role: 'user',
        });
        const userAgent = await getAuthAgent(user);
        await userAgent.get('/api/logs/rate-limits').expect(403);
    });

    test('returns violations and summary for admin', async () => {
        const res = await agent.get('/api/logs/rate-limits').expect(200);

        expect(res.body).toHaveProperty('summary');
        expect(res.body).toHaveProperty('violations');
        expect(Array.isArray(res.body.violations)).toBe(true);
    });

    test('summary contains total count', async () => {
        const res = await agent.get('/api/logs/rate-limits').expect(200);

        expect(typeof res.body.summary.total).toBe('number');
        expect(res.body.summary.total).toBeGreaterThanOrEqual(3);
    });

    test('summary groups by IP', async () => {
        const res = await agent.get('/api/logs/rate-limits').expect(200);

        // Verify byIP is an object with at least one entry from our seeded data
        expect(typeof res.body.summary.byIP).toBe('object');
        const ipKeys = Object.keys(res.body.summary.byIP);
        expect(ipKeys.length).toBeGreaterThanOrEqual(1);
        // Each IP count should be a positive number
        ipKeys.forEach(ip => {
            expect(res.body.summary.byIP[ip]).toBeGreaterThanOrEqual(1);
        });
    });

    test('summary groups by path', async () => {
        const res = await agent.get('/api/logs/rate-limits').expect(200);

        expect(typeof res.body.summary.byPath).toBe('object');
        const pathKeys = Object.keys(res.body.summary.byPath);
        expect(pathKeys.length).toBeGreaterThanOrEqual(1);
        pathKeys.forEach(p => {
            expect(res.body.summary.byPath[p]).toBeGreaterThanOrEqual(1);
        });
    });

    test('violations are ordered by createdAt DESC', async () => {
        const res = await agent.get('/api/logs/rate-limits').expect(200);

        for (let i = 1; i < res.body.violations.length; i++) {
            const prev = new Date(res.body.violations[i - 1].createdAt).getTime();
            const curr = new Date(res.body.violations[i].createdAt).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
        }
    });

    test('accepts since query parameter', async () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString();
        const res = await agent.get(`/api/logs/rate-limits?since=${futureDate}`).expect(200);

        expect(res.body.summary.total).toBe(0);
        expect(res.body.violations).toHaveLength(0);
    });

    test('returns max 100 violations', async () => {
        const res = await agent.get('/api/logs/rate-limits').expect(200);
        expect(res.body.violations.length).toBeLessThanOrEqual(100);
    });

    test('unauthenticated request is rejected', async () => {
        const res = await supertest(app).get('/api/logs/rate-limits');
        expect([401, 403, 302]).toContain(res.status);
    });
});
