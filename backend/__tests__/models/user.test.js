const { User } = require('../../models');

const P = 'umodel'; // unique prefix for this suite

describe('User Model', () => {
    // No cleanDatabase — each test uses unique usernames with prefix + timestamp

    test('hashes password on create', async () => {
        const t = Date.now();
        const user = await User.create({ username: `${P}_hashtest_${t}`, email: `${P}_hashtest_${t}@test.com`, password: 'plaintext123', isApproved: true });
        expect(user.password).not.toBe('plaintext123');
        expect(user.password.startsWith('$2a$') || user.password.startsWith('$2b$')).toBe(true);
    });

    test('isApproved defaults to false', async () => {
        const t = Date.now();
        const user = await User.create({ username: `${P}_defaulttest_${t}`, email: `${P}_defaulttest_${t}@test.com`, password: 'Test1234!' });
        expect(user.isApproved).toBe(false);
    });

    test('rejects duplicate username', async () => {
        const t = Date.now();
        const unique = `${P}_unique_${t}`;
        await User.create({ username: unique, email: `${P}_a_${t}@test.com`, password: 'Test1234!' });
        await expect(User.create({ username: unique, email: `${P}_b_${t}@test.com`, password: 'Test1234!' })).rejects.toThrow();
    });

    test('validatePassword returns true for correct password', async () => {
        const t = Date.now();
        const user = await User.create({ username: `${P}_pwtest_${t}`, email: `${P}_pwtest_${t}@test.com`, password: 'CorrectPass123', isApproved: true });
        expect(await user.validatePassword('CorrectPass123')).toBe(true);
    });

    test('validatePassword returns false for wrong password', async () => {
        const t = Date.now();
        const user = await User.create({ username: `${P}_pwtest2_${t}`, email: `${P}_pwtest2_${t}@test.com`, password: 'CorrectPass123', isApproved: true });
        expect(await user.validatePassword('WrongPass456')).toBe(false);
    });
});
