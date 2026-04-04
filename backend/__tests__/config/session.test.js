const supertest = require('supertest');
const app = require('../../server');
const { createTestAdmin } = require('../helpers');

const P = 'sess'; // unique prefix for this suite

describe('Session Configuration (connect-session-sequelize)', () => {
    // These tests verify that session handling works correctly end-to-end.
    // They will break if connect-session-sequelize 8 changes the store API
    // or session serialization behavior.

    test('session store is configured and login creates a session', async () => {
        const admin = await createTestAdmin({ username: `${P}_store`, email: `${P}_store@test.com` });
        const agent = supertest.agent(app);

        const loginRes = await agent
            .post('/auth/local/login')
            .send({ username: `${P}_store`, password: 'Test1234!' });

        expect(loginRes.status).toBe(200);

        // The response should set a session cookie
        const cookies = loginRes.headers['set-cookie'];
        expect(cookies).toBeDefined();
        const sessionCookie = cookies.find(c => c.includes('bizcarder.sid'));
        expect(sessionCookie).toBeDefined();
    });

    test('session cookie has httpOnly flag', async () => {
        const admin = await createTestAdmin({ username: `${P}_httponly`, email: `${P}_httponly@test.com` });
        const agent = supertest.agent(app);

        const loginRes = await agent
            .post('/auth/local/login')
            .send({ username: `${P}_httponly`, password: 'Test1234!' });

        const cookies = loginRes.headers['set-cookie'];
        const sessionCookie = cookies.find(c => c.includes('bizcarder.sid'));
        expect(sessionCookie).toBeDefined();
        expect(sessionCookie.toLowerCase()).toContain('httponly');
    });

    test('session cookie has correct name (bizcarder.sid)', async () => {
        const admin = await createTestAdmin({ username: `${P}_name`, email: `${P}_name@test.com` });
        const agent = supertest.agent(app);

        const loginRes = await agent
            .post('/auth/local/login')
            .send({ username: `${P}_name`, password: 'Test1234!' });

        const cookies = loginRes.headers['set-cookie'];
        const sessionCookie = cookies.find(c => c.includes('bizcarder.sid'));
        expect(sessionCookie).toBeDefined();
    });

    test('session cookie has path=/', async () => {
        const admin = await createTestAdmin({ username: `${P}_path`, email: `${P}_path@test.com` });
        const agent = supertest.agent(app);

        const loginRes = await agent
            .post('/auth/local/login')
            .send({ username: `${P}_path`, password: 'Test1234!' });

        const cookies = loginRes.headers['set-cookie'];
        const sessionCookie = cookies.find(c => c.includes('bizcarder.sid'));
        expect(sessionCookie).toBeDefined();
        expect(sessionCookie.toLowerCase()).toContain('path=/');
    });

    test('session data is persisted in database (survives agent reuse)', async () => {
        const admin = await createTestAdmin({ username: `${P}_persist`, email: `${P}_persist@test.com` });
        const agent = supertest.agent(app);

        // Login — creates session in PostgreSQL via SequelizeStore
        await agent
            .post('/auth/local/login')
            .send({ username: `${P}_persist`, password: 'Test1234!' })
            .expect(200);

        // Verify session is alive by hitting an authenticated endpoint
        const res1 = await agent.get('/auth/me');
        expect(res1.status).toBe(200);
        expect(res1.body.isAuthenticated).toBe(true);

        // Make another request — session should still be valid
        const res2 = await agent.get('/auth/me');
        expect(res2.status).toBe(200);
        expect(res2.body.user.username).toBe(`${P}_persist`);
    });

    test('logout invalidates the session', async () => {
        const admin = await createTestAdmin({ username: `${P}_logout`, email: `${P}_logout@test.com` });
        const agent = supertest.agent(app);

        await agent
            .post('/auth/local/login')
            .send({ username: `${P}_logout`, password: 'Test1234!' })
            .expect(200);

        // Session is active
        const res1 = await agent.get('/auth/me');
        expect(res1.status).toBe(200);

        // Logout
        await agent.post('/auth/logout').expect(200);

        // Session should be invalidated
        const res2 = await agent.get('/auth/me');
        expect(res2.status).toBe(401);
    });
});
