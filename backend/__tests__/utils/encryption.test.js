describe('Encryption Utils', () => {
    let encrypt, decrypt;
    beforeAll(() => {
        process.env.CRM_API_ENCRYPTION_KEY = 'test-encryption-key-32chars!!!ab';
        jest.resetModules();
        ({ encrypt, decrypt } = require('../../utils/encryption'));
    });

    test('encrypt and decrypt round-trip returns original text', () => {
        const original = 'my-secret-api-key-12345';
        const encrypted = encrypt(original);
        expect(encrypted).not.toBe(original);
        expect(encrypted).toContain(':');
        expect(decrypt(encrypted)).toBe(original);
    });
    test('encrypt(null) returns null', () => { expect(encrypt(null)).toBeNull(); });
    test('encrypt empty string returns null', () => { expect(encrypt('')).toBeNull(); });
    test('decrypt(null) returns null', () => { expect(decrypt(null)).toBeNull(); });
    test('decrypt with tampered ciphertext returns null', () => {
        const encrypted = encrypt('test-data');
        const tampered = encrypted.replace(/[a-f0-9]{2}$/, 'xx');
        expect(decrypt(tampered)).toBeNull();
    });
});
