const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgendaEntryContact = sequelize.define(
    'AgendaEntryContact',
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
        cardId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'BusinessCards',
                key: 'id',
            },
        },
        displayNameSnapshot: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        indexes: [
            {
                fields: ['entryId'],
                name: 'idx_agenda_entry_contacts_entry_id',
            },
            {
                fields: ['cardId'],
                name: 'idx_agenda_entry_contacts_card_id',
            },
        ],
    },
);

module.exports = AgendaEntryContact;
