const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const BusinessCard = require('./BusinessCard');

const Interaction = sequelize.define('Interaction', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    type: {
        type: DataTypes.STRING, // Örn: 'Arama', 'Toplantı', 'E-posta', 'Satınalma'
        defaultValue: 'Not'
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

// İlişkiler
Interaction.belongsTo(BusinessCard, { foreignKey: 'cardId', onDelete: 'CASCADE' });
BusinessCard.hasMany(Interaction, { foreignKey: 'cardId', onDelete: 'CASCADE' });

Interaction.belongsTo(User, { as: 'author', foreignKey: 'authorId' });
User.hasMany(Interaction, { foreignKey: 'authorId' });

module.exports = Interaction;
