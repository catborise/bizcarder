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
        // Frontend'e yönlendir veya token dön (Session kullanıyorsak yönlendirme yeterli)
        res.redirect('http://localhost:5173/');
    }
);

// ============== LOCAL AUTHENTICATION ==============

// Yerel Kullanıcı Girişi
router.post('/local/login',
    passport.authenticate('local', { failureMessage: true }),
    (req, res) => {
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

        // Yeni kullanıcı oluştur
        const user = await User.create({
            username,
            email,
            password,
            displayName: displayName || username,
            role: 'user'
        });

        // Otomatik giriş yap
        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Kayıt başarılı ancak giriş yapılamadı.' });
            }
            res.status(201).json({
                success: true,
                message: 'Kayıt başarılı',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    displayName: user.displayName,
                    role: user.role
                }
            });
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
                shibbolethId: req.user.shibbolethId
            }
        });
    } else {
        res.status(401).json({ isAuthenticated: false });
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
