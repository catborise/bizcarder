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
router.post('/login/callback',
    passport.authenticate('saml', {
        failureRedirect: '/auth/login/fail',
        failureFlash: true
    }),
    (req, res) => {
        // Başarılı giriş
        // Race condition'ı önlemek için session'ın veritabanına yazılmasını bekle, sonra yönlendir
        req.session.save((err) => {
            if (err) console.error("SAML callback session save error:", err);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/`);
        });
    }
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
            process.env.SAML_SIGNING_CERT || null
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
router.post('/local/login',
    authLimiter,
    passport.authenticate('local', { failureMessage: true }),
    (req, res) => {
        // Sadece adminler yerel giriş yapabilir
        if (req.user.role !== 'admin') {
            req.logout((err) => {
                if (err) console.error('Logout error:', err);
            });
            return res.status(403).json({
                error: 'Yerel giriş yetkiniz bulunmuyor. Lütfen kurumsal giriş (SSO) kullanın.'
            });
        }

        // Onay durumunu kontrol et
        if (req.user.isApproved === false) {
            req.logout((err) => {
                if (err) console.error('Logout error:', err);
            });
            return res.status(403).json({
                error: 'Hesabınız henüz yönetici tarafından onaylanmamış. Lütfen onay bekleyin.'
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
                    message: 'Two-factor authentication required.'
                });
            }

            const secret = decrypt(req.user.twoFactorSecret);
            const isValid = authenticator.verify({ token: totpToken, secret });
            if (!isValid) {
                req.logout((err) => {});
                return res.status(401).json({ error: 'Invalid 2FA token.' });
            }
        }

        // Başarılı giriş
        res.json({
            success: true,
            message: 'Giriş başarılı',
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                displayName: req.user.displayName,
                role: req.user.role
            }
        });
    }
);

// Yerel Kullanıcı Kaydı
router.post('/local/register', 
    authLimiter,
    [
        body('username').trim().isLength({ min: 3 }).withMessage('Kullanıcı adı en az 3 karakter olmalıdır.'),
        body('email').isEmail().withMessage('Geçerli bir e-posta adresi giriniz.'),
        body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır.'),
        body('displayName').optional().trim().isLength({ max: 50 }).withMessage('Görünen ad çok uzun.')
    ],
    validate,
    async (req, res) => {
    try {
        // Kayıt yeteneği kontrolü
        const regSetting = await SystemSetting.findByPk('allowPublicRegistration');
        const isRegistrationAllowed = regSetting ? regSetting.value === 'true' : true; // Varsayılan true

        if (!isRegistrationAllowed) {
            return res.status(403).json({
                error: 'Yeni kullanıcı kaydı şu an için kapalıdır. Lütfen sistem yöneticisi ile iletişime geçin.'
            });
        }

        const { username, email, password, displayName } = req.body;

        // Gerekli alanları kontrol et
        if (!username || !email || !password) {
            return res.status(400).json({
                error: 'Kullanıcı adı, e-posta ve şifre gereklidir.'
            });
        }

        // Kullanıcı zaten var mı kontrol et
        const existingUser = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username: username },
                    { email: email }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor.'
            });
        }

        // Yeni kullanıcı oluştur (isApproved varsayılan olarak false)
        const user = await User.create({
            username,
            email,
            password,
            displayName: displayName || username,
            role: 'user',
            isApproved: false
        });

        // Send welcome email (non-blocking)
        sendWelcomeEmail(user).catch(() => {});

        // Kullanıcıya onay beklediğini bildir (otomatik giriş yapma)
        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı. Hesabınız yönetici onayı bekliyor.',
            pendingApproval: true
        });
    } catch (error) {
        console.error('Kayıt hatası:', error);
        res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu.' });
    }
});

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
                logoutUrl: process.env.SAML_LOGOUT_URL
            });
        }

        res.json({ success: true, message: 'Başarıyla çıkış yapıldı.' });
    });
});

// Şifre Değiştirme (Kullanıcı Kendi Şifresini Değiştirir)
router.put('/change-password', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    }

    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        // Mevcut şifreyi doğrula
        // Not: Shibboleth kullanıcılarının şifresi olmayabilir, onlara bu işlemi yaptırmamalıyız.
        if (!user.password) {
            return res.status(400).json({ error: 'Harici kimlik doğrulama kullanan hesaplar şifre değiştiremez.' });
        }

        const isValid = await user.validatePassword(currentPassword);
        if (!isValid) {
            return res.status(400).json({ error: 'Mevcut şifre hatalı.' });
        }

        // Yeni şifreyi kaydet (Model hook'u hashleyecek)
        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Şifreniz başarıyla değiştirildi.' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Şifre değiştirilirken hata oluştu.' });
    }
});

const { encrypt, decrypt } = require('../utils/encryption');
const { authenticator } = require('otplib');

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
                twoFactorEnabled: req.user.twoFactorEnabled || false
            }
        });
    } else {
        res.status(401).json({ isAuthenticated: false });
    }
});

// Kullanıcı Bilgilerini Güncelle (AI Ayarları Dahil)
router.put('/profile', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    }

    try {
        const { displayName, email, trashRetentionDays, aiOcrEnabled, aiOcrProvider, aiOcrApiKey } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const updateData = {};
        if (displayName !== undefined) updateData.displayName = displayName;

        // E-posta güncelleme ve benzersizlik kontrolü
        if (email !== undefined && email !== user.email) {
            // Basit e-posta doğrulama
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Geçersiz e-posta adresi.' });
            }

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda.' });
            }
            updateData.email = email;
        }

        if (trashRetentionDays !== undefined) {
            const days = parseInt(trashRetentionDays);
            if (isNaN(days) || days < 1 || days > 365) {
                return res.status(400).json({ error: 'Çöp kutusu saklama süresi 1-365 gün arasında olmalıdır.' });
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
            message: 'Profil güncellendi.',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                trashRetentionDays: user.trashRetentionDays,
                aiOcrEnabled: user.aiOcrEnabled,
                aiOcrProvider: user.aiOcrProvider,
                hasAiApiKey: !!user.aiOcrApiKey
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Profil güncellenirken bir hata oluştu.' });
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
            samlEnabled: samlEnabled
        });
    } catch (error) {
        res.json({
            allowPublicRegistration: true,
            samlEnabled: false
        }); // Hata durumunda varsayılan değerler
    }
});

module.exports = router;
