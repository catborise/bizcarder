const supertest = require('supertest');
const app = require('../../server');
const { setupSuite, createTestUser, createTestCard, getAuthAgent } = require('../helpers');
const { Interaction, BusinessCard } = require('../../models');

const P = 'inter';
let admin, agent, card;

beforeAll(async () => {
    const ctx = await setupSuite(P);
    admin = ctx.admin;
    agent = ctx.agent;
    card = await createTestCard(admin.id, {
        firstName: `${P}_John`,
        lastName: `${P}_Doe`,
        email: `${P}_john@test.com`,
    });
});

// ─── GET /api/interactions/:cardId ───────────────────────────────────

describe('GET /api/interactions/:cardId', () => {
    test('requires authentication', async () => {
        const res = await supertest(app).get(`/api/interactions/${card.id}`);
        expect([401, 403, 302]).toContain(res.status);
    });

    test('returns empty array for card with no interactions', async () => {
        const res = await agent.get(`/api/interactions/${card.id}`).expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
    });

    test('returns interactions for a card', async () => {
        await Interaction.create({ cardId: card.id, type: 'call', notes: 'Test call', date: new Date(), authorId: admin.id });
        await Interaction.create({ cardId: card.id, type: 'email', notes: 'Test email', date: new Date(), authorId: admin.id });

        const res = await agent.get(`/api/interactions/${card.id}`).expect(200);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    test('includes author displayName', async () => {
        const res = await agent.get(`/api/interactions/${card.id}`).expect(200);
        const withAuthor = res.body.find(i => i.author);
        expect(withAuthor).toBeTruthy();
        expect(withAuthor.author).toHaveProperty('displayName');
    });

    test('pinned interactions appear first', async () => {
        // Create unpinned then pinned
        const unpinned = await Interaction.create({ cardId: card.id, type: 'note', notes: 'Unpinned', date: new Date(), authorId: admin.id, isPinned: false });
        const pinned = await Interaction.create({ cardId: card.id, type: 'note', notes: 'Pinned', date: new Date(), authorId: admin.id, isPinned: true });

        const res = await agent.get(`/api/interactions/${card.id}`).expect(200);
        const pinnedIdx = res.body.findIndex(i => i.id === pinned.id);
        const unpinnedIdx = res.body.findIndex(i => i.id === unpinned.id);
        expect(pinnedIdx).toBeLessThan(unpinnedIdx);
    });
});

// ─── POST /api/interactions/:cardId ──────────────────────────────────

describe('POST /api/interactions/:cardId', () => {
    test('requires authentication', async () => {
        const res = await supertest(app)
            .post(`/api/interactions/${card.id}`)
            .send({ type: 'call', notes: 'Hack' });
        expect([401, 403, 302]).toContain(res.status);
    });

    test('creates a new interaction', async () => {
        const res = await agent
            .post(`/api/interactions/${card.id}`)
            .send({ type: 'meeting', notes: 'Quarterly review' })
            .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.type).toBe('meeting');
        expect(res.body.notes).toBe('Quarterly review');
        expect(res.body.cardId).toBe(card.id);
    });

    test('sets authorId from authenticated user', async () => {
        const res = await agent
            .post(`/api/interactions/${card.id}`)
            .send({ type: 'call', notes: 'Author check' })
            .expect(201);

        expect(res.body.authorId).toBe(admin.id);
    });

    test('uses provided date', async () => {
        const customDate = '2026-01-15T10:00:00.000Z';
        const res = await agent
            .post(`/api/interactions/${card.id}`)
            .send({ type: 'email', notes: 'Custom date', date: customDate })
            .expect(201);

        expect(new Date(res.body.date).toISOString()).toBe(customDate);
    });

    test('uses current date when none provided', async () => {
        const before = new Date();
        const res = await agent
            .post(`/api/interactions/${card.id}`)
            .send({ type: 'call', notes: 'No date' })
            .expect(201);

        const interactionDate = new Date(res.body.date);
        expect(interactionDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    });

    test('updates card lastInteractionDate', async () => {
        const customDate = '2026-03-20T12:00:00.000Z';
        await agent
            .post(`/api/interactions/${card.id}`)
            .send({ type: 'meeting', notes: 'Update nurturing', date: customDate })
            .expect(201);

        const updatedCard = await BusinessCard.findByPk(card.id);
        expect(new Date(updatedCard.lastInteractionDate).toISOString()).toBe(customDate);
    });
});

// ─── PUT /api/interactions/:id ───────────────────────────────────────

describe('PUT /api/interactions/:id', () => {
    let interaction;

    beforeAll(async () => {
        interaction = await Interaction.create({
            cardId: card.id, type: 'call', notes: 'Original', date: new Date(), authorId: admin.id,
        });
    });

    test('requires authentication', async () => {
        const res = await supertest(app)
            .put(`/api/interactions/${interaction.id}`)
            .send({ notes: 'Hack' });
        expect([401, 403, 302]).toContain(res.status);
    });

    test('updates interaction fields', async () => {
        const res = await agent
            .put(`/api/interactions/${interaction.id}`)
            .send({ type: 'email', notes: 'Updated notes' })
            .expect(200);

        expect(res.body.type).toBe('email');
        expect(res.body.notes).toBe('Updated notes');
    });

    test('returns 404 for non-existent interaction', async () => {
        const res = await agent
            .put('/api/interactions/999999')
            .send({ notes: 'Nope' })
            .expect(404);

        expect(res.body.error).toBeTruthy();
    });

    test('non-admin cannot update another users interaction', async () => {
        const otherUser = await createTestUser({
            username: `${P}_other_edit`,
            email: `${P}_other_edit@test.com`,
            role: 'user',
        });
        const otherAgent = await getAuthAgent(otherUser);

        const res = await otherAgent
            .put(`/api/interactions/${interaction.id}`)
            .send({ notes: 'Unauthorized edit' });

        expect(res.status).toBe(403);
    });

    test('admin can update any interaction', async () => {
        const otherUser = await createTestUser({
            username: `${P}_owner_edit`,
            email: `${P}_owner_edit@test.com`,
            role: 'user',
        });
        const otherInteraction = await Interaction.create({
            cardId: card.id, type: 'note', notes: 'Other user note', date: new Date(), authorId: otherUser.id,
        });

        const res = await agent
            .put(`/api/interactions/${otherInteraction.id}`)
            .send({ notes: 'Admin override' })
            .expect(200);

        expect(res.body.notes).toBe('Admin override');
    });

    test('keeps original date when no date provided', async () => {
        const original = await Interaction.create({
            cardId: card.id, type: 'call', notes: 'Keep date', date: '2026-02-01T08:00:00.000Z', authorId: admin.id,
        });

        const res = await agent
            .put(`/api/interactions/${original.id}`)
            .send({ notes: 'Updated but same date' })
            .expect(200);

        expect(new Date(res.body.date).toISOString()).toBe('2026-02-01T08:00:00.000Z');
    });
});

// ─── DELETE /api/interactions/:id ────────────────────────────────────

describe('DELETE /api/interactions/:id', () => {
    test('requires authentication', async () => {
        const interaction = await Interaction.create({
            cardId: card.id, type: 'call', notes: 'To delete unauth', date: new Date(), authorId: admin.id,
        });
        const res = await supertest(app).delete(`/api/interactions/${interaction.id}`);
        expect([401, 403, 302]).toContain(res.status);
    });

    test('deletes own interaction', async () => {
        const interaction = await Interaction.create({
            cardId: card.id, type: 'note', notes: 'Delete me', date: new Date(), authorId: admin.id,
        });

        await agent.delete(`/api/interactions/${interaction.id}`).expect(200);

        const found = await Interaction.findByPk(interaction.id);
        expect(found).toBeNull();
    });

    test('returns 404 for non-existent interaction', async () => {
        await agent.delete('/api/interactions/999999').expect(404);
    });

    test('non-admin cannot delete another users interaction', async () => {
        const interaction = await Interaction.create({
            cardId: card.id, type: 'call', notes: 'Admin owned', date: new Date(), authorId: admin.id,
        });

        const otherUser = await createTestUser({
            username: `${P}_other_del`,
            email: `${P}_other_del@test.com`,
            role: 'user',
        });
        const otherAgent = await getAuthAgent(otherUser);

        await otherAgent.delete(`/api/interactions/${interaction.id}`).expect(403);
    });

    test('admin can delete any interaction', async () => {
        const otherUser = await createTestUser({
            username: `${P}_owner_del`,
            email: `${P}_owner_del@test.com`,
            role: 'user',
        });
        const interaction = await Interaction.create({
            cardId: card.id, type: 'note', notes: 'Other owns this', date: new Date(), authorId: otherUser.id,
        });

        await agent.delete(`/api/interactions/${interaction.id}`).expect(200);

        const found = await Interaction.findByPk(interaction.id);
        expect(found).toBeNull();
    });
});

// ─── PUT /api/interactions/:id/pin ───────────────────────────────────

describe('PUT /api/interactions/:id/pin', () => {
    let interaction;

    beforeAll(async () => {
        interaction = await Interaction.create({
            cardId: card.id, type: 'note', notes: 'Pin test', date: new Date(), authorId: admin.id, isPinned: false,
        });
    });

    test('requires authentication', async () => {
        const res = await supertest(app).put(`/api/interactions/${interaction.id}/pin`);
        expect([401, 403, 302]).toContain(res.status);
    });

    test('toggles pin from false to true', async () => {
        const res = await agent.put(`/api/interactions/${interaction.id}/pin`).expect(200);
        expect(res.body.isPinned).toBe(true);
    });

    test('toggles pin from true back to false', async () => {
        const res = await agent.put(`/api/interactions/${interaction.id}/pin`).expect(200);
        expect(res.body.isPinned).toBe(false);
    });

    test('returns 404 for non-existent interaction', async () => {
        await agent.put('/api/interactions/999999/pin').expect(404);
    });

    test('non-admin cannot pin another users interaction', async () => {
        const otherUser = await createTestUser({
            username: `${P}_other_pin`,
            email: `${P}_other_pin@test.com`,
            role: 'user',
        });
        const otherAgent = await getAuthAgent(otherUser);

        await otherAgent.put(`/api/interactions/${interaction.id}/pin`).expect(403);
    });

    test('admin can pin any interaction', async () => {
        const otherUser = await createTestUser({
            username: `${P}_owner_pin`,
            email: `${P}_owner_pin@test.com`,
            role: 'user',
        });
        const otherInteraction = await Interaction.create({
            cardId: card.id, type: 'call', notes: 'Other pin', date: new Date(), authorId: otherUser.id, isPinned: false,
        });

        const res = await agent.put(`/api/interactions/${otherInteraction.id}/pin`).expect(200);
        expect(res.body.isPinned).toBe(true);
    });
});
