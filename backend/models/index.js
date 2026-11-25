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
const AgendaPage = require('./AgendaPage');
const AgendaEntry = require('./AgendaEntry');
const AgendaEntryContact = require('./AgendaEntryContact');
const AgendaEntryTag = require('./AgendaEntryTag');
const AgendaDelegation = require('./AgendaDelegation');
const AgendaShare = require('./AgendaShare');

// İlişkiler (Relationships)
BusinessCard.belongsToMany(Tag, { through: BusinessCardTag, foreignKey: 'cardId', as: 'tags' });
Tag.belongsToMany(BusinessCard, { through: BusinessCardTag, foreignKey: 'tagId', as: 'cards' });
Tag.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });

// Agenda relationships
AgendaPage.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
AgendaPage.belongsTo(User, { as: 'updatedBy', foreignKey: 'updatedByUserId' });

AgendaEntry.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
AgendaEntry.belongsTo(User, { as: 'createdBy', foreignKey: 'createdByUserId' });
AgendaEntry.belongsTo(User, { as: 'updatedBy', foreignKey: 'updatedByUserId' });
AgendaEntry.hasMany(AgendaEntryContact, { as: 'contactLinks', foreignKey: 'entryId', onDelete: 'CASCADE' });
AgendaEntryContact.belongsTo(AgendaEntry, { as: 'entry', foreignKey: 'entryId' });
AgendaEntryContact.belongsTo(BusinessCard, { as: 'card', foreignKey: 'cardId' });

AgendaEntry.belongsToMany(Tag, { through: AgendaEntryTag, foreignKey: 'entryId', as: 'tags' });
Tag.belongsToMany(AgendaEntry, { through: AgendaEntryTag, foreignKey: 'tagId', as: 'agendaEntries' });

AgendaDelegation.belongsTo(User, { as: 'principal', foreignKey: 'principalUserId' });
AgendaDelegation.belongsTo(User, { as: 'delegate', foreignKey: 'delegateUserId' });

AgendaShare.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
AgendaShare.belongsTo(User, { as: 'sharedWith', foreignKey: 'sharedWithUserId' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bağlantıyı test eder.
 * Not: Migrasyonlar artık CLI üzerinden yönetilmektedir.
 */
const connectDatabase = async (retries = 5, interval = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log('Veritabanı bağlantısı başarılı.');
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
    BusinessCardTag,
    AgendaPage,
    AgendaEntry,
    AgendaEntryContact,
    AgendaEntryTag,
    AgendaDelegation,
    AgendaShare,
};
