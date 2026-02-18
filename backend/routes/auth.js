const express = require('express');
const passport = require('passport');
const { User, SystemSetting } = require('../models');
const router = express.Router();

// ============== SHIBBOLETH (SAML) AUTHENTICATION ==============

// Giriş Başlatma
// Kullanıcıyı IdP giriş sayfasına yönlendirir.
router.get('/login',
    passport.authenticate('saml', { failureRedirect: '/login/fail' }),
    (req, res) => {
        res.redirect('/');
    }
);

// IdP'den Dönüş (ACS URL)
// Başarılı girişten sonra IdP buraya POST isteği atar.
router.post('/login/callback',
    passport.authenticate('saml', {
        failureRedirect: '/login/fail',
        failureFlash: true
    }),
    (req, res) => {
        // Başarılı giriş
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/`);
    }
);

// SAML Metadata Endpoint (IdP yetkilendirmesi için)
// Bu rota reverse proxy (Caddy/Nginx) tarafından /auth/* kapsamında olduğu için otomatik yönlendirilir.
router.get('/metadata.xml', (req, res) => {
    try {
        const strategy = passport._strategy('saml');
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
    passport.authenticate('local', { failureMessage: true }),
    (req, res) => {
        // Onay durumunu kontrol et
        if (req.user.isApproved === false) {
            req.logout((err) => {
                if (err) console.error('Logout error:', err);
            });
            return res.status(403).json({
                error: 'Hesabınız henüz yönetici tarafından onaylanmamış. Lütfen onay bekleyin.'
            });
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
router.post('/local/register', async (req, res) => {
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
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Çıkış yapılırken hata oluştu.' });
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
                trashRetentionDays: req.user.trashRetentionDays
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
        res.json({ allowPublicRegistration: isRegistrationAllowed });
    } catch (error) {
        res.json({ allowPublicRegistration: true }); // Hata durumunda varsayılan true
    }
});

module.exports = router;
