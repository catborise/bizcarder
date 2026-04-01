import { useEffect } from 'react';

const DRAFT_KEY = 'bizcard_draft';

export function loadDraft() {
    try {
        const draft = localStorage.getItem(DRAFT_KEY);
        return draft ? JSON.parse(draft) : null;
    } catch {
        return null;
    }
}

export function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
}

export function useCardDraft(formData, activeCard) {
    // Auto-save draft when creating new card
    useEffect(() => {
        if (!activeCard) {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        }
    }, [formData, activeCard]);
}
