const crypto = require('crypto');
const { encrypt, decrypt } = require('../../src/core/crypto');
const { encodeBytesToImage, decodeImageToBytes } = require('../../src/core/imageCoder');

describe('MailTalker Core Protocol', () => {
    it('crypto: should encrypt and decrypt text successfully', () => {
        const key = crypto.randomBytes(32);
        const plainText = 'The quick brown fox jumps over the lazy dog! 12345';

        const cipherBuffer = encrypt(plainText, key);
        const decryptedBuffer = decrypt(cipherBuffer, key);

        expect(decryptedBuffer.toString('utf8')).toBe(plainText);
    });

    it('crypto: should fail decryption with wrong key', () => {
        const key1 = crypto.randomBytes(32);
        const key2 = crypto.randomBytes(32);
        const plainText = 'Top secret';

        const cipherBuffer = encrypt(plainText, key1);

        expect(() => decrypt(cipherBuffer, key2)).toThrow();
    });

    it('imageCoder: should encode bytes to image and decode exactly', async () => {
        const originalBytes = crypto.randomBytes(1245); // Random length byte array

        const imagePngBuffer = await encodeBytesToImage(originalBytes);

        // Ensure it generated a PNG magic sequence
        expect(imagePngBuffer.subarray(0, 4).toString('hex')).toBe('89504e47');

        const decodedBytes = await decodeImageToBytes(imagePngBuffer);

        expect(decodedBytes.equals(originalBytes)).toBe(true);
    });

    it('end-to-end: text -> encrypt -> image -> decode -> decrypt -> text', async () => {
        const key = crypto.randomBytes(32);
        const message = 'MailTalker: Cyberpunk Encrypted Email Tunneled Protocol';

        // 1. Encrypt text to bytes
        const encryptedBytes = encrypt(message, key);

        // 2. Encode bytes to PNG image
        const imagePngBuffer = await encodeBytesToImage(encryptedBytes);

        // --- (Image travels via IMAP/SMTP here) ---

        // 3. Decode PNG image to bytes
        const extractedBytes = await decodeImageToBytes(imagePngBuffer);

        // 4. Decrypt bytes to text
        const decryptedBytes = decrypt(extractedBytes, key);

        expect(decryptedBytes.toString('utf8')).toBe(message);
    });
});
