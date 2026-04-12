const supertest = require('supertest');
const app = require('../../server');
const { createTestUser, createTestAdmin } = require('../helpers');

const P = 'auth'; // unique prefix for this suite

describe('Auth Routes', () => {
    // No beforeAll cleanDatabase — suite is self-contained with unique usernames
    // No afterAll cleanDatabase — test DB is disposable

    // ============== POST /auth/local/login ==============
    describe('POST /auth/local/login', () => {
        test('admin login with valid credentials returns 200 and user object', async () => {
            await createTestAdmin({ username: `${P}_loginadmin`, email: `${P}_loginadmin@example.com` });
            const res = await supertest(app)
                .post('/auth/local/login')
                .send({ username: `${P}_loginadmin`, password: 'Test1234!' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.username).toBe(`${P}_loginadmin`);
            expect(res.body.user.role).toBe('admin');
        });

        test('non-admin user login returns 403', async () => {
            await createTestUser({ username: `${P}_loginuser`, email: `${P}_loginuser@example.com` }); // role: 'user'
            const res = await supertest(app)
                .post('/auth/local/login')
                .send({ username: `${P}_loginuser`, password: 'Test1234!' });
            expect(res.status).toBe(403);
            expect(res.body.errorCode).toBeDefined();
        });

        test('login with wrong password returns 401', async () => {
            await createTestAdmin({ username: `${P}_wrongpwadmin`, email: `${P}_wrongpwadmin@example.com` });
            const res = await supertest(app)
                .post('/auth/local/login')
                .send({ username: `${P}_wrongpwadmin`, password: 'WrongPass' });
            expect(res.status).toBe(401);
        });

        test('login with non-existent user returns 401', async () => {
            const res = await supertest(app)
                .post('/auth/local/login')
                .send({ username: `${P}_nonexistent`, password: 'Test1234!' });
            expect(res.status).toBe(401);
        });

        test('unapproved admin login returns 403', async () => {
            await createTestAdmin({
                username: `${P}_unapprovedadmin`,
                email: `${P}_unapprovedadmin@example.com`,
                isApproved: false,
            });
            const res = await supertest(app)
                .post('/auth/local/login')
                .send({ username: `${P}_unapprovedadmin`, password: 'Test1234!' });
            expect(res.status).toBe(403);
            expect(res.body.errorCode).toBeDefined();
        });
    });

    // ============== POST /auth/local/register ==============
    describe('POST /auth/local/register', () => {
        test('register with valid data returns 201 and pendingApproval flag', async () => {
            const res = await supertest(app)
                .post('/auth/local/register')
                .send({
                    username: `${P}_newuser`,
                    email: `${P}_new@test.com`,
                    password: 'NewPass123!',
                    displayName: 'New User',
                });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.pendingApproval).toBe(true);
        });

        test('register with duplicate username returns 400', async () => {
            await createTestUser({ username: `${P}_dupeuser`, email: `${P}_dupeuser@example.com` });
            const res = await supertest(app)
                .post('/auth/local/register')
                .send({
                    username: `${P}_dupeuser`,
                    email: `${P}_other@test.com`,
                    password: 'NewPass123!',
                    displayName: 'Dup',
                });
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBeDefined();
        });

        test('register with duplicate email returns 400', async () => {
            await createTestUser({ username: `${P}_dupeemail`, email: `${P}_dupeemail@example.com` });
            const res = await supertest(app)
                .post('/auth/local/register')
                .send({
                    username: `${P}_differentuser`,
                    email: `${P}_dupeemail@example.com`,
                    password: 'NewPass123!',
                });
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBeDefined();
        });

        test('register with missing password returns 400 (validation)', async () => {
            const res = await supertest(app)
                .post('/auth/local/register')
                .send({ username: `${P}_incomplete`, email: `${P}_inc@test.com` });
            expect(res.status).toBe(400);
        });

        test('register with username shorter than 3 chars returns 400', async () => {
            const res = await supertest(app)
                .post('/auth/local/register')
                .send({ username: 'ab', email: `${P}_short@test.com`, password: 'NewPass123!' });
            expect(res.status).toBe(400);
        });

        test('register with invalid email returns 400', async () => {
            const res = await supertest(app)
                .post('/auth/local/register')
                .send({ username: `${P}_validuser`, email: 'not-an-email', password: 'NewPass123!' });
            expect(res.status).toBe(400);
        });
    });

    // ============== GET /auth/me ==============
    describe('GET /auth/me', () => {
        test('authenticated admin gets profile with isAuthenticated: true', async () => {
            await createTestAdmin({ username: `${P}_meadmin`, email: `${P}_meadmin@example.com` });
            const agent = supertest.agent(app);
            await agent
                .post('/auth/local/login')
                .send({ username: `${P}_meadmin`, password: 'Test1234!' })
                .expect(200);
            const res = await agent.get('/auth/me');
            expect(res.status).toBe(200);
            expect(res.body.isAuthenticated).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.username).toBe(`${P}_meadmin`);
            expect(res.body.user.role).toBe('admin');
        });

        test('unauthenticated request returns 401 with isAuthenticated: false', async () => {
            const res = await supertest(app).get('/auth/me');
            expect(res.status).toBe(401);
            expect(res.body.isAuthenticated).toBe(false);
        });
    });

    // ============== POST /auth/logout ==============
    describe('POST /auth/logout', () => {
        test('authenticated admin can logout and receives success', async () => {
            await createTestAdmin({ username: `${P}_logoutadmin`, email: `${P}_logoutadmin@example.com` });
            const agent = supertest.agent(app);
            await agent
                .post('/auth/local/login')
                .send({ username: `${P}_logoutadmin`, password: 'Test1234!' })
                .expect(200);
            const res = await agent.post('/auth/logout');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        test('after logout, /auth/me returns 401', async () => {
            await createTestAdmin({ username: `${P}_afterlogoutadmin`, email: `${P}_afterlogoutadmin@example.com` });
            const agent = supertest.agent(app);
            await agent
                .post('/auth/local/login')
                .send({ username: `${P}_afterlogoutadmin`, password: 'Test1234!' })
                .expect(200);
            await agent.post('/auth/logout').expect(200);
            const res = await agent.get('/auth/me');
            expect(res.status).toBe(401);
        });

        test('unauthenticated logout still returns 200 (passport handles gracefully)', async () => {
            const res = await supertest(app).post('/auth/logout');
            expect(res.status).toBe(200);
        });
    });

    // ============== PUT /auth/change-password ==============
    describe('PUT /auth/change-password', () => {
        test('unauthenticated returns 401', async () => {
            const res = await supertest(app)
                .put('/auth/change-password')
                .send({ currentPassword: 'Test1234!', newPassword: 'NewPass456!' });
            expect(res.status).toBe(401);
        });

        test('authenticated admin can change password with correct current password', async () => {
            await createTestAdmin({ username: `${P}_changepwadmin`, email: `${P}_changepwadmin@example.com` });
            const agent = supertest.agent(app);
            await agent
                .post('/auth/local/login')
                .send({ username: `${P}_changepwadmin`, password: 'Test1234!' })
                .expect(200);
            const res = await agent
                .put('/auth/change-password')
                .send({ currentPassword: 'Test1234!', newPassword: 'NewSecurePass456!' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        test('wrong current password returns 400', async () => {
            await createTestAdmin({ username: `${P}_wrongcurrentpw`, email: `${P}_wrongcurrentpw@example.com` });
            const agent = supertest.agent(app);
            await agent
                .post('/auth/local/login')
                .send({ username: `${P}_wrongcurrentpw`, password: 'Test1234!' })
                .expect(200);
            const res = await agent
                .put('/auth/change-password')
                .send({ currentPassword: 'WrongCurrentPass!', newPassword: 'NewSecurePass456!' });
            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBeDefined();
        });
    });
});
