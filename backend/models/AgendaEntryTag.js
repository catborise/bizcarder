const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgendaEntryTag = sequelize.define(
    'AgendaEntryTag',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        entryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'AgendaEntries',
                key: 'id',
            },
        },
        tagId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Tags',
                key: 'id',
            },
        },
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['entryId', 'tagId'],
                name: 'idx_agenda_entry_tags_entry_tag_unique',
            },
        ],
    },
);

module.exports = AgendaEntryTag;
