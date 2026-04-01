const crypto = require('crypto');

const IV_LENGTH = 16;

// Derive a proper 32-byte key using SHA-256 hash of the secret
// This avoids the weak padEnd() approach and works with any length input
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
        const cipher = crypto.createCipheriv('aes-256-cbc', DERIVED_KEY, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        console.error('Encryption error:', error.message);
        return null;
    }
}

function decrypt(text) {
    if (!text || !DERIVED_KEY) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', DERIVED_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Decryption error:', error.message);
        return null;
    }
}

module.exports = { encrypt, decrypt };
