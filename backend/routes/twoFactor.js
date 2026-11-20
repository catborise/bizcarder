const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { encrypt, decrypt } = require('../utils/encryption');
const { logger, logAction } = require('../utils/logger');

router.use(requireAuth);

// POST /api/2fa/setup — Generate secret and QR code
router.post('/setup', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || user.twoFactorEnabled) {
            return res.status(400).json({ errorCode: 'TWO_FACTOR_SETUP_FAILED' });
        }

        const secretObj = speakeasy.generateSecret({
            name: `Bizcarder (${user.email || user.username})`,
            issuer: 'Bizcarder',
        });
        const encryptedSecret = encrypt(secretObj.base32);
        if (!encryptedSecret) {
            logger.error('2FA setup failed: CRM_API_ENCRYPTION_KEY is missing or encryption failed.');
            return res.status(500).json({ errorCode: 'TWO_FACTOR_SETUP_FAILED' });
        }

        const qrCodeUrl = await QRCode.toDataURL(secretObj.otpauth_url);

        // Store encrypted secret (not yet enabled)
        await user.update({ twoFactorSecret: encryptedSecret });

        res.json({ qrCodeUrl, secret: secretObj.base32 });
    } catch (error) {
        logger.error('2FA setup error:', error);
        res.status(500).json({ errorCode: 'TWO_FACTOR_SETUP_FAILED' });
    }
});

// POST /api/2fa/verify — Verify token and enable 2FA
router.post('/verify', authLimiter, async (req, res) => {
    try {
        const { token } = req.body || {};
        if (!token) return res.status(400).json({ errorCode: 'TOKEN_REQUIRED' });

        const user = await User.findByPk(req.user.id);
        const secret = user ? decrypt(user.twoFactorSecret) : null;
        if (!secret) return res.status(400).json({ errorCode: 'TWO_FACTOR_SETUP_FAILED' });

        const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(token), window: 1 });
        if (!isValid) return res.status(400).json({ errorCode: 'INVALID_TOKEN' });

        await user.update({ twoFactorEnabled: true });
        await logAction({
            action: 'TWO_FACTOR_ENABLE',
            details: `2FA etkinleştirildi: ${user.username || user.email}`,
            req,
        });
        res.json({ messageCode: 'TWO_FACTOR_ENABLED', message: '2FA enabled successfully.' });
    } catch (error) {
        logger.error('2FA verify error:', error);
        res.status(500).json({ errorCode: 'TWO_FACTOR_VERIFY_FAILED' });
    }
});

// POST /api/2fa/disable — Disable 2FA
router.post('/disable', authLimiter, async (req, res) => {
    try {
        const { token } = req.body || {};
        if (!token) return res.status(400).json({ errorCode: 'TOKEN_REQUIRED' });

        const user = await User.findByPk(req.user.id);
        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ errorCode: 'TWO_FACTOR_DISABLE_FAILED' });
        }

        const secret = decrypt(user.twoFactorSecret);
        if (!secret) {
            return res.status(400).json({ errorCode: 'TWO_FACTOR_DISABLE_FAILED' });
        }

        const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(token), window: 1 });
        if (!isValid) return res.status(400).json({ errorCode: 'INVALID_TOKEN' });

        await user.update({ twoFactorEnabled: false, twoFactorSecret: null });
        await logAction({
            action: 'TWO_FACTOR_DISABLE',
            details: `2FA devre dışı bırakıldı: ${user.username || user.email}`,
            req,
        });
        res.json({ messageCode: 'TWO_FACTOR_DISABLED', message: '2FA disabled.' });
    } catch (error) {
        logger.error('2FA disable error:', error);
        res.status(500).json({ errorCode: 'TWO_FACTOR_DISABLE_FAILED' });
    }
});

module.exports = router;
