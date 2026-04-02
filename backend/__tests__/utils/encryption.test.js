const crypto = require('crypto');

describe('Encryption Utils', () => {
    let encrypt, decrypt;
    beforeAll(() => {
        process.env.CRM_API_ENCRYPTION_KEY = 'test-encryption-key-32chars!!!ab';
        jest.resetModules();
        ({ encrypt, decrypt } = require('../../utils/encryption'));
    });

    test('GCM round-trip returns original text', () => {
        const original = 'my-secret-api-key-12345';
        const encrypted = encrypt(original);
        expect(encrypted).not.toBe(original);
        // GCM format: iv:authTag:ciphertext — exactly 3 colon-separated parts
        const parts = encrypted.split(':');
        expect(parts).toHaveLength(3);
        expect(decrypt(encrypted)).toBe(original);
    });

    test('encrypt(null) returns null', () => { expect(encrypt(null)).toBeNull(); });
    test('encrypt empty string returns null', () => { expect(encrypt('')).toBeNull(); });
    test('decrypt(null) returns null', () => { expect(decrypt(null)).toBeNull(); });

    test('auth tag tampering causes decryption to return null', () => {
        const encrypted = encrypt('sensitive-data');
        const parts = encrypted.split(':');
        // Flip the last two hex chars of the auth tag (middle part)
        const tamperedAuthTag = parts[1].slice(0, -2) + (parts[1].slice(-2) === 'ff' ? '00' : 'ff');
        const tampered = [parts[0], tamperedAuthTag, parts[2]].join(':');
        expect(decrypt(tampered)).toBeNull();
    });

    test('ciphertext tampering causes decryption to return null', () => {
        const encrypted = encrypt('sensitive-data');
        const parts = encrypted.split(':');
        // Flip the last two hex chars of the ciphertext (last part)
        const tamperedCiphertext = parts[2].slice(0, -2) + (parts[2].slice(-2) === 'ff' ? '00' : 'ff');
        const tampered = [parts[0], parts[1], tamperedCiphertext].join(':');
        expect(decrypt(tampered)).toBeNull();
    });

    test('old CBC format (2-part) still decrypts correctly', () => {
        // Generate a known CBC-encrypted value using the same key
        const secret = 'test-encryption-key-32chars!!!ab';
        const key = crypto.createHash('sha256').update(secret).digest();
        const iv = Buffer.from('00000000000000000000000000000001', 'hex'); // 16-byte IV
        const plaintext = 'legacy-api-key-value';
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(plaintext, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const cbcFormatted = iv.toString('hex') + ':' + encrypted.toString('hex');

        // decrypt() should recognise 2-part format and fall back to CBC
        expect(decrypt(cbcFormatted)).toBe(plaintext);
    });

    test('invalid format (4 parts) returns null', () => {
        expect(decrypt('aa:bb:cc:dd')).toBeNull();
    });
});
