const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models');

// Serileştirme: Kullanıcı oturuma nasıl kaydedilecek
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserileştirme: Oturumdaki ID'den kullanıcı nasıl bulunacak
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// SAML Stratejisi
// NOT: Bu konfigürasyon Identity Provider (IdP) bilgilerinize göre doldurulmalıdır.
// Geliştirme ortamında mock (sahte) bir IdP kullanılabilir veya çevre değişkenleri ile ayarlanabilir.
passport.use(new SamlStrategy(
    {
        path: '/auth/login/callback', // IdP'nin başarılı girişten sonra döneceği URL (ACS URL)
        entryPoint: process.env.SAML_ENTRY_POINT || 'https://idp.example.com/idp/profile/SAML2/Redirect/SSO', // IdP Giriş URL'si
        issuer: 'crm-app', // Bu uygulamanın IdP'deki adı
        cert: process.env.SAML_CERT || 'cert-string-here' // IdP'nin sertifikası
    },
    async (profile, done) => {
        try {
            // IdP'den dönen profile göre kullanıcıyı bul veya oluştur
            // 'profile.nameID' veya 'profile.uid' IdP konfigürasyonuna göre değişir.
            const shibbolethId = profile.nameID || profile.uid || 'unknown';
            const email = profile.email || `${shibbolethId}@example.com`;
            const displayName = profile.displayName || profile.cn || 'Kullanıcı';

            let [user, created] = await User.findOrCreate({
                where: { shibbolethId: shibbolethId },
                defaults: {
                    email: email,
                    displayName: displayName,
                    role: 'user' // Varsayılan rol
                }
            });

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// Local Stratejisi (Kullanıcı Adı ve Şifre)
passport.use(new LocalStrategy(
    {
        usernameField: 'username',
        passwordField: 'password'
    },
    async (username, password, done) => {
        try {
            // Kullanıcıyı username veya email ile bul
            const user = await User.findOne({
                where: {
                    [require('sequelize').Op.or]: [
                        { username: username },
                        { email: username }
                    ]
                }
            });

            if (!user) {
                return done(null, false, { message: 'Kullanıcı adı veya şifre hatalı.' });
            }

            // Şifreyi doğrula
            const isValid = await user.validatePassword(password);
            if (!isValid) {
                return done(null, false, { message: 'Kullanıcı adı veya şifre hatalı.' });
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

module.exports = passport;
