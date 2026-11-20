const supertest = require('supertest');
const app = require('../../server');
const { DashboardTile } = require('../../models');
const { setupSuite, createTestUser, getAuthAgent } = require('../helpers');

const P = 'tiles';

describe('Dashboard Tiles Routes (/api/db-tiles)', () => {
    let adminAgent, userAgent;

    beforeAll(async () => {
        ({ agent: adminAgent } = await setupSuite(P));
        const regularUser = await createTestUser({
            username: `${P}_user`,
            email: `${P}_user@test.com`,
        });
        userAgent = await getAuthAgent(regularUser);
    });

    describe('GET /api/db-tiles', () => {
        test('is publicly accessible and returns tiles ordered by order ASC', async () => {
            const second = await DashboardTile.create({
                title: `${P}_Second`,
                url: 'https://example.com/2',
                order: 20,
            });
            const first = await DashboardTile.create({
                title: `${P}_First`,
                url: '/contacts',
                order: 10,
                isInternal: true,
            });

            const res = await supertest(app).get('/api/db-tiles');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            const idxFirst = res.body.findIndex((t) => t.id === first.id);
            const idxSecond = res.body.findIndex((t) => t.id === second.id);
            expect(idxFirst).toBeGreaterThanOrEqual(0);
            expect(idxSecond).toBeGreaterThan(idxFirst);
        });
    });

    describe('POST /api/db-tiles', () => {
        test('rejects unauthenticated requests with 401', async () => {
            const res = await supertest(app)
                .post('/api/db-tiles')
                .send({ title: `${P}_Unauth`, url: 'https://example.com' });
            expect(res.status).toBe(401);
        });

        test('rejects non-admin users with 403', async () => {
            const res = await userAgent
                .post('/api/db-tiles')
                .send({ title: `${P}_Forbidden`, url: 'https://example.com' });
            expect(res.status).toBe(403);
        });

        test('allows admin to create a dashboard tile', async () => {
            const res = await adminAgent.post('/api/db-tiles').send({
                title: `${P}_Portal`,
                subtitle: 'Internal Portal',
                url: 'https://portal.example.com',
                icon: 'FaGlobe',
                backgroundColor: '#2563eb',
                order: 5,
                isInternal: false,
            });

            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.title).toBe(`${P}_Portal`);
            expect(res.body.url).toBe('https://portal.example.com');
            expect(res.body.order).toBe(5);
        });

        test('returns 500 TILE_CREATE_FAILED when required fields are missing', async () => {
            const res = await adminAgent.post('/api/db-tiles').send({ subtitle: 'Missing title & url' });
            expect(res.status).toBe(500);
            expect(res.body.errorCode).toBe('TILE_CREATE_FAILED');
        });
    });

    describe('PUT /api/db-tiles/:id', () => {
        test('rejects non-admin users with 403', async () => {
            const tile = await DashboardTile.create({ title: `${P}_Lock`, url: '/lock', order: 1 });
            const res = await userAgent.put(`/api/db-tiles/${tile.id}`).send({ title: 'Hacked' });
            expect(res.status).toBe(403);
        });

        test('returns 404 when tile does not exist', async () => {
            const res = await adminAgent.put('/api/db-tiles/999999').send({ title: 'Ghost' });
            expect(res.status).toBe(404);
            expect(res.body.errorCode).toBe('TILE_UPDATE_FAILED');
        });

        test('allows admin to update an existing tile', async () => {
            const tile = await DashboardTile.create({ title: `${P}_Before`, url: '/before', order: 2 });

            const res = await adminAgent.put(`/api/db-tiles/${tile.id}`).send({
                title: `${P}_After`,
                subtitle: 'Updated',
                url: '/after',
                icon: 'FaStar',
                backgroundColor: '#10b981',
                order: 99,
                isInternal: true,
            });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe(`${P}_After`);
            expect(res.body.url).toBe('/after');
            expect(res.body.order).toBe(99);
            expect(res.body.isInternal).toBe(true);
        });
    });

    describe('DELETE /api/db-tiles/:id', () => {
        test('rejects non-admin users with 403', async () => {
            const tile = await DashboardTile.create({ title: `${P}_NoDel`, url: '/nodel', order: 1 });
            const res = await userAgent.delete(`/api/db-tiles/${tile.id}`);
            expect(res.status).toBe(403);
        });

        test('returns 404 when tile does not exist', async () => {
            const res = await adminAgent.delete('/api/db-tiles/999999');
            expect(res.status).toBe(404);
            expect(res.body.errorCode).toBe('TILE_DELETE_FAILED');
        });

        test('allows admin to delete an existing tile', async () => {
            const tile = await DashboardTile.create({ title: `${P}_Del`, url: '/del', order: 1 });

            const res = await adminAgent.delete(`/api/db-tiles/${tile.id}`);
            expect(res.status).toBe(200);

            const found = await DashboardTile.findByPk(tile.id);
            expect(found).toBeNull();
        });
    });
});
