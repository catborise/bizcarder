const { User, BusinessCard, Tag } = require('../../models');
const { cleanDatabase } = require('../helpers');

describe('BusinessCard Model', () => {
    beforeAll(async () => { await cleanDatabase(); });
    afterAll(async () => { await cleanDatabase(); });

    test('creates card with all fields', async () => {
        const user = await User.create({ username: 'cardtest_all_' + Date.now(), email: `cardtest_all_${Date.now()}@test.com`, password: 'Test1234!', isApproved: true });
        const card = await BusinessCard.create({ firstName: 'John', lastName: 'Doe', company: 'TestCorp', email: 'john@test.com', phone: '+905551234567', ownerId: user.id });
        expect(card.id).toBeDefined();
        expect(card.firstName).toBe('John');
        expect(card.sharingToken).toBeDefined();
        expect(card.version).toBe(1);
    });

    test('rejects card without firstName', async () => {
        const user = await User.create({ username: 'cardtest_nofirst_' + Date.now(), email: `cardtest_nofirst_${Date.now()}@test.com`, password: 'Test1234!', isApproved: true });
        await expect(BusinessCard.create({ lastName: 'Doe', ownerId: user.id })).rejects.toThrow();
    });

    test('belongs to User via ownerId', async () => {
        const user = await User.create({ username: 'cardtest_owner_' + Date.now(), email: `cardtest_owner_${Date.now()}@test.com`, password: 'Test1234!', isApproved: true });
        const card = await BusinessCard.create({ firstName: 'Jane', ownerId: user.id });
        const owner = await card.getOwner();
        expect(owner.id).toBe(user.id);
    });

    test('card can have tags through association', async () => {
        const user = await User.create({ username: 'cardtest_tags_' + Date.now(), email: `cardtest_tags_${Date.now()}@test.com`, password: 'Test1234!', isApproved: true });
        const card = await BusinessCard.create({ firstName: 'Tagged', ownerId: user.id });
        const tag = await Tag.create({ name: 'VIP', color: '#ff0000', ownerId: user.id });
        await card.addTag(tag);
        const tags = await card.getTags();
        expect(tags).toHaveLength(1);
        expect(tags[0].name).toBe('VIP');
    });
});
