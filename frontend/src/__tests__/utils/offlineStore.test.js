import 'fake-indexeddb/auto';
import {
    db,
    saveCardsToOffline,
    getOfflineCards,
    queueForSync,
    getPendingSync,
    clearSyncItem,
    clearOfflineStore,
} from '../../utils/offlineStore';

describe('offlineStore (Dexie / IndexedDB)', () => {
    beforeEach(async () => {
        await clearOfflineStore();
    });

    afterAll(async () => {
        await clearOfflineStore();
        await db.close();
    });

    it('saves and retrieves offline cards, replacing previous snapshot', async () => {
        await saveCardsToOffline([
            { id: 1, firstName: 'Ali', lastName: 'Yilmaz', company: 'Acme', email: 'ali@acme.com' },
            { id: 2, firstName: 'Ayse', lastName: 'Kaya', company: 'Beta', email: 'ayse@beta.com' },
        ]);

        let cards = await getOfflineCards();
        expect(cards).toHaveLength(2);
        expect(cards.map((c) => c.id)).toEqual([1, 2]);

        // Overwrite with new snapshot
        await saveCardsToOffline([{ id: 3, firstName: 'Can', lastName: 'Demir' }]);
        cards = await getOfflineCards();
        expect(cards).toHaveLength(1);
        expect(cards[0].id).toBe(3);
    });

    it('queues pending sync actions and removes individual items by id', async () => {
        await queueForSync('CREATE_CARD', { firstName: 'Offline', lastName: 'One' });
        await queueForSync('CREATE_CARD', { firstName: 'Offline', lastName: 'Two' });

        let pending = await getPendingSync();
        expect(pending).toHaveLength(2);
        expect(pending[0].type).toBe('CREATE_CARD');
        expect(pending[0].data.firstName).toBe('Offline');
        expect(typeof pending[0].timestamp).toBe('number');

        await clearSyncItem(pending[0].id);

        pending = await getPendingSync();
        expect(pending).toHaveLength(1);
        expect(pending[0].data.lastName).toBe('Two');
    });

    it('clearOfflineStore wipes both cached cards and pendingSync queue (PII cleanup on logout)', async () => {
        await saveCardsToOffline([{ id: 10, firstName: 'Secret', lastName: 'Contact' }]);
        await queueForSync('CREATE_CARD', { firstName: 'Queued', lastName: 'PII' });

        await clearOfflineStore();

        expect(await getOfflineCards()).toEqual([]);
        expect(await getPendingSync()).toEqual([]);
    });
});
