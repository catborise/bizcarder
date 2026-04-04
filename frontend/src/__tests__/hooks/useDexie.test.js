/**
 * Tests for the Dexie-based offline store (offlineStore.js).
 * These tests verify the Dexie API surface used by the app,
 * which is critical for the Dexie 4 migration.
 *
 * Dexie APIs under test:
 *  - new Dexie(dbName)
 *  - db.version(n).stores({...})
 *  - db.table.clear()
 *  - db.table.bulkAdd()
 *  - db.table.toArray()
 *  - db.table.add()
 *  - db.table.delete()
 */

// We use fake-indexeddb for jsdom environment
import 'fake-indexeddb/auto';

import {
    db,
    saveCardsToOffline,
    getOfflineCards,
    queueForSync,
    getPendingSync,
    clearSyncItem,
} from '../../utils/offlineStore';

describe('offlineStore (Dexie)', () => {
    beforeEach(async () => {
        // Clear all tables before each test
        await db.cards.clear();
        await db.pendingSync.clear();
    });

    afterAll(async () => {
        await db.delete();
    });

    it('db has correct table schema', () => {
        // Verify the Dexie database has the expected tables
        expect(db.tables.map(t => t.name).sort()).toEqual(['cards', 'pendingSync']);
    });

    it('saveCardsToOffline stores cards and getOfflineCards retrieves them', async () => {
        const cards = [
            { id: 1, firstName: 'Alice', lastName: 'Smith', company: 'Acme', email: 'a@test.com', phone: '555', city: 'NY' },
            { id: 2, firstName: 'Bob', lastName: 'Jones', company: 'Beta', email: 'b@test.com', phone: '666', city: 'LA' },
        ];

        await saveCardsToOffline(cards);
        const result = await getOfflineCards();

        expect(result).toHaveLength(2);
        expect(result[0].firstName).toBe('Alice');
        expect(result[1].firstName).toBe('Bob');
    });

    it('saveCardsToOffline replaces previous cards', async () => {
        await saveCardsToOffline([
            { id: 1, firstName: 'Old', lastName: 'Data', company: '', email: '', phone: '', city: '' },
        ]);
        await saveCardsToOffline([
            { id: 2, firstName: 'New', lastName: 'Data', company: '', email: '', phone: '', city: '' },
        ]);

        const result = await getOfflineCards();
        expect(result).toHaveLength(1);
        expect(result[0].firstName).toBe('New');
    });

    it('getOfflineCards returns empty array when no cards stored', async () => {
        const result = await getOfflineCards();
        expect(result).toEqual([]);
    });

    it('queueForSync adds items to pendingSync', async () => {
        await queueForSync('CREATE_CARD', { firstName: 'Test' });
        await queueForSync('CREATE_CARD', { firstName: 'Test2' });

        const pending = await getPendingSync();
        expect(pending).toHaveLength(2);
        expect(pending[0].type).toBe('CREATE_CARD');
        expect(pending[0].data).toEqual({ firstName: 'Test' });
        expect(pending[0].timestamp).toBeGreaterThan(0);
    });

    it('clearSyncItem removes a specific item', async () => {
        await queueForSync('CREATE_CARD', { firstName: 'A' });
        await queueForSync('CREATE_CARD', { firstName: 'B' });

        const pending = await getPendingSync();
        expect(pending).toHaveLength(2);

        // Remove the first item
        await clearSyncItem(pending[0].id);

        const remaining = await getPendingSync();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].data.firstName).toBe('B');
    });

    it('getPendingSync returns empty array when no pending items', async () => {
        const result = await getPendingSync();
        expect(result).toEqual([]);
    });

    it('Dexie database version is 1', () => {
        // If Dexie 4 changes versioning API, this will catch it
        expect(db.verno).toBe(1);
    });
});
