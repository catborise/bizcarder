const { User, BusinessCard, Tag } = require('../../models');

const P = 'cmodel'; // unique prefix for this suite

describe('BusinessCard Model', () => {
    // No cleanDatabase — each test uses unique usernames with prefix + timestamp

    test('creates card with all fields', async () => {
        const t = Date.now();
        const user = await User.create({ username: `${P}_all_${t}`, email: `${P}_all_${t}@test.com`, password: 'Test1234!', isApproved: true });
        const card = await BusinessCard.create({ firstName: 'John', lastName: 'Doe', company: 'TestCorp', email: `${P}_john_${t}@test.com`, phone: '+905551234567', ownerId: user.id });
        expect(card.id).toBeDefined();
        expect(card.firstName).toBe('John');
        expect(card.sharingToken).toBeDefined();
        expect(card.version).toBe(1);
    });

    test('rejects card without firstName', async () => {
        const t = Date.now();
        const user = await User.create({ username: `${P}_nofirst_${t}`, email: `${P}_nofirst_${t}@test.com`, password: 'Test1234!', isApproved: true });
        await expect(BusinessCard.create({ lastName: 'Doe', ownerId: user.id })).rejects.toThrow();
    });

    test('belongs to User via ownerId', async () => {
        const t = Date.now();
        const user = await User.create({ username: `${P}_owner_${t}`, email: `${P}_owner_${t}@test.com`, password: 'Test1234!', isApproved: true });
        const card = await BusinessCard.create({ firstName: 'Jane', ownerId: user.id });
        const owner = await card.getOwner();
        expect(owner.id).toBe(user.id);
    });

    test('card can have tags through association', async () => {
        const t = Date.now();
        const user = await User.create({ username: `${P}_tags_${t}`, email: `${P}_tags_${t}@test.com`, password: 'Test1234!', isApproved: true });
        const card = await BusinessCard.create({ firstName: 'Tagged', ownerId: user.id });
        const tag = await Tag.create({ name: `${P}_VIP_${t}`, color: '#ff0000', ownerId: user.id });
        await card.addTag(tag);
        const tags = await card.getTags();
        expect(tags).toHaveLength(1);
        expect(tags[0].name).toBe(`${P}_VIP_${t}`);
    });
});
