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

/**
 * Bağlantıyı test eder. 
 * Not: Migrasyonlar artık CLI üzerinden yönetilmektedir.
 */
const connectDatabase = async (retries = 5, interval = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log('Veritabanı bağlantısı başarılı.');
            // Auto-sync new columns (safe for production — only adds, never drops)
            await sequelize.sync({ alter: true });
            return;
        } catch (error) {
            console.error(`Veritabanı bağlantı hatası (Deneme ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                await sleep(interval);
            } else {
                console.error('Veritabanı bağlantısı kurulamadı.');
                throw error;
            }
        }
    }
};

module.exports = {
    sequelize,
    connectDatabase,
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
