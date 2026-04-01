const supertest = require('supertest');
const app = require('../../server');
const { cleanDatabase, createTestUser, createTestAdmin, createTestCard, getAuthAgent } = require('../helpers');

describe('Users Routes', () => {
    let admin, adminAgent;

    beforeEach(async () => {
        await cleanDatabase();
        admin = await createTestAdmin();
        adminAgent = await getAuthAgent(admin);
    });

    // ─── GET /api/users ────────────────────────────────────────────────────────

    describe('GET /api/users', () => {
        test('admin gets the full user list', async () => {
            const res = await adminAgent.get('/api/users');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        test('user list entries include expected fields', async () => {
            const res = await adminAgent.get('/api/users');
            expect(res.status).toBe(200);
            const first = res.body[0];
            expect(first).toHaveProperty('id');
            expect(first).toHaveProperty('username');
            expect(first).toHaveProperty('email');
            expect(first).toHaveProperty('role');
            expect(first).toHaveProperty('isApproved');
        });

        test('non-admin gets 403', async () => {
            const user = await createTestUser({ username: 'regular', email: 'reg@test.com' });
            const userAgent = await getAuthAgent(user);
            const res = await userAgent.get('/api/users');
            expect(res.status).toBe(403);
        });

        test('unauthenticated gets 401', async () => {
            const res = await supertest(app).get('/api/users');
            expect(res.status).toBe(401);
        });
    });

    // ─── PUT /api/users/:id/role ───────────────────────────────────────────────

    describe('PUT /api/users/:id/role', () => {
        test('admin promotes user to admin role', async () => {
            const user = await createTestUser({ username: 'roletest', email: 'role@test.com' });
            const res = await adminAgent
                .put(`/api/users/${user.id}/role`)
                .send({ role: 'admin' });
            expect(res.status).toBe(200);
            expect(res.body.message).toBeDefined();
        });

        test('admin demotes admin back to user role', async () => {
            const user = await createTestUser({ username: 'demote', email: 'demote@test.com', role: 'admin' });
            const res = await adminAgent
                .put(`/api/users/${user.id}/role`)
                .send({ role: 'user' });
            expect(res.status).toBe(200);
        });

        test('rejects invalid role value', async () => {
            const user = await createTestUser({ username: 'badrole', email: 'bad@test.com' });
            const res = await adminAgent
                .put(`/api/users/${user.id}/role`)
                .send({ role: 'superuser' });
            expect(res.status).toBe(400);
        });

        test('returns 404 for non-existent user', async () => {
            const res = await adminAgent
                .put('/api/users/999999/role')
                .send({ role: 'user' });
            expect(res.status).toBe(404);
        });

        test('non-admin gets 403', async () => {
            const user = await createTestUser({ username: 'nonadmin', email: 'na@test.com' });
            const userAgent = await getAuthAgent(user);
            const res = await userAgent
                .put(`/api/users/${user.id}/role`)
                .send({ role: 'admin' });
            expect(res.status).toBe(403);
        });
    });

    // ─── PUT /api/users/:id/approve ───────────────────────────────────────────

    describe('PUT /api/users/:id/approve', () => {
        test('admin approves a pending user', async () => {
            const user = await createTestUser({ username: 'pending', email: 'pend@test.com', isApproved: false });
            const res = await adminAgent
                .put(`/api/users/${user.id}/approve`)
                .send({ isApproved: true });
            expect(res.status).toBe(200);
            expect(res.body.user.isApproved).toBe(true);
        });

        test('admin revokes approval', async () => {
            const user = await createTestUser({ username: 'revoke', email: 'revoke@test.com', isApproved: true });
            const res = await adminAgent
                .put(`/api/users/${user.id}/approve`)
                .send({ isApproved: false });
            expect(res.status).toBe(200);
            expect(res.body.user.isApproved).toBe(false);
        });

        test('rejects non-boolean isApproved value', async () => {
            const user = await createTestUser({ username: 'badapprove', email: 'bap@test.com' });
            const res = await adminAgent
                .put(`/api/users/${user.id}/approve`)
                .send({ isApproved: 'yes' });
            expect(res.status).toBe(400);
        });

        test('returns 404 for non-existent user', async () => {
            const res = await adminAgent
                .put('/api/users/999999/approve')
                .send({ isApproved: true });
            expect(res.status).toBe(404);
        });
    });

    // ─── PUT /api/users/:id/password ──────────────────────────────────────────

    describe('PUT /api/users/:id/password', () => {
        test('admin resets a users password', async () => {
            const user = await createTestUser({ username: 'pwreset', email: 'pwr@test.com' });
            const res = await adminAgent
                .put(`/api/users/${user.id}/password`)
                .send({ newPassword: 'NewSecurePass123!' });
            expect(res.status).toBe(200);
        });

        test('rejects missing newPassword', async () => {
            const user = await createTestUser({ username: 'nopw', email: 'nopw@test.com' });
            const res = await adminAgent
                .put(`/api/users/${user.id}/password`)
                .send({});
            expect(res.status).toBe(400);
        });

        test('returns 404 for non-existent user', async () => {
            const res = await adminAgent
                .put('/api/users/999999/password')
                .send({ newPassword: 'NewSecurePass123!' });
            expect(res.status).toBe(404);
        });

        test('non-admin gets 403', async () => {
            const user = await createTestUser({ username: 'notadmin', email: 'notadmin@test.com' });
            const userAgent = await getAuthAgent(user);
            const res = await userAgent
                .put(`/api/users/${user.id}/password`)
                .send({ newPassword: 'NewPass456!' });
            expect(res.status).toBe(403);
        });
    });

    // ─── DELETE /api/users/:id ────────────────────────────────────────────────

    describe('DELETE /api/users/:id', () => {
        test('admin deletes a user and transfers cards to self', async () => {
            const user = await createTestUser({ username: 'todelete', email: 'del@test.com' });
            await createTestCard(user.id);
            const res = await adminAgent
                .delete(`/api/users/${user.id}`)
                .send({ transferCards: true });
            expect(res.status).toBe(200);
        });

        test('admin deletes a user and soft-deletes their cards', async () => {
            const user = await createTestUser({ username: 'deletecards', email: 'dc@test.com' });
            await createTestCard(user.id);
            const res = await adminAgent
                .delete(`/api/users/${user.id}`)
                .send({ transferCards: false });
            expect(res.status).toBe(200);
        });

        test('blocks admin from deleting themselves', async () => {
            const res = await adminAgent
                .delete(`/api/users/${admin.id}`)
                .send({ transferCards: false });
            expect(res.status).toBe(400);
        });

        test('returns 404 for non-existent user', async () => {
            const res = await adminAgent
                .delete('/api/users/999999')
                .send({ transferCards: false });
            expect(res.status).toBe(404);
        });

        test('non-admin gets 403', async () => {
            const user = await createTestUser({ username: 'notadmin2', email: 'na2@test.com' });
            const userAgent = await getAuthAgent(user);
            const target = await createTestUser({ username: 'victim', email: 'victim@test.com' });
            const res = await userAgent
                .delete(`/api/users/${target.id}`)
                .send({ transferCards: false });
            expect(res.status).toBe(403);
        });
    });
});
