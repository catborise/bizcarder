import Dexie from 'dexie';

export const db = new Dexie('BizCardOfflineDB');

db.version(1).stores({
    cards: 'id, firstName, lastName, company, email, phone, city',
    pendingSync: '++id, type, data, timestamp'
});

export const saveCardsToOffline = async (cards) => {
    try {
        await db.cards.clear();
        await db.cards.bulkAdd(cards);
    } catch (err) {
        console.error('Dexie Error (Save):', err);
    }
};

export const getOfflineCards = async () => {
    try {
        return await db.cards.toArray();
    } catch (err) {
        console.error('Dexie Error (Get):', err);
        return [];
    }
};

export const queueForSync = async (type, data) => {
    try {
        await db.pendingSync.add({
            type,
            data,
            timestamp: Date.now()
        });
    } catch (err) {
        console.error('Dexie Error (Queue):', err);
    }
};

export const clearSyncItem = async (id) => {
    try {
        await db.pendingSync.delete(id);
    } catch (err) {
        console.error('Dexie Error (Delete):', err);
    }
};

export const getPendingSync = async () => {
    try {
        return await db.pendingSync.toArray();
    } catch (err) {
        console.error('Dexie Error (GetPending):', err);
        return [];
    }
};
