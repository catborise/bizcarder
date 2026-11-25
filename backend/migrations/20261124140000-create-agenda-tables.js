'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            // 1. AgendaPages
            await queryInterface.createTable(
                'AgendaPages',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        autoIncrement: true,
                        primaryKey: true,
                    },
                    ownerId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: 'Users', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE',
                    },
                    date: {
                        type: Sequelize.DATEONLY,
                        allowNull: false,
                    },
                    freeformNotes: {
                        type: Sequelize.TEXT,
                        allowNull: false,
                        defaultValue: '',
                    },
                    privateNotes: {
                        type: Sequelize.TEXT,
                        allowNull: false,
                        defaultValue: '',
                    },
                    moodOrPriority: {
                        type: Sequelize.STRING(32),
                        allowNull: true,
                    },
                    version: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        defaultValue: 1,
                    },
                    updatedByUserId: {
                        type: Sequelize.INTEGER,
                        allowNull: true,
                        references: { model: 'Users', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'SET NULL',
                    },
                    createdAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updatedAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );
            await queryInterface.addIndex('AgendaPages', ['ownerId', 'date'], {
                unique: true,
                name: 'idx_agenda_pages_owner_date_unique',
                transaction,
            });

            // 2. AgendaEntries
            await queryInterface.createTable(
                'AgendaEntries',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        autoIncrement: true,
                        primaryKey: true,
                    },
                    ownerId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: 'Users', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE',
                    },
                    createdByUserId: {
                        type: Sequelize.INTEGER,
                        allowNull: true,
                        references: { model: 'Users', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'SET NULL',
                    },
                    updatedByUserId: {
                        type: Sequelize.INTEGER,
                        allowNull: true,
                        references: { model: 'Users', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'SET NULL',
                    },
                    date: {
                        type: Sequelize.DATEONLY,
                        allowNull: false,
                    },
                    timeSlot: {
                        type: Sequelize.STRING(5),
                        allowNull: true,
                    },
                    endTime: {
                        type: Sequelize.STRING(5),
                        allowNull: true,
                    },
                    entryType: {
                        type: Sequelize.ENUM('schedule', 'call', 'note', 'task', 'follow_up'),
                        allowNull: false,
                        defaultValue: 'note',
                    },
                    content: {
                        type: Sequelize.TEXT,
                        allowNull: false,
                    },
                    status: {
                        type: Sequelize.ENUM('open', 'done', 'migrated', 'cancelled'),
                        allowNull: false,
                        defaultValue: 'open',
                    },
                    priority: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        defaultValue: 3,
                    },
                    migratedToDate: {
                        type: Sequelize.DATEONLY,
                        allowNull: true,
                    },
                    migratedFromEntryId: {
                        type: Sequelize.INTEGER,
                        allowNull: true,
                        references: { model: 'AgendaEntries', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'SET NULL',
                    },
                    reminderAt: {
                        type: Sequelize.DATE,
                        allowNull: true,
                    },
                    reminderSent: {
                        type: Sequelize.BOOLEAN,
                        allowNull: false,
                        defaultValue: false,
                    },
                    isPrivate: {
                        type: Sequelize.BOOLEAN,
                        allowNull: false,
                        defaultValue: false,
                    },
                    sortOrder: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        defaultValue: 0,
                    },
                    deletedAt: {
                        type: Sequelize.DATE,
                        allowNull: true,
                    },
                    createdAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updatedAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );
            await queryInterface.addIndex('AgendaEntries', ['ownerId', 'date'], {
                name: 'idx_agenda_entries_owner_date',
                transaction,
            });
            await queryInterface.addIndex('AgendaEntries', ['migratedFromEntryId', 'date'], {
                unique: true,
                name: 'idx_agenda_entries_migrated_from_date_unique',
                transaction,
            });
            await queryInterface.addIndex('AgendaEntries', ['reminderAt', 'reminderSent'], {
                name: 'idx_agenda_entries_reminder',
                transaction,
            });

            // 3. AgendaEntryContacts
            await queryInterface.createTable(
                'AgendaEntryContacts',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        autoIncrement: true,
                        primaryKey: true,
                    },
                    entryId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: 'AgendaEntries', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE',
                    },
                    cardId: {
                        type: Sequelize.INTEGER,
                        allowNull: true,
                        references: { model: 'BusinessCards', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'SET NULL',
                    },
                    displayNameSnapshot: {
                        type: Sequelize.STRING,
                        allowNull: false,
                    },
                    createdAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updatedAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );
            await queryInterface.addIndex('AgendaEntryContacts', ['entryId'], {
                name: 'idx_agenda_entry_contacts_entry_id',
                transaction,
            });
            await queryInterface.addIndex('AgendaEntryContacts', ['cardId'], {
                name: 'idx_agenda_entry_contacts_card_id',
                transaction,
            });

            // 4. AgendaEntryTags
            await queryInterface.createTable(
                'AgendaEntryTags',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        autoIncrement: true,
                        primaryKey: true,
                    },
                    entryId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: 'AgendaEntries', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE',
                    },
                    tagId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: 'Tags', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE',
                    },
                    createdAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updatedAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );
            await queryInterface.addIndex('AgendaEntryTags', ['entryId', 'tagId'], {
                unique: true,
                name: 'idx_agenda_entry_tags_entry_tag_unique',
                transaction,
            });

            // 5. AgendaDelegations
            await queryInterface.createTable(
                'AgendaDelegations',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        autoIncrement: true,
                        primaryKey: true,
                    },
                    principalUserId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: 'Users', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE',
                    },
                    delegateUserId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: 'Users', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE',
                    },
                    permission: {
                        type: Sequelize.ENUM('read', 'write'),
                        allowNull: false,
                        defaultValue: 'write',
                    },
                    startsAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    endsAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    note: {
                        type: Sequelize.STRING,
                        allowNull: true,
                    },
                    isActive: {
                        type: Sequelize.BOOLEAN,
                        allowNull: false,
                        defaultValue: true,
                    },
                    createdAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updatedAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );
            await queryInterface.addIndex('AgendaDelegations', ['principalUserId', 'delegateUserId', 'isActive'], {
                name: 'idx_agenda_delegations_principal_delegate_active',
                transaction,
            });
            await queryInterface.addIndex('AgendaDelegations', ['delegateUserId', 'isActive', 'endsAt'], {
                name: 'idx_agenda_delegations_delegate_active_ends',
                transaction,
            });

            // 6. AgendaShares
            await queryInterface.createTable(
                'AgendaShares',
                {
                    id: {
                        type: Sequelize.INTEGER,
                        autoIncrement: true,
                        primaryKey: true,
                    },
                    ownerId: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        references: { model: 'Users', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE',
                    },
                    shareTokenHash: {
                        type: Sequelize.STRING(64),
                        allowNull: false,
                    },
                    startDate: {
                        type: Sequelize.DATEONLY,
                        allowNull: false,
                    },
                    endDate: {
                        type: Sequelize.DATEONLY,
                        allowNull: false,
                    },
                    title: {
                        type: Sequelize.STRING,
                        allowNull: true,
                    },
                    sharedWithUserId: {
                        type: Sequelize.INTEGER,
                        allowNull: true,
                        references: { model: 'Users', key: 'id' },
                        onUpdate: 'CASCADE',
                        onDelete: 'SET NULL',
                    },
                    expiresAt: {
                        type: Sequelize.DATE,
                        allowNull: true,
                    },
                    isActive: {
                        type: Sequelize.BOOLEAN,
                        allowNull: false,
                        defaultValue: true,
                    },
                    viewCount: {
                        type: Sequelize.INTEGER,
                        allowNull: false,
                        defaultValue: 0,
                    },
                    createdAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updatedAt: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );
            await queryInterface.addIndex('AgendaShares', ['shareTokenHash'], {
                unique: true,
                name: 'idx_agenda_shares_token_hash_unique',
                transaction,
            });
            await queryInterface.addIndex('AgendaShares', ['ownerId'], {
                name: 'idx_agenda_shares_owner_id',
                transaction,
            });
            await queryInterface.addIndex('AgendaShares', ['sharedWithUserId'], {
                name: 'idx_agenda_shares_shared_with_user',
                transaction,
            });
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.dropTable('AgendaShares', { transaction });
            await queryInterface.dropTable('AgendaDelegations', { transaction });
            await queryInterface.dropTable('AgendaEntryTags', { transaction });
            await queryInterface.dropTable('AgendaEntryContacts', { transaction });
            await queryInterface.dropTable('AgendaEntries', { transaction });
            await queryInterface.dropTable('AgendaPages', { transaction });

            await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_AgendaEntries_entryType";', {
                transaction,
            });
            await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_AgendaEntries_status";', {
                transaction,
            });
            await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_AgendaDelegations_permission";', {
                transaction,
            });
        });
    },
};
