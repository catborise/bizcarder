import { useState, useCallback } from 'react';

const STORAGE_KEY = 'dashboard_prefs';

const DEFAULT_WIDGETS = [
    { id: 'banner', label: 'Banner', visible: true },
    { id: 'quickActions', label: 'Quick Actions', visible: true },
    { id: 'search', label: 'Quick Search', visible: true },
    { id: 'stats', label: 'Statistics', visible: true },
    { id: 'tags', label: 'Frequent Tags', visible: true },
    { id: 'coreTiles', label: 'Navigation Shortcuts', visible: true },
    { id: 'customTiles', label: 'Custom Tiles', visible: true },
];

function loadPrefs() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return DEFAULT_WIDGETS;
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new widgets added after user saved prefs
        return DEFAULT_WIDGETS.map(dw => {
            const found = parsed.find(p => p.id === dw.id);
            return found ? { ...dw, visible: found.visible, order: found.order } : dw;
        }).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    } catch {
        return DEFAULT_WIDGETS;
    }
}

export default function useDashboardPrefs() {
    const [widgets, setWidgets] = useState(loadPrefs);

    const toggleWidget = useCallback((id) => {
        setWidgets(prev => {
            const updated = prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const moveWidget = useCallback((id, direction) => {
        setWidgets(prev => {
            const idx = prev.findIndex(w => w.id === id);
            if (idx < 0) return prev;
            const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(prev.length - 1, idx + 1);
            if (idx === newIdx) return prev;
            const updated = [...prev];
            [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
            const ordered = updated.map((w, i) => ({ ...w, order: i }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ordered));
            return ordered;
        });
    }, []);

    const resetPrefs = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setWidgets(DEFAULT_WIDGETS);
    }, []);

    const isVisible = useCallback((id) => {
        return widgets.find(w => w.id === id)?.visible ?? true;
    }, [widgets]);

    return { widgets, toggleWidget, moveWidget, resetPrefs, isVisible };
}
