const supertest = require('supertest');
const app = require('../../server');
const { createTestUser, createTestAdmin, setupSuite, getAuthAgent } = require('../helpers');

const P = 'authmw'; // unique prefix for this suite

describe('Auth Middleware', () => {
    // ─── requireAuth ──────────────────────────────────────────────────────────

    describe('requireAuth', () => {
        test('blocks unauthenticated requests to protected API routes', async () => {
            const res = await supertest(app).get('/api/cards');
            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
        });

        test('allows authenticated requests', async () => {
            const user = await createTestUser({ username: `${P}_authuser`, email: `${P}_authuser@test.com` });
            const agent = await getAuthAgent(user);

            const res = await agent.get('/api/cards');
            expect(res.status).toBe(200);
        });
    });

    // ─── requireAdmin ─────────────────────────────────────────────────────────

    describe('requireAdmin', () => {
        test('blocks non-admin users from admin routes', async () => {
            const user = await createTestUser({ username: `${P}_nonadmin`, email: `${P}_nonadmin@test.com` });
            const agent = await getAuthAgent(user);

            // /api/users requires requireAuth + requireAdmin
            const res = await agent.get('/api/users');
            expect(res.status).toBe(403);
            expect(res.body.error).toBeDefined();
        });

        test('allows admin users to access admin routes', async () => {
            const admin = await createTestAdmin({ username: `${P}_isadmin`, email: `${P}_isadmin@test.com` });
            const agent = await getAuthAgent(admin);

            const res = await agent.get('/api/users');
            expect(res.status).toBe(200);
        });
    });

    // ─── Session persistence ──────────────────────────────────────────────────

    describe('session persistence', () => {
        test('session persists across multiple requests', async () => {
            const admin = await createTestAdmin({ username: `${P}_persist`, email: `${P}_persist@test.com` });
            const agent = supertest.agent(app);

            // Login
            await agent
                .post('/auth/local/login')
                .send({ username: `${P}_persist`, password: 'Test1234!' })
                .expect(200);

            // First authenticated request
            const res1 = await agent.get('/auth/me');
            expect(res1.status).toBe(200);
            expect(res1.body.isAuthenticated).toBe(true);
            expect(res1.body.user.username).toBe(`${P}_persist`);

            // Second authenticated request — session still active
            const res2 = await agent.get('/api/cards');
            expect(res2.status).toBe(200);

            // Third request — verify identity is maintained
            const res3 = await agent.get('/auth/me');
            expect(res3.status).toBe(200);
            expect(res3.body.user.username).toBe(`${P}_persist`);
        });

        test('session is destroyed after logout', async () => {
            const admin = await createTestAdmin({ username: `${P}_destroy`, email: `${P}_destroy@test.com` });
            const agent = supertest.agent(app);

            await agent
                .post('/auth/local/login')
                .send({ username: `${P}_destroy`, password: 'Test1234!' })
                .expect(200);

            await agent.post('/auth/logout').expect(200);

            const res = await agent.get('/auth/me');
            expect(res.status).toBe(401);
        });
    });
});
