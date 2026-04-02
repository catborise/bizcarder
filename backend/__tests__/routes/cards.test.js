const supertest = require('supertest');
const app = require('../../server');
const { createTestUser, createTestCard, setupSuite, getAuthAgent } = require('../helpers');

const P = 'cards'; // unique prefix for this suite

describe('Cards Routes', () => {
    let user, agent;

    beforeAll(async () => {
        const ctx = await setupSuite(P);
        // setupSuite creates an admin; for card tests we want a regular user
        user = await createTestUser({ username: `${P}_user`, email: `${P}_user@test.com` });
        agent = await getAuthAgent(user);
    });

    // ─── GET /api/cards ────────────────────────────────────────────────────────

    describe('GET /api/cards', () => {
        test('returns paginated card list', async () => {
            await createTestCard(user.id, { firstName: `${P}_List1`, email: `${P}_list1@test.com` });
            await createTestCard(user.id, { firstName: `${P}_List2`, email: `${P}_list2@test.com` });
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
                .field('firstName', `${P}_New`)
                .field('lastName', 'Card')
                .field('email', `${P}_new@card.com`);
            expect(res.status).toBe(201);
            // toTitleCase turns "cards_New" into "Cards_new"
            expect(res.body.firstName).toBe('Cards_new');
        });

        test('rejects card without firstName', async () => {
            const res = await agent
                .post('/api/cards')
                .field('lastName', 'NoFirst')
                .field('email', `${P}_nofirst@test.com`);
            expect(res.status).toBe(400);
        });

        test('rejects card without both email and phone', async () => {
            const res = await agent
                .post('/api/cards')
                .field('firstName', `${P}_Missing`)
                .field('lastName', 'Contact');
            expect(res.status).toBe(400);
        });
    });

    // ─── PUT /api/cards/:id (multipart form) ───────────────────────────────────

    describe('PUT /api/cards/:id', () => {
        test('updates own card', async () => {
            const card = await createTestCard(user.id, { firstName: `${P}_ToUpdate`, email: `${P}_toupdate@test.com` });
            const res = await agent
                .put(`/api/cards/${card.id}`)
                .field('firstName', `${P}_Updated`)
                .field('lastName', 'Name')
                .field('email', `${P}_toupdate@test.com`);
            expect(res.status).toBe(200);
            // toTitleCase turns "cards_Updated" into "Cards_updated"
            expect(res.body.firstName).toBe('Cards_updated');
        });

        test('rejects update of another users card', async () => {
            const other = await createTestUser({ username: `${P}_otherupdate`, email: `${P}_otherupdate@test.com` });
            const card = await createTestCard(other.id, { email: `${P}_othercard@test.com` });
            const res = await agent
                .put(`/api/cards/${card.id}`)
                .field('firstName', 'Hacked')
                .field('lastName', 'Name')
                .field('email', `${P}_othercard@test.com`);
            expect(res.status).toBe(403);
        });

        test('returns 404 for non-existent card', async () => {
            const res = await agent
                .put('/api/cards/999999')
                .field('firstName', 'Ghost')
                .field('lastName', 'Card')
                .field('email', 'ghost@test.com');
            expect(res.status).toBe(404);
        });
    });

    // ─── DELETE /api/cards/:id (soft delete) ───────────────────────────────────

    describe('DELETE /api/cards/:id', () => {
        test('soft deletes own card', async () => {
            const card = await createTestCard(user.id, { firstName: `${P}_ToSoftDelete`, email: `${P}_softdelete@test.com` });
            const res = await agent.delete(`/api/cards/${card.id}`);
            expect(res.status).toBe(200);
            await card.reload();
            expect(card.deletedAt).not.toBeNull();
        });

        test('rejects soft delete of another users card', async () => {
            const other = await createTestUser({ username: `${P}_other2del`, email: `${P}_other2del@test.com` });
            const card = await createTestCard(other.id, { email: `${P}_other2delcard@test.com` });
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
            const card = await createTestCard(user.id, { firstName: `${P}_TrashMe`, email: `${P}_trashme@test.com` });
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.get('/api/cards/trash');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        test('POST /api/cards/:id/restore restores a soft-deleted card', async () => {
            const card = await createTestCard(user.id, { firstName: `${P}_ToRestore`, email: `${P}_torestore@test.com` });
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.post(`/api/cards/${card.id}/restore`);
            expect(res.status).toBe(200);
            await card.reload();
            expect(card.deletedAt).toBeNull();
        });

        test('DELETE /api/cards/:id/permanent hard deletes a card', async () => {
            const card = await createTestCard(user.id, { firstName: `${P}_HardDelete`, email: `${P}_harddelete@test.com` });
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.delete(`/api/cards/${card.id}/permanent`);
            expect(res.status).toBe(200);
        });

        test('DELETE /api/cards/trash/empty empties the trash', async () => {
            const card = await createTestCard(user.id, { firstName: `${P}_EmptyTrash`, email: `${P}_emptytrash@test.com` });
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.delete('/api/cards/trash/empty');
            expect(res.status).toBe(200);
        });
    });

    // ─── Bulk Operations ───────────────────────────────────────────────────────

    describe('Bulk Operations', () => {
        test('POST /api/cards/bulk-delete soft-deletes multiple cards', async () => {
            const c1 = await createTestCard(user.id, { firstName: `${P}_Bulk1`, email: `${P}_bulk1@test.com` });
            const c2 = await createTestCard(user.id, { firstName: `${P}_Bulk2`, email: `${P}_bulk2@test.com` });
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
            const card = await createTestCard(user.id, { firstName: `${P}_BulkVis`, email: `${P}_bulkvis@test.com` });
            const res = await agent
                .post('/api/cards/bulk-visibility')
                .send({ ids: [card.id], visibility: 'public' });
            expect(res.status).toBe(200);
        });

        test('POST /api/cards/bulk-visibility rejects invalid visibility value', async () => {
            const card = await createTestCard(user.id, { firstName: `${P}_BulkVisInvalid`, email: `${P}_bulkvisinvalid@test.com` });
            const res = await agent
                .post('/api/cards/bulk-visibility')
                .send({ ids: [card.id], visibility: 'invalid' });
            expect(res.status).toBe(400);
        });
    });

    // ─── GET /api/cards/due-reminders ─────────────────────────────────────────

    describe('GET /api/cards/due-reminders', () => {
        test('returns cards with past-due reminders', async () => {
            await createTestCard(user.id, { firstName: `${P}_PastDue`, email: `${P}_pastdue@test.com`, reminderDate: new Date('2020-01-01') });
            const res = await agent.get('/api/cards/due-reminders');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        test('future reminders are not returned as due', async () => {
            await createTestCard(user.id, { firstName: `${P}_FutureReminder`, email: `${P}_futurereminder@test.com`, reminderDate: new Date('2099-12-31') });
            const res = await agent.get('/api/cards/due-reminders');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            const futureCards = res.body.filter(c => c.firstName === `${P}_FutureReminder`);
            expect(futureCards).toHaveLength(0);
        });
    });

    // ─── GET /api/cards/personal ───────────────────────────────────────────────

    describe('GET /api/cards/personal', () => {
        test('returns null when user has no personal card', async () => {
            const freshUser = await createTestUser({ username: `${P}_nopersonalcard`, email: `${P}_nopersonalcard@test.com` });
            const freshAgent = await getAuthAgent(freshUser);
            const res = await freshAgent.get('/api/cards/personal');
            expect(res.status).toBe(200);
            expect(res.body).toBeNull();
        });

        test('returns the personal card when it exists', async () => {
            await createTestCard(user.id, { firstName: `${P}_PersonalCard`, email: `${P}_personalcard@test.com`, isPersonal: true });
            const res = await agent.get('/api/cards/personal');
            expect(res.status).toBe(200);
            expect(res.body).not.toBeNull();
            expect(res.body.isPersonal).toBe(true);
        });
    });
});
