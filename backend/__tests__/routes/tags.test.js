const supertest = require('supertest');
const app = require('../../server');
const { cleanDatabase, createTestUser, createTestTag, getAuthAgent } = require('../helpers');

describe('Tags Routes', () => {
    let user, agent;

    beforeAll(async () => {
        await cleanDatabase();
        user = await createTestUser();
        agent = await getAuthAgent(user);
    });

    afterAll(async () => {
        await cleanDatabase();
    });

    // ─── GET /api/tags ─────────────────────────────────────────────────────────

    describe('GET /api/tags', () => {
        test('returns all tags for authenticated user', async () => {
            await createTestTag(user.id, { name: 'GetTagsTest' });
            const res = await agent.get('/api/tags');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        test('unauthenticated returns 401', async () => {
            const res = await supertest(app).get('/api/tags');
            expect(res.status).toBe(401);
        });

        test('returns tags sorted by name', async () => {
            await createTestTag(user.id, { name: 'ZebraTag' });
            await createTestTag(user.id, { name: 'AppleTag' });
            const res = await agent.get('/api/tags');
            expect(res.status).toBe(200);
            const names = res.body.map(t => t.name);
            const sorted = [...names].sort();
            expect(names).toEqual(sorted);
        });
    });

    // ─── GET /api/tags/stats ───────────────────────────────────────────────────

    describe('GET /api/tags/stats', () => {
        test('returns tag usage statistics', async () => {
            await createTestTag(user.id, { name: 'StatsTag' });
            const res = await agent.get('/api/tags/stats');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test('stats entries include id, name, color, and cardCount', async () => {
            await createTestTag(user.id, { name: 'StatsFieldsTag' });
            const res = await agent.get('/api/tags/stats');
            expect(res.status).toBe(200);
            if (res.body.length > 0) {
                const tag = res.body[0];
                expect(tag).toHaveProperty('id');
                expect(tag).toHaveProperty('name');
                expect(tag).toHaveProperty('color');
                expect(tag).toHaveProperty('cardCount');
            }
        });

        test('unauthenticated returns 401', async () => {
            const res = await supertest(app).get('/api/tags/stats');
            expect(res.status).toBe(401);
        });
    });

    // ─── POST /api/tags ────────────────────────────────────────────────────────

    describe('POST /api/tags', () => {
        test('creates a new tag with name and color', async () => {
            const res = await agent
                .post('/api/tags')
                .send({ name: 'NewTag', color: '#00ff00' });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('NewTag');
            expect(res.body.color).toBe('#00ff00');
        });

        test('creates a tag with default color when color is omitted', async () => {
            const res = await agent
                .post('/api/tags')
                .send({ name: 'DefaultColor' });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('DefaultColor');
            expect(res.body.color).toBe('#3b82f6');
        });

        test('rejects tag without name', async () => {
            const res = await agent
                .post('/api/tags')
                .send({ color: '#ff0000' });
            expect(res.status).toBe(400);
        });

        test('unauthenticated returns 401', async () => {
            const res = await supertest(app)
                .post('/api/tags')
                .send({ name: 'Ghost', color: '#000000' });
            expect(res.status).toBe(401);
        });
    });

    // ─── PUT /api/tags/:id ─────────────────────────────────────────────────────

    describe('PUT /api/tags/:id', () => {
        test('owner can update their own tag', async () => {
            const tag = await createTestTag(user.id, { name: 'TagToUpdate' });
            const res = await agent
                .put(`/api/tags/${tag.id}`)
                .send({ name: 'Updated', color: '#0000ff' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
            expect(res.body.color).toBe('#0000ff');
        });

        test('returns 404 for non-existent tag', async () => {
            const res = await agent
                .put('/api/tags/999999')
                .send({ name: 'Ghost' });
            expect(res.status).toBe(404);
        });

        test('rejects update of another users tag with 403', async () => {
            const other = await createTestUser({ username: 'otherupdatetag', email: 'otherupdatetag@test.com' });
            const tag = await createTestTag(other.id, { name: 'OtherTag' });
            const res = await agent
                .put(`/api/tags/${tag.id}`)
                .send({ name: 'Hacked' });
            expect(res.status).toBe(403);
        });

        test('unauthenticated returns 401', async () => {
            const tag = await createTestTag(user.id, { name: 'UnauthUpdateTag' });
            const res = await supertest(app)
                .put(`/api/tags/${tag.id}`)
                .send({ name: 'Ghost' });
            expect(res.status).toBe(401);
        });
    });

    // ─── DELETE /api/tags/:id ──────────────────────────────────────────────────

    describe('DELETE /api/tags/:id', () => {
        test('owner can delete their own tag', async () => {
            const tag = await createTestTag(user.id, { name: 'TagToDelete' });
            const res = await agent.delete(`/api/tags/${tag.id}`);
            expect(res.status).toBe(200);
            expect(res.body.message).toBeDefined();
        });

        test('returns 404 for non-existent tag', async () => {
            const res = await agent.delete('/api/tags/999999');
            expect(res.status).toBe(404);
        });

        test('rejects deletion of another users tag with 403', async () => {
            const other = await createTestUser({ username: 'tagowner', email: 'to@test.com' });
            const tag = await createTestTag(other.id, { name: 'OtherOwnerTag' });
            const res = await agent.delete(`/api/tags/${tag.id}`);
            expect(res.status).toBe(403);
        });

        test('unauthenticated returns 401', async () => {
            const tag = await createTestTag(user.id, { name: 'UnauthDeleteTag' });
            const res = await supertest(app).delete(`/api/tags/${tag.id}`);
            expect(res.status).toBe(401);
        });
    });
});
