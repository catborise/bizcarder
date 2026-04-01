const { User } = require('../../models');
const { cleanDatabase } = require('../helpers');

describe('User Model', () => {
    beforeEach(async () => { await cleanDatabase(); });

    test('hashes password on create', async () => {
        const user = await User.create({ username: 'hashtest', email: 'hash@test.com', password: 'plaintext123', isApproved: true });
        expect(user.password).not.toBe('plaintext123');
        expect(user.password.startsWith('$2a$') || user.password.startsWith('$2b$')).toBe(true);
    });

    test('isApproved defaults to false', async () => {
        const user = await User.create({ username: 'defaulttest', email: 'default@test.com', password: 'Test1234!' });
        expect(user.isApproved).toBe(false);
    });

    test('rejects duplicate username', async () => {
        await User.create({ username: 'unique', email: 'a@test.com', password: 'Test1234!' });
        await expect(User.create({ username: 'unique', email: 'b@test.com', password: 'Test1234!' })).rejects.toThrow();
    });

    test('validatePassword returns true for correct password', async () => {
        const user = await User.create({ username: 'pwtest', email: 'pw@test.com', password: 'CorrectPass123', isApproved: true });
        expect(await user.validatePassword('CorrectPass123')).toBe(true);
    });

    test('validatePassword returns false for wrong password', async () => {
        const user = await User.create({ username: 'pwtest2', email: 'pw2@test.com', password: 'CorrectPass123', isApproved: true });
        expect(await user.validatePassword('WrongPass456')).toBe(false);
    });
});
