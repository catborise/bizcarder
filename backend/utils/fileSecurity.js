const fs = require('fs');
const path = require('path');

const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');

const IMAGE_MIME_TO_EXT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
};

const BRANDING_MIME_TO_EXT = {
    ...IMAGE_MIME_TO_EXT,
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico',
};

/**
 * Derive a safe file extension strictly from an allowlisted MIME type
 * (never from the untrusted client filename).
 */
function getSafeExtension(mimetype, allowIcon = false) {
    const map = allowIcon ? BRANDING_MIME_TO_EXT : IMAGE_MIME_TO_EXT;
    return map[mimetype] || null;
}

/**
 * Inspect leading magic bytes of an uploaded file to ensure it genuinely matches
 * its declared image MIME type (prevents HTML/SVG upload spoofing).
 */
function verifyImageMagicBytes(filePath, mimetype) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(12);
        const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
        fs.closeSync(fd);

        if (bytesRead < 4) return false;

        switch (mimetype) {
            case 'image/jpeg':
                return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
            case 'image/png':
                return (
                    bytesRead >= 8 &&
                    buf[0] === 0x89 &&
                    buf[1] === 0x50 &&
                    buf[2] === 0x4e &&
                    buf[3] === 0x47 &&
                    buf[4] === 0x0d &&
                    buf[5] === 0x0a &&
                    buf[6] === 0x1a &&
                    buf[7] === 0x0a
                );
            case 'image/gif':
                return (
                    bytesRead >= 6 &&
                    buf[0] === 0x47 &&
                    buf[1] === 0x49 &&
                    buf[2] === 0x46 &&
                    buf[3] === 0x38 &&
                    (buf[4] === 0x37 || buf[4] === 0x39) &&
                    buf[5] === 0x61
                );
            case 'image/webp':
                return (
                    bytesRead >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'
                );
            case 'image/x-icon':
            case 'image/vnd.microsoft.icon':
                return buf[0] === 0x00 && buf[1] === 0x00 && (buf[2] === 0x01 || buf[2] === 0x02) && buf[3] === 0x00;
            default:
                return false;
        }
    } catch {
        return false;
    }
}

/**
 * Remove one or more Multer-uploaded files from disk safely.
 */
function cleanupUploadedFiles(req) {
    const paths = [];
    if (req.file?.path) paths.push(req.file.path);
    if (req.files) {
        const fileList = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        for (const f of fileList) {
            if (f?.path) paths.push(f.path);
        }
    }
    for (const p of paths) {
        try {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        } catch {
            // ignore unlink errors
        }
    }
}

/**
 * Express middleware that verifies magic bytes of all Multer-uploaded image files.
 * Deletes any spoofed files and rejects with 400.
 */
function validateUploadedImages(req, res, next) {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
        const list = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        files.push(...list);
    }

    for (const file of files) {
        if (!verifyImageMagicBytes(file.path, file.mimetype)) {
            cleanupUploadedFiles(req);
            return res.status(400).json({ errorCode: 'INVALID_IMAGE_FILE' });
        }
    }

    return next();
}

/**
 * Safely delete uploaded image files referenced by one or more BusinessCard records.
 * Guards against path traversal by verifying resolved paths stay inside UPLOADS_ROOT.
 */
function removeCardImages(cardOrCards) {
    const cards = Array.isArray(cardOrCards) ? cardOrCards : [cardOrCards];
    for (const card of cards) {
        if (!card) continue;
        for (const field of ['frontImageUrl', 'backImageUrl', 'logoUrl']) {
            const relUrl = card[field];
            if (typeof relUrl !== 'string' || !relUrl.startsWith('/uploads/')) continue;
            const fileName = relUrl.slice('/uploads/'.length);
            const resolved = path.resolve(UPLOADS_ROOT, fileName);
            if (!resolved.startsWith(UPLOADS_ROOT + path.sep)) continue;
            try {
                if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
            } catch {
                // ignore unlink errors
            }
        }
    }
}

module.exports = {
    IMAGE_MIME_TO_EXT,
    BRANDING_MIME_TO_EXT,
    getSafeExtension,
    verifyImageMagicBytes,
    cleanupUploadedFiles,
    validateUploadedImages,
    removeCardImages,
};
