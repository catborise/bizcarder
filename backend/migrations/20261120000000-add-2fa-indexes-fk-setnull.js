'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Add missing 2FA columns to Users table (idempotent)
        const usersTable = await queryInterface.describeTable('Users');
        if (!usersTable.twoFactorSecret) {
            await queryInterface.addColumn('Users', 'twoFactorSecret', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
        if (!usersTable.twoFactorEnabled) {
            await queryInterface.addColumn('Users', 'twoFactorEnabled', {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            });
        }

        // 2. Ensure nullable User FK references use ON DELETE SET NULL so DELETE /api/users/:id never fails with 23503
        const fkTargets = [
            { table: 'BusinessCards', column: 'deletedBy' },
            { table: 'Tags', column: 'ownerId' },
            { table: 'Interactions', column: 'authorId' },
            { table: 'AuditLogs', column: 'userId' },
            { table: 'BusinessCardHistories', column: 'changedBy' },
        ];

        for (const { table, column } of fkTargets) {
            await queryInterface.sequelize.query(`
                DO $$
                DECLARE
                    con_name text;
                BEGIN
                    SELECT tc.constraint_name INTO con_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_name = '${table}'
                      AND kcu.column_name = '${column}'
                    LIMIT 1;

                    IF con_name IS NOT NULL THEN
                        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', '${table}', con_name);
                    END IF;

                    EXECUTE format(
                        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE SET NULL',
                        '${table}',
                        '${table}_${column}_fkey',
                        '${column}'
                    );
                END $$;
            `);
        }

        // 3. Add missing indexes (idempotent IF NOT EXISTS)
        const indexes = [
            'CREATE INDEX IF NOT EXISTS "idx_business_cards_first_name" ON "BusinessCards" ("firstName")',
            'CREATE INDEX IF NOT EXISTS "idx_business_cards_last_name" ON "BusinessCards" ("lastName")',
            'CREATE INDEX IF NOT EXISTS "idx_business_cards_company" ON "BusinessCards" ("company")',
            'CREATE INDEX IF NOT EXISTS "idx_business_cards_email" ON "BusinessCards" ("email")',
            'CREATE INDEX IF NOT EXISTS "idx_business_cards_owner_id" ON "BusinessCards" ("ownerId")',
            'CREATE INDEX IF NOT EXISTS "idx_business_cards_deleted_at" ON "BusinessCards" ("deletedAt")',
            'CREATE INDEX IF NOT EXISTS "idx_business_cards_visibility" ON "BusinessCards" ("visibility")',
            'CREATE INDEX IF NOT EXISTS "idx_business_cards_sharing_token" ON "BusinessCards" ("sharingToken")',
            'CREATE INDEX IF NOT EXISTS "idx_business_card_histories_card_id" ON "BusinessCardHistories" ("cardId")',
            'CREATE INDEX IF NOT EXISTS "idx_business_card_histories_changed_by" ON "BusinessCardHistories" ("changedBy")',
            'CREATE INDEX IF NOT EXISTS "idx_interactions_card_id" ON "Interactions" ("cardId")',
            'CREATE INDEX IF NOT EXISTS "idx_interactions_author_id" ON "Interactions" ("authorId")',
            'CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "AuditLogs" ("userId")',
            'CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "AuditLogs" ("createdAt")',
            'CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "AuditLogs" ("action")',
            'CREATE INDEX IF NOT EXISTS "idx_tags_owner_id" ON "Tags" ("ownerId")',
        ];

        for (const sql of indexes) {
            await queryInterface.sequelize.query(sql);
        }

        // Deduplicate BusinessCardTags before creating unique composite index
        await queryInterface.sequelize.query(`
            DELETE FROM "BusinessCardTags" a
            USING "BusinessCardTags" b
            WHERE a.id > b.id
              AND a."cardId" = b."cardId"
              AND a."tagId" = b."tagId";
        `);
        await queryInterface.sequelize.query(
            'CREATE UNIQUE INDEX IF NOT EXISTS "idx_business_card_tags_card_tag_unique" ON "BusinessCardTags" ("cardId", "tagId")',
        );
    },

    async down(queryInterface) {
        const dropIndexes = [
            'DROP INDEX IF EXISTS "idx_business_card_tags_card_tag_unique"',
            'DROP INDEX IF EXISTS "idx_tags_owner_id"',
            'DROP INDEX IF EXISTS "idx_audit_logs_action"',
            'DROP INDEX IF EXISTS "idx_audit_logs_created_at"',
            'DROP INDEX IF EXISTS "idx_audit_logs_user_id"',
            'DROP INDEX IF EXISTS "idx_interactions_author_id"',
            'DROP INDEX IF EXISTS "idx_interactions_card_id"',
            'DROP INDEX IF EXISTS "idx_business_card_histories_changed_by"',
            'DROP INDEX IF EXISTS "idx_business_card_histories_card_id"',
            'DROP INDEX IF EXISTS "idx_business_cards_sharing_token"',
            'DROP INDEX IF EXISTS "idx_business_cards_visibility"',
            'DROP INDEX IF EXISTS "idx_business_cards_deleted_at"',
            'DROP INDEX IF EXISTS "idx_business_cards_owner_id"',
            'DROP INDEX IF EXISTS "idx_business_cards_email"',
            'DROP INDEX IF EXISTS "idx_business_cards_company"',
            'DROP INDEX IF EXISTS "idx_business_cards_last_name"',
            'DROP INDEX IF EXISTS "idx_business_cards_first_name"',
        ];

        for (const sql of dropIndexes) {
            await queryInterface.sequelize.query(sql);
        }

        const usersTable = await queryInterface.describeTable('Users');
        if (usersTable.twoFactorEnabled) {
            await queryInterface.removeColumn('Users', 'twoFactorEnabled');
        }
        if (usersTable.twoFactorSecret) {
            await queryInterface.removeColumn('Users', 'twoFactorSecret');
        }
    },
};
