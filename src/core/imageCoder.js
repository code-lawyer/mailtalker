const { Jimp } = require('jimp');

const MAGIC_HEADER = Buffer.from('MTXX');

/**
 * Encodes a byte buffer into a PNG image.
 * Every 3 bytes of payload = 1 pixel (R, G, B). Alpha is always 255.
 * Format: [MAGIC_HEADER(4)] [PayloadLength(4)] [Payload(...)]
 */
async function encodeBytesToImage(payloadBuffer) {
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(payloadBuffer.length, 0);

    const data = Buffer.concat([MAGIC_HEADER, lengthBuffer, payloadBuffer]);

    const totalPixels = Math.ceil(data.length / 3);
    const width = Math.ceil(Math.sqrt(totalPixels));
    const height = Math.ceil(totalPixels / width);

    const image = await new Jimp({ width, height, color: 0x000000ff });

    const bitmapData = image.bitmap.data;
    let byteIndex = 0;

    for (let i = 0; i < bitmapData.length; i += 4) {
        if (byteIndex >= data.length) break;
        bitmapData[i]     = data[byteIndex++]; // R
        bitmapData[i + 1] = byteIndex < data.length ? data[byteIndex++] : 0; // G
        bitmapData[i + 2] = byteIndex < data.length ? data[byteIndex++] : 0; // B
        bitmapData[i + 3] = 255; // A
    }

    return await image.getBuffer('image/png');
}

/**
 * Decodes a MailTalker PNG image back to the exact encrypted byte buffer.
 * Optimized: reads directly from bitmap without intermediate array.
 */
async function decodeImageToBytes(imageBuffer) {
    const image = await Jimp.read(imageBuffer);
    const bitmapData = image.bitmap.data;
    const pixelCount = bitmapData.length / 4;

    // Pre-allocate buffer for all RGB bytes
    const totalBytes = pixelCount * 3;
    const data = Buffer.allocUnsafe(totalBytes);

    let writeIdx = 0;
    for (let i = 0; i < bitmapData.length; i += 4) {
        data[writeIdx++] = bitmapData[i];     // R
        data[writeIdx++] = bitmapData[i + 1]; // G
        data[writeIdx++] = bitmapData[i + 2]; // B
    }

    // Verify magic header
    if (!data.subarray(0, 4).equals(MAGIC_HEADER)) {
        throw new Error('Not a valid MailTalker image (Magic header mismatch)');
    }

    const payloadLength = data.readUInt32BE(4);

    if (payloadLength > data.length - 8) {
        throw new Error('Invalid payload length in image header');
    }

    return data.subarray(8, 8 + payloadLength);
}

module.exports = {
    encodeBytesToImage,
    decodeImageToBytes
};
