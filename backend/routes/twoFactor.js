const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const { logger } = require('../utils/logger');

router.use(requireAuth);

// POST /api/2fa/setup — Generate secret and QR code
router.post('/setup', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA is already enabled.' });
        }

        const secretObj = speakeasy.generateSecret({
            name: `Bizcarder (${user.email || user.username})`,
            issuer: 'Bizcarder',
        });
        const qrCodeUrl = await QRCode.toDataURL(secretObj.otpauth_url);

        // Store encrypted secret (not yet enabled)
        await user.update({ twoFactorSecret: encrypt(secretObj.base32) });

        res.json({ qrCodeUrl, secret: secretObj.base32 });
    } catch (error) {
        logger.error('2FA setup error:', error);
        res.status(500).json({ error: '2FA kurulumu sırasında hata oluştu.' });
    }
});

// POST /api/2fa/verify — Verify token and enable 2FA
router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required.' });

        const user = await User.findByPk(req.user.id);
        const secret = decrypt(user.twoFactorSecret);
        if (!secret) return res.status(400).json({ error: '2FA setup not initiated.' });

        const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
        if (!isValid) return res.status(400).json({ error: 'Invalid token.' });

        await user.update({ twoFactorEnabled: true });
        res.json({ message: '2FA enabled successfully.' });
    } catch (error) {
        logger.error('2FA verify error:', error);
        res.status(500).json({ error: '2FA doğrulama sırasında hata oluştu.' });
    }
});

// POST /api/2fa/disable — Disable 2FA
router.post('/disable', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required to disable 2FA.' });

        const user = await User.findByPk(req.user.id);
        const secret = decrypt(user.twoFactorSecret);

        const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
        if (!isValid) return res.status(400).json({ error: 'Invalid token.' });

        await user.update({ twoFactorEnabled: false, twoFactorSecret: null });
        res.json({ message: '2FA disabled.' });
    } catch (error) {
        logger.error('2FA disable error:', error);
        res.status(500).json({ error: '2FA devre dışı bırakılırken hata oluştu.' });
    }
});

module.exports = router;
