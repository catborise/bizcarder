const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const BusinessCard = sequelize.define('BusinessCard', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    company: {
        type: DataTypes.STRING,
        allowNull: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT, // Tam açık adres
        allowNull: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true
    },
    website: {
        type: DataTypes.STRING,
        allowNull: true
    },
    frontImageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    backImageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    logoUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ocrText: {
        type: DataTypes.TEXT, /* OCR'dan dönen ham metin */
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT, /* Kartvizit ile ilgili genel notlar */
        allowNull: true
    },
    visibility: {
        type: DataTypes.ENUM('public', 'private'),
        defaultValue: 'private'
    },
    reminderDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    deletedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    },
    isPersonal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    }
});

// Hooks Helper
const createHistory = async (card, options, type, snapshotData = null) => {
    try {
        const BusinessCardHistory = require('./BusinessCardHistory');

        let changedBy = null;
        if (options && options.req && options.req.user) {
            changedBy = options.req.user.id;
        }

        // Snapshot verisi: options üzerinden geliyorsa onu kullan, yoksa kartın kendi verisini kullan
        const data = snapshotData || card.toJSON();

        await BusinessCardHistory.create({
            cardId: card.id,
            changedBy: changedBy,
            changeType: type,
            version: card.version,
            snapshot: data
        });
    } catch (error) {
        console.error('History creation failed:', error);
    }
};

// Hook Definitions
BusinessCard.afterCreate(async (card, options) => {
    await createHistory(card, options, 'CREATE');
});

BusinessCard.beforeUpdate(async (card, options) => {
    // Version'ı artır
    card.version = (card.version || 1) + 1;
});

BusinessCard.afterUpdate(async (card, options) => {
    // soft delete kontrolü
    let type = 'UPDATE';
    if (card.deletedAt && card.previous('deletedAt') === null) {
        type = 'SOFT_DELETE';
    } else if (!card.deletedAt && card.previous('deletedAt') !== null) {
        type = 'RESTORE';
    }

    await createHistory(card, options, type);
});

// İlişkiler
BusinessCard.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
BusinessCard.belongsTo(User, { as: 'deleter', foreignKey: 'deletedBy' });
User.hasMany(BusinessCard, { foreignKey: 'ownerId' });

module.exports = BusinessCard;
