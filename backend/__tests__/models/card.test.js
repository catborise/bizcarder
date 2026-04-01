const { User, BusinessCard, Tag } = require('../../models');
const { cleanDatabase, createTestUser } = require('../helpers');

describe('BusinessCard Model', () => {
    let testUser;
    beforeEach(async () => { await cleanDatabase(); testUser = await createTestUser(); });

    test('creates card with all fields', async () => {
        const card = await BusinessCard.create({ firstName: 'John', lastName: 'Doe', company: 'TestCorp', email: 'john@test.com', phone: '+905551234567', ownerId: testUser.id });
        expect(card.id).toBeDefined();
        expect(card.firstName).toBe('John');
        expect(card.sharingToken).toBeDefined();
        expect(card.version).toBe(1);
    });

    test('rejects card without firstName', async () => {
        await expect(BusinessCard.create({ lastName: 'Doe', ownerId: testUser.id })).rejects.toThrow();
    });

    test('belongs to User via ownerId', async () => {
        const card = await BusinessCard.create({ firstName: 'Jane', ownerId: testUser.id });
        const owner = await card.getOwner();
        expect(owner.id).toBe(testUser.id);
    });

    test('card can have tags through association', async () => {
        const card = await BusinessCard.create({ firstName: 'Tagged', ownerId: testUser.id });
        const tag = await Tag.create({ name: 'VIP', color: '#ff0000', ownerId: testUser.id });
        await card.addTag(tag);
        const tags = await card.getTags();
        expect(tags).toHaveLength(1);
        expect(tags[0].name).toBe('VIP');
    });
});
