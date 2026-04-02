const express = require('express');
const router = express.Router();
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');

router.use(requireAuth);

// POST /api/2fa/setup — Generate secret and QR code
router.post('/setup', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA is already enabled.' });
        }

        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.email || user.username, 'Bizcarder', secret);
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        // Store encrypted secret (not yet enabled)
        await user.update({ twoFactorSecret: encrypt(secret) });

        res.json({ qrCodeUrl, secret }); // secret shown for manual entry
    } catch (error) {
        res.status(500).json({ error: error.message });
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

        const isValid = authenticator.verify({ token, secret });
        if (!isValid) return res.status(400).json({ error: 'Invalid token.' });

        await user.update({ twoFactorEnabled: true });
        res.json({ message: '2FA enabled successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/2fa/disable — Disable 2FA
router.post('/disable', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required to disable 2FA.' });

        const user = await User.findByPk(req.user.id);
        const secret = decrypt(user.twoFactorSecret);

        const isValid = authenticator.verify({ token, secret });
        if (!isValid) return res.status(400).json({ error: 'Invalid token.' });

        await user.update({ twoFactorEnabled: false, twoFactorSecret: null });
        res.json({ message: '2FA disabled.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
