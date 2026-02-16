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
if (process.env.SAML_ENTRY_POINT && process.env.SAML_CERT) {
    passport.use(new SamlStrategy(
        {
            // Temel Yapılandırma
            entryPoint: process.env.SAML_ENTRY_POINT,
            issuer: process.env.SAML_ISSUER || 'crm-bizcard-app',
            callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:5000/auth/login/callback',
            cert: process.env.SAML_CERT, // IdP Sertifikası (.pem formatında, tırnaksız)

            // Gelişmiş Ayarlar
            identifierFormat: null, // Genellikle IdP tarafından belirlenir
            decryptionPvk: process.env.SAML_PRIVATE_KEY || null, // Opsiyonel: Şifreli assertion kullanılıyorsa
            signatureAlgorithm: 'sha256',
            digestAlgorithm: 'sha256',

            // Timeout ve Saat Farkı (Opsiyonel)
            acceptedClockSkewMs: 10000
        },
        async (profile, done) => {
            try {
                // Shibboleth/SAML IdP'lerden gelen yaygın öznitelik isimleri (Attribute Mapping)
                // IdP konfigürasyonuna göre uid, eduPersonPrincipalName veya mail kullanılabilir.
                const shibbolethId = profile.nameID ||
                    profile.uid ||
                    profile['urn:oid:0.9.2342.19200300.100.1.1'] ||
                    profile.eduPersonPrincipalName;

                const email = profile.email ||
                    profile.mail ||
                    profile['urn:oid:0.9.2342.19200300.100.1.3'];

                const displayName = profile.displayName ||
                    profile.cn ||
                    profile['urn:oid:2.5.4.3'] ||
                    'SSO Kullanıcısı';

                if (!shibbolethId) {
                    return done(new Error('SAML profilinde benzersiz kimlik (ID) bulunamadı.'));
                }

                // Kullanıcıyı bul veya oluştur
                let [user, created] = await User.findOrCreate({
                    where: { shibbolethId: shibbolethId },
                    defaults: {
                        email: email || `${shibbolethId}@sso.local`,
                        displayName: displayName,
                        role: 'user',
                        isApproved: true // SSO ile gelen kullanıcılar genelde otomatik onaylanır, tercih edilebilir
                    }
                });

                // Eğer e-posta veya isim IdP tarafında güncellendiyse güncelle (Opsiyonel)
                if (!created && (user.email !== email || user.displayName !== displayName)) {
                    await user.update({ email: email || user.email, displayName: displayName || user.displayName });
                }

                return done(null, user);
            } catch (err) {
                console.error('SAML Auth Error:', err);
                return done(err);
            }
        }
    ));
    console.log('SAML (Shibboleth) stratejisi başarıyla yapılandırıldı.');
} else {
    console.warn('SAML_ENTRY_POINT veya SAML_CERT eksik. SAML (Shibboleth) giriş yöntemi devre dışı bırakıldı.');
}

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
