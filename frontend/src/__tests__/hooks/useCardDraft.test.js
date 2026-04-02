import { describe, it, expect, beforeEach } from 'vitest';
import { loadDraft, clearDraft } from '../../hooks/useCardDraft';

describe('useCardDraft', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('loadDraft returns null when no draft exists', () => {
        expect(loadDraft()).toBeNull();
    });

    it('loadDraft returns parsed draft when exists', () => {
        const data = { firstName: 'John', email: 'john@test.com' };
        localStorage.setItem('bizcard_draft', JSON.stringify(data));
        expect(loadDraft()).toEqual(data);
    });

    it('clearDraft removes draft from localStorage', () => {
        localStorage.setItem('bizcard_draft', JSON.stringify({ test: true }));
        clearDraft();
        expect(localStorage.getItem('bizcard_draft')).toBeNull();
    });

    it('loadDraft returns null for malformed JSON', () => {
        localStorage.setItem('bizcard_draft', '{broken');
        expect(loadDraft()).toBeNull();
    });
});
