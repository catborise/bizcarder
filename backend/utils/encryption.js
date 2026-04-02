const crypto = require('crypto');

const IV_LENGTH = 12; // GCM recommended: 12 bytes
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

// Derive a proper 32-byte key using SHA-256 hash of the secret
function deriveKey(secret) {
    return crypto.createHash('sha256').update(secret).digest();
}

// Validate encryption key at module load time
const RAW_KEY = process.env.CRM_API_ENCRYPTION_KEY;
let DERIVED_KEY = null;

if (RAW_KEY) {
    DERIVED_KEY = deriveKey(RAW_KEY);
} else {
    console.warn('[ENCRYPTION] CRM_API_ENCRYPTION_KEY is not set. encrypt/decrypt will return null.');
}

function encrypt(text) {
    if (!text || !DERIVED_KEY) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-gcm', DERIVED_KEY, iv);
        let encrypted = cipher.update(text, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();
        // Format: iv:authTag:ciphertext (all hex)
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        console.error('Encryption error:', error.message);
        return null;
    }
}

function decrypt(text) {
    if (!text || !DERIVED_KEY) return null;
    try {
        const parts = text.split(':');
        // Support both old CBC format (iv:ciphertext) and new GCM format (iv:authTag:ciphertext)
        if (parts.length === 2) {
            // Legacy CBC format — decrypt with CBC for backward compatibility
            return decryptCBC(parts[0], parts[1]);
        }
        if (parts.length !== 3) return null;
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = Buffer.from(parts[2], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', DERIVED_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        console.error('Decryption error:', error.message);
        return null;
    }
}

// Backward compatibility: decrypt old CBC-encrypted values
function decryptCBC(ivHex, ciphertextHex) {
    try {
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(ciphertextHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', DERIVED_KEY, iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        console.error('Legacy CBC decryption error:', error.message);
        return null;
    }
}

module.exports = { encrypt, decrypt };
