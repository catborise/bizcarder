const sequelize = require('../config/database');
const User = require('./User');
const BusinessCard = require('./BusinessCard');
const Interaction = require('./Interaction');
const AuditLog = require('./AuditLog');
const BusinessCardHistory = require('./BusinessCardHistory');
const SystemSetting = require('./SystemSetting');
const DashboardTile = require('./DashboardTile');
const Tag = require('./Tag');
const BusinessCardTag = require('./BusinessCardTag');

// İlişkiler (Relationships)
BusinessCard.belongsToMany(Tag, { through: BusinessCardTag, foreignKey: 'cardId', as: 'tags' });
Tag.belongsToMany(BusinessCard, { through: BusinessCardTag, foreignKey: 'tagId', as: 'cards' });
Tag.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });

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

            // Varsayılan Dashboard Tile'larını oluştur
            const tileCount = await DashboardTile.count();
            if (tileCount === 0) {
                const defaultTiles = [
                    { title: 'Kartvizitler', subtitle: 'Kişi listesini yönet', url: '/contacts', icon: 'FaIdCard', backgroundColor: 'rgba(96, 60, 186, 0.3)', order: 1, isInternal: true },
                    { title: 'İşlem Kayıtları', subtitle: 'Sistem loglarını incele', url: '/logs', icon: 'FaHistory', backgroundColor: 'rgba(218, 83, 44, 0.3)', order: 2, isInternal: true },
                    { title: 'İK Portalı', subtitle: 'İzin ve bordro işlemleri', url: '#', icon: 'FaBuilding', backgroundColor: 'rgba(0, 163, 0, 0.3)', order: 3, isInternal: false },
                    { title: 'Personel Listesi', subtitle: 'Dahili rehber', url: '#', icon: 'FaUsers', backgroundColor: 'rgba(43, 87, 151, 0.3)', order: 4, isInternal: false },
                    { title: 'Intranet', subtitle: 'Kurumsal duyurular', url: '#', icon: 'FaGlobe', backgroundColor: 'rgba(227, 162, 26, 0.3)', order: 5, isInternal: false },
                    { title: 'IT Destek', subtitle: 'Talep oluştur', url: '#', icon: 'FaLifeRing', backgroundColor: 'rgba(159, 0, 167, 0.3)', order: 6, isInternal: false },
                    { title: 'Toplu İçe Aktar', subtitle: 'CSV/XLSX ile toplu veri', url: '/import', icon: 'FaFileImport', backgroundColor: 'rgba(59, 130, 246, 0.3)', order: 7, isInternal: true }
                ];
                await DashboardTile.bulkCreate(defaultTiles);
                console.log('Varsayılan dashboard tile\'ları oluşturuldu.');
            }

            // Varsayılan Etiketleri oluştur
            const tagCount = await Tag.count();
            if (tagCount === 0) {
                const defaultTags = [
                    { name: 'Müşteri', color: '#4ade80' },
                    { name: 'Tedarikçi', color: '#3b82f6' },
                    { name: 'Potansiyel', color: '#fbbf24' },
                    { name: 'Sıcak Satış', color: '#f87171' },
                    { name: 'Fuar/Etkinlik', color: '#a78bfa' }
                ];
                await Tag.bulkCreate(defaultTags);
                console.log('Varsayılan etiketler oluşturuldu.');
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
    SystemSetting,
    DashboardTile,
    Tag,
    BusinessCardTag
};

