const { User } = require('../../models');
const { cleanDatabase } = require('../helpers');

describe('User Model', () => {
    beforeAll(async () => { await cleanDatabase(); });
    afterAll(async () => { await cleanDatabase(); });

    test('hashes password on create', async () => {
        const user = await User.create({ username: 'hashtest_' + Date.now(), email: `hashtest_${Date.now()}@test.com`, password: 'plaintext123', isApproved: true });
        expect(user.password).not.toBe('plaintext123');
        expect(user.password.startsWith('$2a$') || user.password.startsWith('$2b$')).toBe(true);
    });

    test('isApproved defaults to false', async () => {
        const user = await User.create({ username: 'defaulttest_' + Date.now(), email: `defaulttest_${Date.now()}@test.com`, password: 'Test1234!' });
        expect(user.isApproved).toBe(false);
    });

    test('rejects duplicate username', async () => {
        const unique = 'unique_' + Date.now();
        await User.create({ username: unique, email: `a_${Date.now()}@test.com`, password: 'Test1234!' });
        await expect(User.create({ username: unique, email: `b_${Date.now()}@test.com`, password: 'Test1234!' })).rejects.toThrow();
    });

    test('validatePassword returns true for correct password', async () => {
        const user = await User.create({ username: 'pwtest_' + Date.now(), email: `pwtest_${Date.now()}@test.com`, password: 'CorrectPass123', isApproved: true });
        expect(await user.validatePassword('CorrectPass123')).toBe(true);
    });

    test('validatePassword returns false for wrong password', async () => {
        const user = await User.create({ username: 'pwtest2_' + Date.now(), email: `pwtest2_${Date.now()}@test.com`, password: 'CorrectPass123', isApproved: true });
        expect(await user.validatePassword('WrongPass456')).toBe(false);
    });
});
