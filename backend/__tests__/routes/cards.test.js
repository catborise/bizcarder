const supertest = require('supertest');
const app = require('../../server');
const { cleanDatabase, createTestUser, createTestCard, getAuthAgent } = require('../helpers');

describe('Cards Routes', () => {
    let user, agent;

    beforeAll(async () => {
        await cleanDatabase();
        user = await createTestUser();
        agent = await getAuthAgent(user);
    });

    afterAll(async () => {
        await cleanDatabase();
    });

    // ─── GET /api/cards ────────────────────────────────────────────────────────

    describe('GET /api/cards', () => {
        test('returns paginated card list', async () => {
            await createTestCard(user.id, { firstName: 'List1', email: 'list1@test.com' });
            await createTestCard(user.id, { firstName: 'List2', email: 'list2@test.com' });
            const res = await agent.get('/api/cards');
            expect(res.status).toBe(200);
            expect(res.body.cards.length).toBeGreaterThanOrEqual(2);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(2);
        });

        test('caps limit to 100', async () => {
            const res = await agent.get('/api/cards?limit=500');
            expect(res.status).toBe(200);
            expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
        });

        test('floors page to 1 when given a negative page number', async () => {
            const res = await agent.get('/api/cards?page=-5');
            expect(res.status).toBe(200);
            expect(res.body.pagination.currentPage).toBe(1);
        });

        test('unauthenticated returns 401', async () => {
            const res = await supertest(app).get('/api/cards');
            expect(res.status).toBe(401);
        });
    });

    // ─── POST /api/cards (multipart form) ──────────────────────────────────────

    describe('POST /api/cards', () => {
        test('creates card with valid data', async () => {
            const res = await agent
                .post('/api/cards')
                .field('firstName', 'New')
                .field('lastName', 'Card')
                .field('email', 'new@card.com');
            expect(res.status).toBe(201);
            expect(res.body.firstName).toBe('New');
        });

        test('rejects card without firstName', async () => {
            const res = await agent
                .post('/api/cards')
                .field('lastName', 'NoFirst')
                .field('email', 'nofirst@test.com');
            expect(res.status).toBe(400);
        });

        test('rejects card without both email and phone', async () => {
            const res = await agent
                .post('/api/cards')
                .field('firstName', 'Missing')
                .field('lastName', 'Contact');
            expect(res.status).toBe(400);
        });
    });

    // ─── GET /api/cards/:id (single card) ─────────────────────────────────────
    // The route list exposes /api/cards/:id via GET indirectly through pagination,
    // but there is no explicit GET /:id route — skip individual GET tests.

    // ─── PUT /api/cards/:id (multipart form) ───────────────────────────────────

    describe('PUT /api/cards/:id', () => {
        test('updates own card', async () => {
            const card = await createTestCard(user.id, { firstName: 'ToUpdate', email: 'toupdate@test.com' });
            const res = await agent
                .put(`/api/cards/${card.id}`)
                .field('firstName', 'Updated')
                .field('lastName', 'Name');
            expect(res.status).toBe(200);
            expect(res.body.firstName).toBe('Updated');
        });

        test('rejects update of another users card', async () => {
            const other = await createTestUser({ username: 'otherupdate', email: 'otherupdate@test.com' });
            const card = await createTestCard(other.id, { email: 'othercard@test.com' });
            const res = await agent
                .put(`/api/cards/${card.id}`)
                .field('firstName', 'Hacked');
            expect(res.status).toBe(403);
        });

        test('returns 404 for non-existent card', async () => {
            const res = await agent
                .put('/api/cards/999999')
                .field('firstName', 'Ghost')
                .field('lastName', 'Card');
            expect(res.status).toBe(404);
        });
    });

    // ─── DELETE /api/cards/:id (soft delete) ───────────────────────────────────

    describe('DELETE /api/cards/:id', () => {
        test('soft deletes own card', async () => {
            const card = await createTestCard(user.id, { firstName: 'ToSoftDelete', email: 'softdelete@test.com' });
            const res = await agent.delete(`/api/cards/${card.id}`);
            expect(res.status).toBe(200);
            await card.reload();
            expect(card.deletedAt).not.toBeNull();
        });

        test('rejects soft delete of another users card', async () => {
            const other = await createTestUser({ username: 'other2del', email: 'other2del@test.com' });
            const card = await createTestCard(other.id, { email: 'other2delcard@test.com' });
            const res = await agent.delete(`/api/cards/${card.id}`);
            expect(res.status).toBe(403);
        });

        test('returns 404 for non-existent card', async () => {
            const res = await agent.delete('/api/cards/999999');
            expect(res.status).toBe(404);
        });
    });

    // ─── Trash Operations ──────────────────────────────────────────────────────

    describe('Trash Operations', () => {
        test('GET /api/cards/trash returns soft-deleted cards', async () => {
            const card = await createTestCard(user.id, { firstName: 'TrashMe', email: 'trashme@test.com' });
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.get('/api/cards/trash');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        test('POST /api/cards/:id/restore restores a soft-deleted card', async () => {
            const card = await createTestCard(user.id, { firstName: 'ToRestore', email: 'torestore@test.com' });
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.post(`/api/cards/${card.id}/restore`);
            expect(res.status).toBe(200);
            await card.reload();
            expect(card.deletedAt).toBeNull();
        });

        test('DELETE /api/cards/:id/permanent hard deletes a card', async () => {
            const card = await createTestCard(user.id, { firstName: 'HardDelete', email: 'harddelete@test.com' });
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.delete(`/api/cards/${card.id}/permanent`);
            expect(res.status).toBe(200);
        });

        test('DELETE /api/cards/trash/empty empties the trash', async () => {
            const card = await createTestCard(user.id, { firstName: 'EmptyTrash', email: 'emptytrash@test.com' });
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.delete('/api/cards/trash/empty');
            expect(res.status).toBe(200);
        });
    });

    // ─── Bulk Operations ───────────────────────────────────────────────────────

    describe('Bulk Operations', () => {
        test('POST /api/cards/bulk-delete soft-deletes multiple cards', async () => {
            const c1 = await createTestCard(user.id, { firstName: 'Bulk1', email: 'bulk1@test.com' });
            const c2 = await createTestCard(user.id, { firstName: 'Bulk2', email: 'bulk2@test.com' });
            const res = await agent
                .post('/api/cards/bulk-delete')
                .send({ ids: [c1.id, c2.id] });
            expect(res.status).toBe(200);
        });

        test('POST /api/cards/bulk-delete rejects missing ids', async () => {
            const res = await agent
                .post('/api/cards/bulk-delete')
                .send({});
            expect(res.status).toBe(400);
        });

        test('POST /api/cards/bulk-visibility updates visibility to public', async () => {
            const card = await createTestCard(user.id, { firstName: 'BulkVis', email: 'bulkvis@test.com' });
            const res = await agent
                .post('/api/cards/bulk-visibility')
                .send({ ids: [card.id], visibility: 'public' });
            expect(res.status).toBe(200);
        });

        test('POST /api/cards/bulk-visibility rejects invalid visibility value', async () => {
            const card = await createTestCard(user.id, { firstName: 'BulkVisInvalid', email: 'bulkvisinvalid@test.com' });
            const res = await agent
                .post('/api/cards/bulk-visibility')
                .send({ ids: [card.id], visibility: 'invalid' });
            expect(res.status).toBe(400);
        });
    });

    // ─── GET /api/cards/due-reminders ─────────────────────────────────────────

    describe('GET /api/cards/due-reminders', () => {
        test('returns cards with past-due reminders', async () => {
            await createTestCard(user.id, { firstName: 'PastDue', email: 'pastdue@test.com', reminderDate: new Date('2020-01-01') });
            const res = await agent.get('/api/cards/due-reminders');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        test('future reminders are not returned as due', async () => {
            // card with future reminder should not appear in due-reminders
            await createTestCard(user.id, { firstName: 'FutureReminder', email: 'futurereminder@test.com', reminderDate: new Date('2099-12-31') });
            const res = await agent.get('/api/cards/due-reminders');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            const futureCards = res.body.filter(c => c.firstName === 'FutureReminder');
            expect(futureCards).toHaveLength(0);
        });
    });

    // ─── GET /api/cards/personal ───────────────────────────────────────────────

    describe('GET /api/cards/personal', () => {
        test('returns null when user has no personal card', async () => {
            // Use a dedicated user with no personal card
            const freshUser = await createTestUser({ username: 'nopersonalcard', email: 'nopersonalcard@test.com' });
            const freshAgent = await getAuthAgent(freshUser);
            const res = await freshAgent.get('/api/cards/personal');
            expect(res.status).toBe(200);
            expect(res.body).toBeNull();
        });

        test('returns the personal card when it exists', async () => {
            await createTestCard(user.id, { firstName: 'PersonalCard', email: 'personalcard@test.com', isPersonal: true });
            const res = await agent.get('/api/cards/personal');
            expect(res.status).toBe(200);
            expect(res.body).not.toBeNull();
            expect(res.body.isPersonal).toBe(true);
        });
    });
});
