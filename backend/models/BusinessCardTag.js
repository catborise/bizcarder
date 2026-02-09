const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BusinessCardTag = sequelize.define('BusinessCardTag', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    cardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'BusinessCards',
            key: 'id'
        }
    },
    tagId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Tags',
            key: 'id'
        }
    }
});

module.exports = BusinessCardTag;
