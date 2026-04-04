const supertest = require('supertest');
const app = require('../../server');
const path = require('path');
const { createTestUser, setupSuite, getAuthAgent } = require('../helpers');

const P = 'upload'; // unique prefix for this suite

// Minimal valid image buffers for testing
const JPEG_BUFFER = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
]);

// Minimal valid PNG (8-byte signature + IHDR + IEND)
const PNG_BUFFER = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND
    0x44, 0xAE, 0x42, 0x60, 0x82
]);

// Minimal valid GIF89a
const GIF_BUFFER = Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
    0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
    0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00,
    0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
]);

// Minimal valid WebP (RIFF header)
const WEBP_BUFFER = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // file size
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x20, // VP8
    0x18, 0x00, 0x00, 0x00, // chunk size
    0x30, 0x01, 0x00, 0x9D, 0x01, 0x2A, 0x01, 0x00,
    0x01, 0x00, 0x01, 0x40, 0x25, 0xA4, 0x00, 0x03,
    0x70, 0x00, 0xFE, 0xFB, 0x94, 0x00, 0x00
]);

describe('File Upload Middleware (Multer)', () => {
    let user, agent;

    beforeAll(async () => {
        await setupSuite(P);
        user = await createTestUser({ username: `${P}_user`, email: `${P}_user@test.com` });
        agent = await getAuthAgent(user);
    });

    // The POST /api/cards endpoint uses multer with the MIME whitelist and 5MB limit.
    // We test upload behavior through this endpoint.

    test('accepts valid JPEG image upload', async () => {
        const res = await agent
            .post('/api/cards')
            .field('firstName', `${P}_JpegCard`)
            .field('lastName', 'Test')
            .field('email', `${P}_jpeg@test.com`)
            .attach('frontImage', JPEG_BUFFER, 'test.jpg');

        // 201 means multer accepted the file and the card was created
        expect(res.status).toBe(201);
    });

    test('accepts PNG image upload', async () => {
        const res = await agent
            .post('/api/cards')
            .field('firstName', `${P}_PngCard`)
            .field('lastName', 'Test')
            .field('email', `${P}_png@test.com`)
            .attach('frontImage', PNG_BUFFER, 'test.png');

        expect(res.status).toBe(201);
    });

    test('accepts GIF image upload', async () => {
        const res = await agent
            .post('/api/cards')
            .field('firstName', `${P}_GifCard`)
            .field('lastName', 'Test')
            .field('email', `${P}_gif@test.com`)
            .attach('frontImage', GIF_BUFFER, 'test.gif');

        expect(res.status).toBe(201);
    });

    test('accepts WebP image upload', async () => {
        const res = await agent
            .post('/api/cards')
            .field('firstName', `${P}_WebpCard`)
            .field('lastName', 'Test')
            .field('email', `${P}_webp@test.com`)
            .attach('frontImage', WEBP_BUFFER, 'test.webp');

        expect(res.status).toBe(201);
    });

    test('rejects non-image file upload', async () => {
        const textBuffer = Buffer.from('This is not an image file');
        const res = await agent
            .post('/api/cards')
            .field('firstName', `${P}_TextCard`)
            .field('lastName', 'Test')
            .field('email', `${P}_text@test.com`)
            .attach('frontImage', textBuffer, 'malicious.txt');

        // Multer fileFilter rejects non-image MIME types with an error
        expect(res.status).toBe(500);
    });

    test('rejects file exceeding 5MB size limit', async () => {
        // Create a buffer slightly over 5MB
        const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);
        // Write JPEG header so MIME type passes
        JPEG_BUFFER.copy(oversizedBuffer);

        const res = await agent
            .post('/api/cards')
            .field('firstName', `${P}_BigCard`)
            .field('lastName', 'Test')
            .field('email', `${P}_big@test.com`)
            .attach('frontImage', oversizedBuffer, 'huge.jpg');

        // Multer should reject with a file too large error
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});
