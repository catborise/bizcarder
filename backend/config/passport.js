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
const samlEntryPoint = process.env.SAML_ENTRY_POINT;
const samlCert = process.env.SAML_CERT;

if (samlEntryPoint && samlCert) {
    console.log('SAML Yapılandırması Tespit Edildi:');
    console.log('- Entry Point:', samlEntryPoint);
    console.log('- Cert (İlk 10 kar.):', samlCert.substring(0, 10) + '...');

    const samlStrategy = new SamlStrategy(
        {
            // Temel Yapılandırma
            entryPoint: samlEntryPoint,
            issuer: process.env.SAML_ISSUER || 'crm-bizcard-app',
            callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:5000/auth/login/callback',
            cert: samlCert, // IdP Sertifikası (.pem formatında, tırnaksız)

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
                // DEBUG: Gelen profil bilgilerini incele (Loglarda görünecek)
                console.log('--- SAML Profil Verisi ---');
                console.log(JSON.stringify(profile, null, 2));
                console.log('--------------------------');

                // Shibboleth/SAML IdP'lerden gelen yaygın öznitelik isimleri (Attribute Mapping)
                const shibbolethId = profile.nameID ||
                    profile.uid ||
                    profile.eduPersonPrincipalName ||
                    profile['urn:oid:0.9.2342.19200300.100.1.1'] ||
                    profile['urn:oid:1.3.6.1.4.1.5923.1.1.1.6'];

                const email = profile.email ||
                    profile.mail ||
                    profile['urn:oid:0.9.2342.19200300.100.1.3'];

                // İsim soyisim birleştirme veya tekil alan
                const firstName = profile.givenName || profile['urn:oid:2.5.4.42'];
                const lastName = profile.sn || profile['urn:oid:2.5.4.4'];

                let displayName = profile.displayName ||
                    profile.cn ||
                    profile['urn:oid:2.5.4.3'];

                if (!displayName && firstName && lastName) {
                    displayName = `${firstName} ${lastName}`;
                } else if (!displayName) {
                    displayName = 'SSO Kullanıcısı';
                }

                if (!shibbolethId) {
                    console.error('SAML ID bulunamadı. Profil:', profile);
                    return done(new Error('SAML profilinde benzersiz kimlik (ID) bulunamadı.'));
                }

                // Username olarak shibbolethId'nin @ işaretinden önceki kısmını veya tamamını kullan
                const cleanUsername = shibbolethId.includes('@') ? shibbolethId.split('@')[0] : shibbolethId;

                // Kullanıcıyı bul veya oluştur
                let [user, created] = await User.findOrCreate({
                    where: { shibbolethId: shibbolethId },
                    defaults: {
                        username: cleanUsername,
                        email: email || `${cleanUsername}@sso.local`,
                        displayName: displayName,
                        role: 'user',
                        isApproved: true
                    }
                });

                // Mevcut kullanıcıda eksik veya değişmiş bilgileri güncelle
                const updates = {};
                if (!user.username && cleanUsername) updates.username = cleanUsername;
                if (user.displayName === 'SSO Kullanıcısı' && displayName !== 'SSO Kullanıcısı') updates.displayName = displayName;
                if (!user.email && email) updates.email = email;

                if (Object.keys(updates).length > 0) {
                    await user.update(updates);
                }

                return done(null, user);
            } catch (err) {
                console.error('SAML Auth Error:', err);
                return done(err);
            }
        }
    );

    passport.use(samlStrategy);
    passport.samlStrategy = samlStrategy; // Metadata üretimi için strategy nesnesini sakla
    console.log('SAML (Shibboleth) stratejisi başarıyla yapılandırıldı.');
} else {
    console.warn('SAML Yapılandırması Eksik: SAML_ENTRY_POINT veya SAML_CERT bulunamadı.');
    console.log('Mevcut Değerler:', {
        SAML_ENTRY_POINT: samlEntryPoint ? 'Tanımlı' : 'Eksik',
        SAML_CERT: samlCert ? 'Tanımlı' : 'Eksik'
    });
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
