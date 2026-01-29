const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const BusinessCard = require('./BusinessCard');
const User = require('./User');

const BusinessCardHistory = sequelize.define('BusinessCardHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'BusinessCards',
            key: 'id'
        }
    },
    changedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    changeType: {
        type: DataTypes.ENUM('CREATE', 'UPDATE', 'SOFT_DELETE', 'RESTORE'),
        allowNull: false
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    snapshot: {
        type: DataTypes.JSONB,
        allowNull: false
    }
}, {
    timestamps: true,
    updatedAt: false // Sadece createdAt yeterli
});

// İlişkiler
BusinessCardHistory.belongsTo(BusinessCard, { foreignKey: 'cardId', onDelete: 'CASCADE' });
BusinessCardHistory.belongsTo(User, { as: 'editor', foreignKey: 'changedBy' });
BusinessCard.hasMany(BusinessCardHistory, { foreignKey: 'cardId' });

module.exports = BusinessCardHistory;
