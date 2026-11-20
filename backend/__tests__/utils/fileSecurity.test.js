const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    getSafeExtension,
    verifyImageMagicBytes,
    validateUploadedImages,
    removeCardImages,
} = require('../../utils/fileSecurity');

describe('fileSecurity utility', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bizcarder-sec-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    describe('getSafeExtension', () => {
        test('maps allowlisted image MIME types to safe extensions', () => {
            expect(getSafeExtension('image/jpeg')).toBe('.jpg');
            expect(getSafeExtension('image/png')).toBe('.png');
            expect(getSafeExtension('image/gif')).toBe('.gif');
            expect(getSafeExtension('image/webp')).toBe('.webp');
            expect(getSafeExtension('image/x-icon', false)).toBeNull();
            expect(getSafeExtension('image/x-icon', true)).toBe('.ico');
        });

        test('rejects dangerous MIME types (HTML, SVG, JS)', () => {
            expect(getSafeExtension('text/html')).toBeNull();
            expect(getSafeExtension('image/svg+xml')).toBeNull();
            expect(getSafeExtension('application/javascript')).toBeNull();
        });
    });

    describe('verifyImageMagicBytes', () => {
        test('accepts genuine JPEG, PNG, GIF, WebP and ICO files', () => {
            const samples = [
                { name: 'a.jpg', mime: 'image/jpeg', bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]) },
                {
                    name: 'a.png',
                    mime: 'image/png',
                    bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
                },
                { name: 'a.gif', mime: 'image/gif', bytes: Buffer.from('GIF89a\x01\x00') },
                { name: 'a.webp', mime: 'image/webp', bytes: Buffer.from('RIFF\x24\x00\x00\x00WEBP') },
                { name: 'a.ico', mime: 'image/x-icon', bytes: Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]) },
            ];

            for (const s of samples) {
                const filePath = path.join(tmpDir, s.name);
                fs.writeFileSync(filePath, s.bytes);
                expect(verifyImageMagicBytes(filePath, s.mime)).toBe(true);
            }
        });

        test('rejects HTML or SVG payload spoofed as image/jpeg or image/png', () => {
            const htmlFile = path.join(tmpDir, 'spoof.jpg');
            fs.writeFileSync(htmlFile, '<html><script>alert(1)</script></html>');
            expect(verifyImageMagicBytes(htmlFile, 'image/jpeg')).toBe(false);
            expect(verifyImageMagicBytes(htmlFile, 'image/png')).toBe(false);

            const svgFile = path.join(tmpDir, 'spoof.png');
            fs.writeFileSync(svgFile, '<svg onload=alert(1)></svg>');
            expect(verifyImageMagicBytes(svgFile, 'image/png')).toBe(false);
        });
    });

    describe('validateUploadedImages middleware', () => {
        test('deletes spoofed uploaded file and responds 400 INVALID_IMAGE_FILE', () => {
            const spoofPath = path.join(tmpDir, 'evil.jpg');
            fs.writeFileSync(spoofPath, '<script>alert(1)</script>');

            const req = { file: { path: spoofPath, mimetype: 'image/jpeg' } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const next = jest.fn();

            validateUploadedImages(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ errorCode: 'INVALID_IMAGE_FILE' });
            expect(fs.existsSync(spoofPath)).toBe(false);
        });

        test('calls next() for valid PNG upload', () => {
            const validPath = path.join(tmpDir, 'ok.png');
            fs.writeFileSync(validPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));

            const req = { files: { frontImage: [{ path: validPath, mimetype: 'image/png' }] } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            validateUploadedImages(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(fs.existsSync(validPath)).toBe(true);
        });
    });

    describe('removeCardImages', () => {
        test('ignores path traversal attempts outside uploads directory', () => {
            const outsideFile = path.join(tmpDir, 'keep-me.txt');
            fs.writeFileSync(outsideFile, 'safe');

            removeCardImages({
                frontImageUrl: `/uploads/../../../../${outsideFile}`,
                backImageUrl: 'https://evil.example/a.jpg',
                logoUrl: null,
            });

            expect(fs.existsSync(outsideFile)).toBe(true);
        });
    });
});
