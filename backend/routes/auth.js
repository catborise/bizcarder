const express = require('express');
const passport = require('passport');
const { User, SystemSetting } = require('../models');
const { authLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { sendWelcomeEmail } = require('../utils/mailer');
const router = express.Router();

// ============== SHIBBOLETH (SAML) AUTHENTICATION ==============

// Giriş Başlatma
// Kullanıcıyı IdP giriş sayfasına yönlendirir.
router.get('/login', authLimiter, (req, res, next) => {
    // SAML stratejisi yapılandırılmamışsa (Geliştirme ortamı vs.)
    // passport.authenticate doğrudan hata fırlatır, bu yüzden önce kontrol ediyoruz.
    const isSamlConfigured = passport._strategies && passport._strategies.saml;

    if (!isSamlConfigured) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const message = 'Kurumsal giriş (SAML) şu anda aktif değil. Lütfen yönetici hesabınızla yerel giriş yapın.';
        console.warn('[AUTH] SAML login attempted but strategy not configured. Redirecting to login with error.');
        return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
    }

    return passport.authenticate('saml', { failureRedirect: '/auth/login/fail' })(req, res, next);
});

// IdP'den Dönüş (ACS URL)
// Başarılı girişten sonra IdP buraya POST isteği atar.
router.post(
    '/login/callback',
    passport.authenticate('saml', {
        failureRedirect: '/auth/login/fail',
        failureFlash: true,
    }),
    (req, res) => {
        // Session fixation koruması: login sonrası session ID'yi yenile
        const user = req.user;
        req.session.regenerate((err) => {
            if (err) console.error('SAML session regenerate error:', err);
            req.logIn(user, (err) => {
                if (err) console.error('SAML re-login error:', err);
                req.session.save((err) => {
                    if (err) console.error('SAML callback session save error:', err);
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                    res.redirect(`${frontendUrl}/`);
                });
            });
        });
    },
);

// Giriş Başarısızlığı Durumu
router.get('/login/fail', (req, res) => {
    const messages = req.flash('error');
    const message = messages.length > 0 ? messages[0] : 'Kurumsal giriş başarısız oldu.';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.warn('[SAML AUTH FAIL] Redirecting to frontend with error:', message);

    // Organizasyon kısıtlaması nedeniyle reddedildiyse, özel sayfaya yönlendir
    if (message.includes('Organizasyon kısıtlaması') || message.includes('giriş yetkiniz')) {
        return res.redirect(`${frontendUrl}/access-denied?message=${encodeURIComponent(message)}`);
    }

    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
});

// SAML Metadata Endpoint (IdP yetkilendirmesi için)
// Bu rota reverse proxy (Caddy/Nginx) tarafından /auth/* kapsamında olduğu için otomatik yönlendirilir.
router.get('/metadata.xml', (req, res) => {
    try {
        const strategy = passport.samlStrategy || (passport._strategies && passport._strategies.saml);
        if (!strategy) {
            return res.status(404).send('SAML stratejisi aktif değil.');
        }

        const metadata = strategy.generateServiceProviderMetadata(
            process.env.SAML_DECRYPTION_CERT || null,
            process.env.SAML_SIGNING_CERT || null,
        );

        res.type('application/xml');
        res.status(200).send(metadata);
    } catch (err) {
        console.error('SAML Metadata Error:', err);
        res.status(500).send('Metadata oluşturulamadı.');
    }
});

// ============== LOCAL AUTHENTICATION ==============

// Yerel Kullanıcı Girişi
router.post('/local/login', authLimiter, passport.authenticate('local', { failureMessage: true }), (req, res) => {
    // Sadece adminler yerel giriş yapabilir
    if (req.user.role !== 'admin') {
        req.logout((err) => {
            if (err) console.error('Logout error:', err);
        });
        return res.status(403).json({
            errorCode: 'LOCAL_LOGIN_FORBIDDEN',
        });
    }

    // Onay durumunu kontrol et
    if (req.user.isApproved === false) {
        req.logout((err) => {
            if (err) console.error('Logout error:', err);
        });
        return res.status(403).json({
            errorCode: 'ACCOUNT_NOT_APPROVED',
        });
    }

    // 2FA kontrolü
    if (req.user.twoFactorEnabled) {
        const { token: totpToken } = req.body;
        if (!totpToken) {
            // Don't complete login yet — tell client to ask for TOTP
            req.logout((err) => {});
            return res.status(206).json({
                requires2FA: true,
                errorCode: 'REQUIRES_2FA',
            });
        }

        const secret = decrypt(req.user.twoFactorSecret);
        const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: totpToken, window: 1 });
        if (!isValid) {
            req.logout((err) => {});
            return res.status(401).json({ errorCode: 'INVALID_2FA_TOKEN' });
        }
    }

    // Session fixation koruması: login sonrası session ID'yi yenile
    const user = req.user;
    req.session.regenerate((err) => {
        if (err) {
            console.error('Session regenerate error:', err);
            return res.status(500).json({ errorCode: 'SESSION_CREATE_FAILED' });
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error('Re-login error:', err);
                return res.status(500).json({ errorCode: 'SESSION_CREATE_FAILED' });
            }
            req.session.save((err) => {
                if (err) console.error('Session save error:', err);
                res.json({
                    success: true,
                    message: 'Giriş başarılı',
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        displayName: user.displayName,
                        role: user.role,
                    },
                });
            });
        });
    });
});

// Yerel Kullanıcı Kaydı
router.post(
    '/local/register',
    authLimiter,
    [
        body('username').trim().isLength({ min: 3 }).withMessage('USERNAME_TOO_SHORT'),
        body('email').isEmail().withMessage('INVALID_EMAIL'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('PASSWORD_TOO_SHORT')
            .matches(/[A-Z]/)
            .withMessage('PASSWORD_NEEDS_UPPERCASE')
            .matches(/[a-z]/)
            .withMessage('PASSWORD_NEEDS_LOWERCASE')
            .matches(/[0-9]/)
            .withMessage('PASSWORD_NEEDS_DIGIT'),
        body('displayName').optional().trim().isLength({ max: 50 }).withMessage('DISPLAY_NAME_TOO_LONG'),
    ],
    validate,
    async (req, res) => {
        try {
            // Kayıt yeteneği kontrolü
            const regSetting = await SystemSetting.findByPk('allowPublicRegistration');
            const isRegistrationAllowed = regSetting ? regSetting.value === 'true' : true; // Varsayılan true

            if (!isRegistrationAllowed) {
                return res.status(403).json({
                    errorCode: 'REGISTRATION_DISABLED',
                });
            }

            const { username, email, password, displayName } = req.body;

            // Gerekli alanları kontrol et
            if (!username || !email || !password) {
                return res.status(400).json({
                    errorCode: 'MISSING_REQUIRED_FIELDS',
                });
            }

            // Kullanıcı zaten var mı kontrol et
            const existingUser = await User.findOne({
                where: {
                    [require('sequelize').Op.or]: [{ username: username }, { email: email }],
                },
            });

            if (existingUser) {
                return res.status(400).json({
                    errorCode: 'USER_ALREADY_EXISTS',
                });
            }

            // Yeni kullanıcı oluştur (isApproved varsayılan olarak false)
            const user = await User.create({
                username,
                email,
                password,
                displayName: displayName || username,
                role: 'user',
                isApproved: false,
            });

            // Send welcome email (non-blocking)
            sendWelcomeEmail(user).catch(() => {});

            // Kullanıcıya onay beklediğini bildir (otomatik giriş yapma)
            res.status(201).json({
                success: true,
                message: 'Kayıt başarılı. Hesabınız yönetici onayı bekliyor.',
                pendingApproval: true,
            });
        } catch (error) {
            console.error('Kayıt hatası:', error);
            res.status(500).json({ errorCode: 'REGISTRATION_FAILED' });
        }
    },
);

// ============== COMMON ROUTES ==============

// Çıkış Yap
router.post('/logout', (req, res) => {
    const isSamlUser = !!req.user?.shibbolethId;
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Çıkış yapılırken hata oluştu.' });
        }

        // Eğer SAML kullanıcısı ise ve bir logout URL tanımlanmışsa, frontend'e bildir
        if (isSamlUser && process.env.SAML_LOGOUT_URL) {
            return res.json({
                success: true,
                message: 'Başarıyla çıkış yapıldı.',
                logoutUrl: process.env.SAML_LOGOUT_URL,
            });
        }

        res.json({ success: true, message: 'Başarıyla çıkış yapıldı.' });
    });
});

// Şifre Değiştirme (Kullanıcı Kendi Şifresini Değiştirir)
router.put('/change-password', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ errorCode: 'AUTH_REQUIRED' });
    }

    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ errorCode: 'USER_NOT_FOUND' });
        }

        // Mevcut şifreyi doğrula
        // Not: Shibboleth kullanıcılarının şifresi olmayabilir, onlara bu işlemi yaptırmamalıyız.
        if (!user.password) {
            return res.status(400).json({ errorCode: 'EXTERNAL_AUTH_NO_PASSWORD' });
        }

        const isValid = await user.validatePassword(currentPassword);
        if (!isValid) {
            return res.status(400).json({ errorCode: 'CURRENT_PASSWORD_WRONG' });
        }

        // Şifre politikası kontrolü
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ errorCode: 'PASSWORD_TOO_SHORT' });
        }
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({ errorCode: 'PASSWORD_COMPLEXITY_FAILED' });
        }

        // Yeni şifreyi kaydet (Model hook'u hashleyecek)
        user.password = newPassword;
        await user.save();

        res.json({ success: true, messageCode: 'PASSWORD_CHANGED' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ errorCode: 'PASSWORD_CHANGE_FAILED' });
    }
});

const { encrypt, decrypt } = require('../utils/encryption');
const speakeasy = require('speakeasy');

// Kullanıcı Bilgisi (Frontend'in oturum kontrolü için)
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            isAuthenticated: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                displayName: req.user.displayName,
                role: req.user.role,
                shibbolethId: req.user.shibbolethId,
                aiOcrEnabled: req.user.aiOcrEnabled,
                aiOcrProvider: req.user.aiOcrProvider,
                hasAiApiKey: !!req.user.aiOcrApiKey,
                isApproved: req.user.isApproved,
                trashRetentionDays: req.user.trashRetentionDays,
                twoFactorEnabled: req.user.twoFactorEnabled || false,
            },
        });
    } else {
        res.status(401).json({ isAuthenticated: false });
    }
});

// Kullanıcı Bilgilerini Güncelle (AI Ayarları Dahil)
router.put('/profile', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ errorCode: 'AUTH_REQUIRED' });
    }

    try {
        const { displayName, email, trashRetentionDays, aiOcrEnabled, aiOcrProvider, aiOcrApiKey } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ errorCode: 'USER_NOT_FOUND' });
        }

        const updateData = {};
        if (displayName !== undefined) updateData.displayName = displayName;

        // E-posta güncelleme ve benzersizlik kontrolü
        if (email !== undefined && email !== user.email) {
            // Basit e-posta doğrulama
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ errorCode: 'INVALID_EMAIL' });
            }

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ errorCode: 'EMAIL_ALREADY_EXISTS' });
            }
            updateData.email = email;
        }

        if (trashRetentionDays !== undefined) {
            const days = parseInt(trashRetentionDays);
            if (isNaN(days) || days < 1 || days > 365) {
                return res.status(400).json({ errorCode: 'INVALID_RETENTION_DAYS' });
            }
            updateData.trashRetentionDays = days;
        }

        if (aiOcrEnabled !== undefined) updateData.aiOcrEnabled = aiOcrEnabled;
        if (aiOcrProvider !== undefined) updateData.aiOcrProvider = aiOcrProvider;

        // API Key geldiyse şifrele ve kaydet (boş geldiyse silme, sadece değişim varsa)
        if (aiOcrApiKey && aiOcrApiKey.trim() !== '') {
            updateData.aiOcrApiKey = encrypt(aiOcrApiKey);
        }

        await user.update(updateData);

        res.json({
            success: true,
            messageCode: 'PROFILE_UPDATED',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                trashRetentionDays: user.trashRetentionDays,
                aiOcrEnabled: user.aiOcrEnabled,
                aiOcrProvider: user.aiOcrProvider,
                hasAiApiKey: !!user.aiOcrApiKey,
            },
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ errorCode: 'PROFILE_UPDATE_FAILED' });
    }
});

// Kayıt konfigürasyonunu getir (Public)
router.get('/config', async (req, res) => {
    try {
        const regSetting = await SystemSetting.findByPk('allowPublicRegistration');
        const isRegistrationAllowed = regSetting ? regSetting.value === 'true' : true;

        // SAML stratejisinin yüklü olup olmadığını kontrol et
        const samlEnabled = !!(passport._strategies && passport._strategies.saml);

        res.json({
            allowPublicRegistration: isRegistrationAllowed,
            samlEnabled: samlEnabled,
        });
    } catch (error) {
        res.json({
            allowPublicRegistration: true,
            samlEnabled: false,
        }); // Hata durumunda varsayılan değerler
    }
});

module.exports = router;
