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
                // DEBUG: Gelen profil bilgilerini incele
                console.log('--- SAML Profil Verisi Girişi ---');
                console.log(JSON.stringify(profile, null, 2));
                console.log('--------------------------');

                // Öznitelikleri hem kökte hem de .attributes altında ara (Büyük/Küçük harf duyarsız)
                const attr = profile.attributes || {};
                const getAttr = (key) => {
                    const lowKey = key.toLowerCase();
                    // Doğrudan eşleşme kontrolü
                    if (profile[key]) return profile[key];
                    if (attr[key]) return attr[key];

                    // Küçük harf ile arama
                    for (let k in profile) {
                        if (k.toLowerCase() === lowKey) return profile[k];
                    }
                    for (let k in attr) {
                        if (k.toLowerCase() === lowKey) return attr[k];
                    }
                    return null;
                };

                // 1. Benzersiz ID Yakalama
                const shibbolethId = profile.nameID ||
                    getAttr('uid') ||
                    getAttr('eduPersonPrincipalName') ||
                    getAttr('urn:oid:0.9.2342.19200300.100.1.1') ||
                    getAttr('urn:oid:1.3.6.1.4.1.5923.1.1.1.6');

                // 2. E-Posta Yakalama
                const email = getAttr('mail') ||
                    getAttr('email') ||
                    getAttr('urn:oid:0.9.2342.19200300.100.1.3');

                // 3. İsim Soyisim Yakalama
                let displayName = getAttr('displayName') ||
                    getAttr('cn') ||
                    getAttr('commonName') ||
                    getAttr('urn:oid:2.16.840.1.113730.3.1.241') || // Kullanıcının IdP'sinden gelen özel OID
                    getAttr('urn:oid:2.5.4.3');

                const firstName = getAttr('givenName') || getAttr('first_name') || getAttr('ad') || getAttr('urn:oid:2.5.4.42');
                const lastName = getAttr('sn') || getAttr('surname') || getAttr('last_name') || getAttr('soyad') || getAttr('urn:oid:2.5.4.4');

                if (!displayName && firstName && lastName) {
                    displayName = `${firstName} ${lastName}`;
                } else if (!displayName && firstName) {
                    displayName = firstName;
                } else if (!displayName) {
                    displayName = 'SSO Kullanıcısı';
                }

                // 4. Organizasyon Filtreleme (Filtrasyon Mantığı)
                const orgUnitDN = getAttr('eduPersonPrimaryOrgUnitDN') || getAttr('urn:oid:1.3.6.1.4.1.5923.1.1.1.8');
                const allowedOrgUnits = process.env.SAML_ALLOWED_ORG_UNITS;

                if (allowedOrgUnits) {
                    const allowedList = allowedOrgUnits.split(',').map(item => item.trim());
                    const isAllowed = allowedList.some(item => {
                        // Tam eşleşme veya DN içinde geçme kontrolü
                        return orgUnitDN && (orgUnitDN === item || orgUnitDN.includes(item));
                    });

                    if (!isAllowed) {
                        console.warn(`[SAML ACCESS DENIED] User ${shibbolethId} rejected. OrgUnit: ${orgUnitDN || 'Eksik'}`);
                        return done(null, false, { message: 'Bu uygulamaya giriş yetkiniz bulunmamaktadır (Organizasyon kısıtlaması).' });
                    }
                }

                if (!shibbolethId) {
                    console.error('SAML ID bulunamadı. Profil:', profile);
                    return done(new Error('SAML profilinde benzersiz kimlik (ID) bulunamadı.'));
                }

                // 4. Kullanıcı Adı Belirleme
                let cleanUsername = shibbolethId.includes('@') ? shibbolethId.split('@')[0] : shibbolethId;
                const isHashId = shibbolethId.length > 20 && !shibbolethId.includes('@') && !shibbolethId.includes('.');

                if (isHashId && email) {
                    cleanUsername = email.split('@')[0];
                }

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

                // Username güncelleme (hash ise veya boşsa)
                const currentUsernameIsHash = user.username && user.username.length > 20 && !user.username.includes('@');
                if ((!user.username || currentUsernameIsHash) && cleanUsername && cleanUsername !== user.username) {
                    updates.username = cleanUsername;
                }

                // İsim güncelleme (Eğer yeni bulunan isim 'SSO Kullanıcısı' değilse ve eskisinden farklıysa)
                if (displayName && displayName !== 'SSO Kullanıcısı' && displayName !== user.displayName) {
                    updates.displayName = displayName;
                }

                if (!user.email && email) {
                    updates.email = email;
                }

                if (Object.keys(updates).length > 0) {
                    console.log(`[SAML UPDATE] User ${user.shibbolethId} updating fields:`, Object.keys(updates));
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
