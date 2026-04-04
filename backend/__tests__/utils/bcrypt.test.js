const { User } = require('../../models');

const P = 'bcrypt'; // unique prefix for this suite

describe('Bcrypt Password Hashing (User model)', () => {
    // These tests exercise bcryptjs through the User model hooks and
    // the validatePassword instance method. They will break if the
    // bcryptjs API changes (critical for bcryptjs 3 migration).

    test('hashes password on user creation (not stored in plaintext)', async () => {
        const user = await User.create({
            username: `${P}_hash`,
            email: `${P}_hash@test.com`,
            password: 'Test1234!',
            displayName: `${P} Hash`,
            role: 'user',
            isApproved: true,
        });

        // The stored password should not be the plaintext value
        expect(user.password).not.toBe('Test1234!');
        // bcrypt hashes start with $2a$ or $2b$
        expect(user.password).toMatch(/^\$2[ab]\$/);
    });

    test('validates correct password', async () => {
        const user = await User.create({
            username: `${P}_valid`,
            email: `${P}_valid@test.com`,
            password: 'CorrectPass1!',
            displayName: `${P} Valid`,
            role: 'user',
            isApproved: true,
        });

        const isValid = await user.validatePassword('CorrectPass1!');
        expect(isValid).toBe(true);
    });

    test('rejects incorrect password', async () => {
        const user = await User.create({
            username: `${P}_reject`,
            email: `${P}_reject@test.com`,
            password: 'CorrectPass1!',
            displayName: `${P} Reject`,
            role: 'user',
            isApproved: true,
        });

        const isValid = await user.validatePassword('WrongPassword!');
        expect(isValid).toBe(false);
    });

    test('generates different hashes for the same password (salt uniqueness)', async () => {
        const user1 = await User.create({
            username: `${P}_salt1`,
            email: `${P}_salt1@test.com`,
            password: 'SamePassword1!',
            displayName: `${P} Salt1`,
            role: 'user',
            isApproved: true,
        });

        const user2 = await User.create({
            username: `${P}_salt2`,
            email: `${P}_salt2@test.com`,
            password: 'SamePassword1!',
            displayName: `${P} Salt2`,
            role: 'user',
            isApproved: true,
        });

        // Same plaintext, but hashes should differ due to unique salts
        expect(user1.password).not.toBe(user2.password);
        // Both should still validate
        expect(await user1.validatePassword('SamePassword1!')).toBe(true);
        expect(await user2.validatePassword('SamePassword1!')).toBe(true);
    });

    test('re-hashes password on update', async () => {
        const user = await User.create({
            username: `${P}_update`,
            email: `${P}_update@test.com`,
            password: 'OldPass1!',
            displayName: `${P} Update`,
            role: 'user',
            isApproved: true,
        });

        const oldHash = user.password;
        await user.update({ password: 'NewPass2!' });
        await user.reload();

        expect(user.password).not.toBe('NewPass2!');
        expect(user.password).not.toBe(oldHash);
        expect(await user.validatePassword('NewPass2!')).toBe(true);
        expect(await user.validatePassword('OldPass1!')).toBe(false);
    });
});
