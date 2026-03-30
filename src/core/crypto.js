const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a plaintext string or buffer.
 * @param {string|Buffer} data - Data to encrypt
 * @param {Buffer} key - 256-bit (32 byte) key
 * @returns {Buffer} - The IV + AuthTag + Ciphertext packed together
 */
function encrypt(data, key) {
    if (key.length !== 32) {
        throw new Error('Key must be exactly 32 bytes for AES-256');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

    const encrypted = Buffer.concat([cipher.update(bufferData), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Pack: [IV (12)] + [AuthTag (16)] + [Ciphertext (...)]
    return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypts a packed buffer.
 * @param {Buffer} packedBuffer - [IV (12)] + [AuthTag (16)] + [Ciphertext (...)]
 * @param {Buffer} key - 256-bit (32 byte) key
 * @returns {Buffer} - Decrypted plaintext as a Buffer
 */
function decrypt(packedBuffer, key) {
    if (key.length !== 32) {
        throw new Error('Key must be exactly 32 bytes for AES-256');
    }

    if (packedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Invalid payload length');
    }

    const iv = packedBuffer.subarray(0, IV_LENGTH);
    const authTag = packedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = packedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
};
