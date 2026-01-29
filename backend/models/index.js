const sequelize = require('../config/database');
const User = require('./User');
const BusinessCard = require('./BusinessCard');
const Interaction = require('./Interaction');
const AuditLog = require('./AuditLog');
const BusinessCardHistory = require('./BusinessCardHistory');
const SystemSetting = require('./SystemSetting');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const syncDatabase = async (retries = 5, interval = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate(); // Önce bağlantıyı test et
            console.log('Veritabanı bağlantısı başarılı.');

            // force: false -> tablolar varsa silmez, yoksa oluşturur.
            // alter: true -> değişiklik varsa günceller.
            await sequelize.sync({ alter: true });
            console.log('Veritabanı tabloları senkronize edildi.');

            // Varsayılan admin kullanıcısını oluştur
            const adminUser = await User.findOne({ where: { username: 'admin' } });
            if (!adminUser) {
                await User.create({
                    username: 'admin',
                    password: 'admin',
                    email: 'admin@example.com',
                    displayName: 'Sistem Yöneticisi',
                    role: 'admin'
                });
                console.log('Varsayılan admin kullanıcısı oluşturuldu (admin/admin).');
            }

            return; // Başarılı olursa fonksiyondan çık
        } catch (error) {
            console.error(`Veritabanı senkronizasyon hatası (Deneme ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                console.log(`${interval / 1000} saniye bekleniyor...`);
                await sleep(interval);
            } else {
                console.error('Veritabanı bağlantısı kurulamadı, çıkış yapılıyor.');
                // İsteğe bağlı: process.exit(1); 
                // Ancak konteynerin restart politikası varsa zaten yeniden başlar.
            }
        }
    }
};

module.exports = {
    sequelize,
    syncDatabase,
    User,
    BusinessCard,
    Interaction,
    AuditLog,
    BusinessCardHistory,
    SystemSetting
};

