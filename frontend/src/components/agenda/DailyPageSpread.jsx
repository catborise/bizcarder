import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FaCheck,
    FaArrowRight,
    FaTimes,
    FaTrash,
    FaLock,
    FaUserTag,
    FaClock,
    FaPhoneAlt,
    FaCheckSquare,
    FaStickyNote,
    FaSave,
    FaUserShield,
    FaEdit,
    FaExclamationTriangle,
    FaSlidersH,
    FaBell,
} from 'react-icons/fa';

function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
}

function addOneDay(dateStr) {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return '';
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}

function getNextBusinessDay(dateStr) {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return '';
    const dayOfWeek = d.getUTCDay(); // 5 = Friday, 6 = Saturday
    const add = dayOfWeek === 5 ? 3 : dayOfWeek === 6 ? 2 : 1;
    d.setUTCDate(d.getUTCDate() + add);
    return d.toISOString().slice(0, 10);
}

function toDatetimeLocalValue(isoOrDate) {
    if (!isoOrDate) return '';
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

const DailyPageSpread = ({
    selectedDate,
    page,
    entries = [],
    access,
    isLoading = false,
    isMobile = false,
    versionConflict = null,
    onResolveVersionConflict,
    onUpdateEntry,
    onDeleteEntry,
    onMigrateUnfinished,
    onSavePageNotes,
    onOpenContactHistory,
}) => {
    const { t, i18n } = useTranslation('pages');
    const isOwner = Boolean(access?.isOwner);
    const canWrite = Boolean(page) && (isOwner || access?.permission === 'write');
    const actorUserId = Number(access?.actorUserId);
    const ownerId = Number(access?.ownerId);
    const localeCode = (i18n.language || 'tr').startsWith('tr') ? 'tr-TR' : 'en-US';

    const [mobilePageTab, setMobilePageTab] = useState('left'); // 'left' | 'right'
    const [filterTab, setFilterTab] = useState('all');
    const [rightTab, setRightTab] = useState('shared'); // 'shared' | 'private'
    const [freeformNotes, setFreeformNotes] = useState(page?.freeformNotes || '');
    const [privateNotes, setPrivateNotes] = useState(page?.privateNotes || '');
    const [savingNotes, setSavingNotes] = useState(false);
    const [notesDirty, setNotesDirty] = useState(false);

    // P0-2: Inline entry editing / rescheduling state
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [submittingEdit, setSubmittingEdit] = useState(false);
    const [editDraft, setEditDraft] = useState({
        date: '',
        timeSlot: '',
        endTime: '',
        entryType: 'schedule',
        content: '',
        reminderAt: '',
        initialReminderAt: '',
    });

    // P0-3: Selective end-of-day rollover panel state
    const [showSelectiveRollover, setShowSelectiveRollover] = useState(false);
    const [submittingRollover, setSubmittingRollover] = useState(false);
    const [rolloverSelectedIds, setRolloverSelectedIds] = useState([]);
    const [rolloverTargetDate, setRolloverTargetDate] = useState('');
    const [clearScheduleTimes, setClearScheduleTimes] = useState(true);

    // P0-4: Per-context (ownerId:date) unsaved draft preservation with baseVersion tracking
    const draftsByContextRef = useRef({});
    const savingMutexRef = useRef(false);
    const lastSyncedKeyRef = useRef('');
    const contextKey = `${ownerId}:${selectedDate}`;

    useEffect(() => {
        if (!isOwner && rightTab === 'private') {
            setRightTab('shared');
        }
    }, [isOwner, rightTab]);

    // When page data arrives or date/owner changes, restore either unsaved draft for this context or server page
    useEffect(() => {
        const savedDraft = draftsByContextRef.current[contextKey];
        const syncKey = `${selectedDate}:${ownerId}:${page?.id || 'new'}:${page?.version || 1}`;
        if (savedDraft && savedDraft.dirty) {
            setFreeformNotes(savedDraft.freeformNotes);
            setPrivateNotes(savedDraft.privateNotes);
            setNotesDirty(true);
        } else if (lastSyncedKeyRef.current !== syncKey) {
            setFreeformNotes(page?.freeformNotes || '');
            setPrivateNotes(page?.privateNotes || '');
            setNotesDirty(false);
            lastSyncedKeyRef.current = syncKey;
        }
    }, [contextKey, selectedDate, ownerId, page?.id, page?.version, page?.freeformNotes, page?.privateNotes]);

    useEffect(() => {
        setEditingEntryId(null);
        setShowSelectiveRollover(false);
    }, [selectedDate, ownerId]);

    // P0-2: Compute overlapping open timed entries on the current day
    const conflictingEntryIds = useMemo(() => {
        const timedOpen = entries
            .filter((e) => e.status === 'open' && e.timeSlot)
            .map((e) => {
                const startMin = timeToMinutes(e.timeSlot);
                const endMinRaw = timeToMinutes(e.endTime);
                const endMin = endMinRaw !== null && endMinRaw > startMin ? endMinRaw : startMin + 30;
                return { id: e.id, startMin, endMin };
            })
            .filter((e) => e.startMin !== null);

        const conflicts = new Set();
        for (let i = 0; i < timedOpen.length; i++) {
            for (let j = i + 1; j < timedOpen.length; j++) {
                const a = timedOpen[i];
                const b = timedOpen[j];
                if (a.startMin < b.endMin && b.startMin < a.endMin) {
                    conflicts.add(a.id);
                    conflicts.add(b.id);
                }
            }
        }
        return conflicts;
    }, [entries]);

    const openEntries = useMemo(() => entries.filter((e) => e.status === 'open'), [entries]);
    const openCount = openEntries.length;

    const handleOpenSelectiveRollover = () => {
        if (!showSelectiveRollover) {
            // Default: select only tasks, follow_ups, calls, notes without timeSlot; leave timed appointments unchecked
            const defaultIds = openEntries.filter((e) => e.entryType !== 'schedule' && !e.timeSlot).map((e) => e.id);
            setRolloverSelectedIds(defaultIds);
            setRolloverTargetDate(getNextBusinessDay(selectedDate));
            setClearScheduleTimes(true);
        }
        setShowSelectiveRollover((prev) => !prev);
    };

    const handleConfirmSelectiveRollover = async () => {
        if (rolloverSelectedIds.length === 0 || submittingRollover) return;
        setSubmittingRollover(true);
        try {
            const ok = await onMigrateUnfinished({
                toDate: rolloverTargetDate || undefined,
                entryIds: rolloverSelectedIds,
                clearScheduleTimes,
            });
            if (ok !== false) {
                setShowSelectiveRollover(false);
            }
        } finally {
            setSubmittingRollover(false);
        }
    };

    const handleStartEditEntry = (entry) => {
        const initialRem = toDatetimeLocalValue(entry.reminderAt);
        setEditingEntryId(entry.id);
        setEditDraft({
            date: entry.date || selectedDate,
            timeSlot: entry.timeSlot || '',
            endTime: entry.endTime || '',
            entryType: entry.entryType || (entry.timeSlot ? 'schedule' : 'note'),
            content: entry.content || '',
            reminderAt: initialRem,
            initialReminderAt: initialRem,
        });
    };

    const handleSaveEditEntry = async (entryId) => {
        if (!editDraft.content.trim() || submittingEdit) return;
        if (editDraft.timeSlot && editDraft.endTime && editDraft.endTime < editDraft.timeSlot) {
            return;
        }
        setSubmittingEdit(true);
        try {
            const updates = {
                date: editDraft.date || selectedDate,
                timeSlot: editDraft.timeSlot || null,
                endTime: editDraft.endTime || null,
                entryType: editDraft.entryType,
                content: editDraft.content.trim(),
            };
            if (editDraft.reminderAt !== editDraft.initialReminderAt) {
                updates.reminderAt = editDraft.reminderAt ? new Date(editDraft.reminderAt).toISOString() : null;
            }
            const ok = await onUpdateEntry(entryId, updates);
            if (ok !== false) {
                setEditingEntryId(null);
            }
        } finally {
            setSubmittingEdit(false);
        }
    };

    const filteredEntries = entries.filter((entry) => {
        if (filterTab === 'schedule') return Boolean(entry.timeSlot) || entry.entryType === 'schedule';
        if (filterTab === 'call') return entry.entryType === 'call' || entry.entryType === 'note';
        if (filterTab === 'task') return entry.entryType === 'task' || entry.entryType === 'follow_up';
        return true;
    });

    const handleSaveNotes = async (overrideVersion) => {
        if (isLoading || !page || !canWrite || (!notesDirty && overrideVersion === undefined) || savingMutexRef.current)
            return;
        savingMutexRef.current = true;
        setSavingNotes(true);
        const targetDate = selectedDate;
        const targetOwnerId = ownerId;
        const targetKey = `${targetOwnerId}:${targetDate}`;
        try {
            const savedDraft = draftsByContextRef.current[targetKey];
            const baseVersion =
                savedDraft && savedDraft.baseVersion !== undefined
                    ? savedDraft.baseVersion
                    : page?.id
                      ? page.version
                      : undefined;
            const versionToSend = overrideVersion !== undefined ? overrideVersion : baseVersion;
            const ok = await onSavePageNotes(
                {
                    freeformNotes,
                    ...(isOwner ? { privateNotes } : {}),
                    version: versionToSend,
                },
                targetDate,
                targetOwnerId,
            );
            if (ok !== false) {
                delete draftsByContextRef.current[targetKey];
                setNotesDirty(false);
            }
        } finally {
            savingMutexRef.current = false;
            setSavingNotes(false);
        }
    };

    const getEntryTypeIcon = (type) => {
        if (type === 'schedule') return <FaClock size={12} color="var(--accent-primary)" />;
        if (type === 'call') return <FaPhoneAlt size={12} color="var(--accent-success)" />;
        if (type === 'task' || type === 'follow_up') return <FaCheckSquare size={12} color="var(--accent-warning)" />;
        return <FaStickyNote size={12} color="var(--text-secondary)" />;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Mobile-Friendly Segmented Switcher: Left Page (Schedule) <-> Right Page (Notepad) */}
            {isMobile && (
                <div
                    role="tablist"
                    aria-label={t('agenda.mobilePageSwitcherAria', 'Ajanda Sayfa Görünümü Seçimi')}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        padding: '5px',
                        borderRadius: '12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        boxShadow: 'var(--glass-shadow)',
                    }}
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mobilePageTab === 'left'}
                        onClick={() => setMobilePageTab('left')}
                        style={{
                            minHeight: '42px',
                            borderRadius: '9px',
                            border:
                                mobilePageTab === 'left' ? '1px solid var(--accent-primary)' : '1px solid transparent',
                            background: mobilePageTab === 'left' ? 'var(--accent-primary-transparent)' : 'transparent',
                            color: mobilePageTab === 'left' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                        }}
                    >
                        📋 {t('agenda.mobileTabSchedule', 'Günlük Program')} ({entries.length})
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={mobilePageTab === 'right'}
                        onClick={() => setMobilePageTab('right')}
                        style={{
                            minHeight: '42px',
                            borderRadius: '9px',
                            border:
                                mobilePageTab === 'right' ? '1px solid var(--accent-primary)' : '1px solid transparent',
                            background: mobilePageTab === 'right' ? 'var(--accent-primary-transparent)' : 'transparent',
                            color: mobilePageTab === 'right' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                        }}
                    >
                        📝 {t('agenda.mobileTabNotepad', 'Not Defteri')}
                        {freeformNotes?.trim() || privateNotes?.trim() ? ' •' : ''}
                    </button>
                </div>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
                    gap: '20px',
                    alignItems: 'stretch',
                }}
            >
                {/* LEFT PAGE: Daily Schedule, Phone Notes & Tasks */}
                <section
                    aria-label={t('agenda.leftPageTitle', 'Sol Sayfa: Günlük Program ve Kayıtlar')}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: isMobile ? '14px' : '16px 6px 6px 16px',
                        padding: isMobile ? '14px' : '18px',
                        boxShadow: 'var(--glass-shadow)',
                        display: isMobile && mobilePageTab !== 'left' ? 'none' : 'flex',
                        flexDirection: 'column',
                        minHeight: isMobile ? '360px' : '520px',
                    }}
                >
                    {/* Left Page Header & Filter Tabs */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                            paddingBottom: '12px',
                            marginBottom: '12px',
                            borderBottom: '2px solid var(--glass-border)',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {[
                                { key: 'all', label: `${t('agenda.tabAll', 'Tümü')} (${entries.length})` },
                                { key: 'schedule', label: t('agenda.tabSchedule', 'Saatli Program') },
                                { key: 'call', label: t('agenda.tabCalls', 'Telefon & Not') },
                                { key: 'task', label: t('agenda.tabTasks', 'Yapılacaklar') },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setFilterTab(tab.key)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border:
                                            filterTab === tab.key
                                                ? '1px solid var(--accent-primary)'
                                                : '1px solid var(--glass-border)',
                                        background:
                                            filterTab === tab.key ? 'var(--accent-primary-transparent)' : 'transparent',
                                        color:
                                            filterTab === tab.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        fontSize: '0.8rem',
                                        fontWeight: filterTab === tab.key ? 700 : 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}

                            {conflictingEntryIds.size > 0 && (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 9px',
                                        borderRadius: '999px',
                                        background: 'var(--accent-error-transparent)',
                                        color: 'var(--accent-error)',
                                        fontSize: '0.73rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    <FaExclamationTriangle size={11} />
                                    {t('agenda.timeConflictHeaderBadge', 'Saat Çakışması')} ({conflictingEntryIds.size})
                                </span>
                            )}
                        </div>

                        {canWrite && openCount > 0 && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => onMigrateUnfinished()}
                                    title={t(
                                        'agenda.migrateTooltip',
                                        'Bugün tamamlanmayan açık maddeleri tek tıkla ertesi günün sayfasına aktarır',
                                    )}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--accent-warning)',
                                        background: 'rgba(245, 158, 11, 0.14)',
                                        color: 'var(--accent-warning)',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <FaArrowRight size={11} />
                                    <span>
                                        {t('agenda.migrateBtn', 'Açıkları Yarına Devret')} ({openCount})
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleOpenSelectiveRollover}
                                    title={t(
                                        'agenda.selectiveMigrateTooltip',
                                        'Görevleri ve saatli randevuları seçerek istediğiniz güne devredin',
                                    )}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: showSelectiveRollover
                                            ? '1px solid var(--accent-primary)'
                                            : '1px solid var(--glass-border)',
                                        background: showSelectiveRollover
                                            ? 'var(--accent-primary-transparent)'
                                            : 'var(--glass-bg)',
                                        color: showSelectiveRollover
                                            ? 'var(--accent-primary)'
                                            : 'var(--text-secondary)',
                                        fontSize: '0.76rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <FaSlidersH size={11} />
                                    <span>{t('agenda.selectiveMigrateBtn', 'Seçerek Devret')}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* P0-3: Selective End-of-Day Rollover Panel */}
                    {showSelectiveRollover && canWrite && openCount > 0 && (
                        <div
                            style={{
                                padding: '12px 14px',
                                marginBottom: '12px',
                                borderRadius: '12px',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--accent-warning)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                fontSize: '0.82rem',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>
                                    {t('agenda.selectiveRolloverTitle', 'Günü Kapat & Açık İşleri Seçerek Devret')}
                                </strong>
                                <button
                                    type="button"
                                    onClick={() => setShowSelectiveRollover(false)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <FaTimes size={12} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                    <span>{t('agenda.rolloverTargetDateLabel', 'Devredilecek Tarih')}:</span>
                                    <input
                                        type="date"
                                        value={rolloverTargetDate}
                                        min={addOneDay(selectedDate)}
                                        onChange={(e) => setRolloverTargetDate(e.target.value)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--glass-border)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.8rem',
                                        }}
                                    />
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={clearScheduleTimes}
                                        onChange={(e) => setClearScheduleTimes(e.target.checked)}
                                    />
                                    <span>
                                        {t(
                                            'agenda.clearScheduleTimesOption',
                                            'Devredilen randevuların saatini sıfırla (yeni günde yeniden saat ver)',
                                        )}
                                    </span>
                                </label>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '5px',
                                    maxHeight: '160px',
                                    overflowY: 'auto',
                                    padding: '6px 0',
                                    borderTop: '1px dashed var(--glass-border)',
                                    borderBottom: '1px dashed var(--glass-border)',
                                }}
                            >
                                {openEntries.map((item) => {
                                    const checked = rolloverSelectedIds.includes(item.id);
                                    const isTimedSchedule = item.entryType === 'schedule' || Boolean(item.timeSlot);
                                    return (
                                        <label
                                            key={item.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                padding: '3px 4px',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    const next = e.target.checked
                                                        ? [...rolloverSelectedIds, item.id]
                                                        : rolloverSelectedIds.filter((id) => id !== item.id);
                                                    setRolloverSelectedIds(next);
                                                }}
                                            />
                                            <span
                                                style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    background: isTimedSchedule
                                                        ? 'var(--accent-primary-transparent)'
                                                        : 'rgba(245, 158, 11, 0.16)',
                                                    color: isTimedSchedule
                                                        ? 'var(--accent-primary)'
                                                        : 'var(--accent-warning)',
                                                }}
                                            >
                                                {isTimedSchedule
                                                    ? `${t('agenda.typeAppointment', 'Randevu')} ${item.timeSlot || ''}`
                                                    : t('agenda.typeTaskOrCall', 'Görev / Arama')}
                                            </span>
                                            <span style={{ flex: 1 }}>{item.content}</span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                    type="button"
                                    disabled={rolloverSelectedIds.length === 0}
                                    onClick={handleConfirmSelectiveRollover}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'var(--accent-warning)',
                                        color: '#111827',
                                        fontWeight: 700,
                                        fontSize: '0.79rem',
                                        cursor: rolloverSelectedIds.length === 0 ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {t('agenda.confirmSelectiveRolloverBtn', 'Seçilenleri Devret')} (
                                    {rolloverSelectedIds.length})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Entries List */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            opacity: isLoading ? 0.55 : 1,
                            transition: 'opacity 0.15s ease',
                        }}
                    >
                        {filteredEntries.length === 0 ? (
                            <div
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-tertiary)',
                                    padding: '36px 16px',
                                    textAlign: 'center',
                                    border: '1px dashed var(--glass-border)',
                                    borderRadius: '12px',
                                }}
                            >
                                <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600 }}>
                                    {isLoading
                                        ? t('agenda.loadingDayPage', 'Ajanda yaprağı yükleniyor...')
                                        : t('agenda.emptyPageTitle', 'Bu ajanda yaprağında henüz kayıt yok.')}
                                </p>
                                <p style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>
                                    {t(
                                        'agenda.emptyPageHint',
                                        'Yukarıdaki satıra doğrudan saat, @Kişi veya telefon notu yazıp Enter tuşuna basın.',
                                    )}
                                </p>
                            </div>
                        ) : (
                            filteredEntries.map((entry) => {
                                const isDone = entry.status === 'done';
                                const isMigrated = entry.status === 'migrated';
                                const isCancelled = entry.status === 'cancelled';
                                const hasTimeConflict = conflictingEntryIds.has(entry.id);
                                const createdByDelegate = entry.createdBy && Number(entry.createdBy.id) !== ownerId;
                                const canEditOrDeleteThisEntry =
                                    canWrite &&
                                    (isOwner || Number(entry.createdBy?.id || entry.createdByUserId) === actorUserId);
                                const isEditing = editingEntryId === entry.id;

                                return (
                                    <div
                                        key={entry.id}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: hasTimeConflict
                                                ? '1px solid var(--accent-error)'
                                                : entry.isPrivate
                                                  ? '1px solid rgba(245, 158, 11, 0.4)'
                                                  : '1px solid var(--glass-border)',
                                            background: isDone
                                                ? 'rgba(16, 185, 129, 0.06)'
                                                : isMigrated
                                                  ? 'rgba(245, 158, 11, 0.06)'
                                                  : 'var(--glass-bg)',
                                            opacity: isCancelled ? 0.55 : 1,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                justifyContent: 'space-between',
                                                gap: '10px',
                                            }}
                                        >
                                            {/* Left: Status Mark Buttons + Time + Content */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '10px',
                                                    flex: 1,
                                                }}
                                            >
                                                {canWrite && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onUpdateEntry(entry.id, {
                                                                status: isDone ? 'open' : 'done',
                                                            })
                                                        }
                                                        aria-label={
                                                            isDone
                                                                ? t('agenda.markOpen', 'Açık işaretle')
                                                                : t('agenda.markDone', 'Üstünü çiz / Tamamla')
                                                        }
                                                        title={
                                                            isDone
                                                                ? t('agenda.markOpen', 'Açık işaretle')
                                                                : t('agenda.markDone', 'Üstünü çiz / Tamamla (✓)')
                                                        }
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '6px',
                                                            border: isDone ? 'none' : '2px solid var(--text-tertiary)',
                                                            background: isDone
                                                                ? 'var(--accent-success)'
                                                                : 'transparent',
                                                            color: '#ffffff',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            marginTop: '2px',
                                                        }}
                                                    >
                                                        {isDone && <FaCheck size={11} />}
                                                    </button>
                                                )}

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            flexWrap: 'wrap',
                                                        }}
                                                    >
                                                        {getEntryTypeIcon(entry.entryType)}

                                                        {entry.timeSlot && (
                                                            <span
                                                                style={{
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 700,
                                                                    padding: '2px 7px',
                                                                    borderRadius: '6px',
                                                                    background: 'var(--accent-primary-transparent)',
                                                                    color: 'var(--accent-primary)',
                                                                }}
                                                            >
                                                                {entry.timeSlot}
                                                                {entry.endTime ? `–${entry.endTime}` : ''}
                                                            </span>
                                                        )}

                                                        <span
                                                            style={{
                                                                fontSize: '0.92rem',
                                                                color: 'var(--text-primary)',
                                                                textDecoration:
                                                                    isDone || isCancelled ? 'line-through' : 'none',
                                                                fontWeight: isDone ? 400 : 500,
                                                                wordBreak: 'break-word',
                                                            }}
                                                        >
                                                            {entry.content}
                                                        </span>
                                                    </div>

                                                    {/* Badges Row: Conflict, @Contacts, #Tags, Vekâleten, Migrated, Reminder, Private */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: '6px',
                                                            marginTop: '6px',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        {hasTimeConflict && (
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '2px 7px',
                                                                    borderRadius: '999px',
                                                                    background: 'var(--accent-error-transparent)',
                                                                    color: 'var(--accent-error)',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                <FaExclamationTriangle size={9} />
                                                                {t('agenda.timeConflictBadge', 'Saat Çakışması')}
                                                            </span>
                                                        )}

                                                        {entry.isPrivate && (
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '2px 7px',
                                                                    borderRadius: '999px',
                                                                    background: 'rgba(245, 158, 11, 0.2)',
                                                                    color: 'var(--accent-warning)',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                <FaLock size={9} />
                                                                {t('agenda.privateBadge', 'Özel Not')}
                                                            </span>
                                                        )}

                                                        {entry.migratedFromEntryId && (
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '2px 7px',
                                                                    borderRadius: '999px',
                                                                    background: 'rgba(245, 158, 11, 0.16)',
                                                                    color: 'var(--accent-warning)',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                ↩{' '}
                                                                {t(
                                                                    'agenda.rolledOverFromPrevBadge',
                                                                    'Önceki Günden Devir',
                                                                )}
                                                            </span>
                                                        )}

                                                        {entry.reminderAt && (
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '2px 7px',
                                                                    borderRadius: '999px',
                                                                    background: 'var(--accent-primary-transparent)',
                                                                    color: 'var(--accent-primary)',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                <FaBell size={9} />
                                                                {new Date(entry.reminderAt).toLocaleString(localeCode, {
                                                                    month: '2-digit',
                                                                    day: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                        )}

                                                        {createdByDelegate && (
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '999px',
                                                                    background: 'rgba(59, 130, 246, 0.16)',
                                                                    color: 'var(--accent-primary)',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                <FaUserShield size={10} />
                                                                {t('agenda.createdByDelegate', 'Vekâleten')}:{' '}
                                                                {entry.createdBy.displayName ||
                                                                    entry.createdBy.username}
                                                            </span>
                                                        )}

                                                        {isMigrated && (
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '2px 7px',
                                                                    borderRadius: '999px',
                                                                    background: 'rgba(245, 158, 11, 0.18)',
                                                                    color: 'var(--accent-warning)',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                →{' '}
                                                                {entry.migratedToDate ||
                                                                    t('agenda.migratedLabel', 'Devredildi')}
                                                            </span>
                                                        )}

                                                        {(entry.contactLinks || []).map((link) => (
                                                            <button
                                                                key={link.id || link.displayNameSnapshot}
                                                                type="button"
                                                                onClick={() =>
                                                                    link.cardId && onOpenContactHistory
                                                                        ? onOpenContactHistory(
                                                                              link.cardId,
                                                                              link.displayNameSnapshot,
                                                                              link.card,
                                                                          )
                                                                        : null
                                                                }
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '999px',
                                                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                                                    background: 'rgba(16, 185, 129, 0.14)',
                                                                    color: 'var(--accent-success)',
                                                                    fontSize: '0.73rem',
                                                                    fontWeight: 600,
                                                                    cursor: link.cardId ? 'pointer' : 'default',
                                                                }}
                                                            >
                                                                <FaUserTag size={10} />@{link.displayNameSnapshot}
                                                            </button>
                                                        ))}

                                                        {(entry.tags || []).map((tag) => (
                                                            <span
                                                                key={tag.id || tag.name}
                                                                style={{
                                                                    padding: '2px 7px',
                                                                    borderRadius: '999px',
                                                                    background: `${tag.color || '#3b82f6'}22`,
                                                                    color: tag.color || '#3b82f6',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                #{tag.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Edit/Reschedule, Quick Cancel & Delete Controls */}
                                            {canWrite && (
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    {canEditOrDeleteThisEntry && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                isEditing
                                                                    ? setEditingEntryId(null)
                                                                    : handleStartEditEntry(entry)
                                                            }
                                                            title={t(
                                                                'agenda.editRescheduleEntry',
                                                                'Düzenle / Yeniden Planla',
                                                            )}
                                                            aria-label={t(
                                                                'agenda.editRescheduleEntry',
                                                                'Düzenle / Yeniden Planla',
                                                            )}
                                                            style={{
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: isEditing
                                                                    ? 'var(--accent-primary)'
                                                                    : 'var(--text-tertiary)',
                                                                cursor: 'pointer',
                                                                padding: '4px',
                                                            }}
                                                        >
                                                            <FaEdit size={12} />
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onUpdateEntry(entry.id, {
                                                                status: isCancelled ? 'open' : 'cancelled',
                                                            })
                                                        }
                                                        title={t('agenda.cancelToggle', 'İptal işareti (✗)')}
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: isCancelled
                                                                ? 'var(--accent-warning)'
                                                                : 'var(--text-tertiary)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                        }}
                                                    >
                                                        <FaTimes size={12} />
                                                    </button>

                                                    {canEditOrDeleteThisEntry && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onDeleteEntry(entry.id)}
                                                            title={t('agenda.deleteEntry', 'Kaydı Sil')}
                                                            style={{
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: 'var(--accent-error)',
                                                                cursor: 'pointer',
                                                                padding: '4px',
                                                            }}
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* P0-2: Inline Entry Edit & Reschedule Form */}
                                        {isEditing && (
                                            <div
                                                style={{
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--accent-primary)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                                        gap: '8px',
                                                    }}
                                                >
                                                    <div>
                                                        <label
                                                            style={{
                                                                display: 'block',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                marginBottom: '2px',
                                                            }}
                                                        >
                                                            {t('agenda.editDateLabel', 'Tarih')}
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={editDraft.date}
                                                            onChange={(e) =>
                                                                setEditDraft((prev) => ({
                                                                    ...prev,
                                                                    date: e.target.value,
                                                                }))
                                                            }
                                                            style={{
                                                                width: '100%',
                                                                padding: '5px 7px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: 'var(--bg-input)',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '0.8rem',
                                                            }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label
                                                            style={{
                                                                display: 'block',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                marginBottom: '2px',
                                                            }}
                                                        >
                                                            {t('agenda.editStartTimeLabel', 'Başlangıç Saati')}
                                                        </label>
                                                        <input
                                                            type="time"
                                                            value={editDraft.timeSlot}
                                                            onChange={(e) =>
                                                                setEditDraft((prev) => ({
                                                                    ...prev,
                                                                    timeSlot: e.target.value,
                                                                }))
                                                            }
                                                            style={{
                                                                width: '100%',
                                                                padding: '5px 7px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: 'var(--bg-input)',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '0.8rem',
                                                            }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label
                                                            style={{
                                                                display: 'block',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                marginBottom: '2px',
                                                            }}
                                                        >
                                                            {t('agenda.editEndTimeLabel', 'Bitiş Saati')}
                                                        </label>
                                                        <input
                                                            type="time"
                                                            value={editDraft.endTime}
                                                            onChange={(e) =>
                                                                setEditDraft((prev) => ({
                                                                    ...prev,
                                                                    endTime: e.target.value,
                                                                }))
                                                            }
                                                            style={{
                                                                width: '100%',
                                                                padding: '5px 7px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: 'var(--bg-input)',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '0.8rem',
                                                            }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label
                                                            style={{
                                                                display: 'block',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                marginBottom: '2px',
                                                            }}
                                                        >
                                                            {t('agenda.editCategoryLabel', 'Tür')}
                                                        </label>
                                                        <select
                                                            value={editDraft.entryType}
                                                            onChange={(e) =>
                                                                setEditDraft((prev) => ({
                                                                    ...prev,
                                                                    entryType: e.target.value,
                                                                }))
                                                            }
                                                            style={{
                                                                width: '100%',
                                                                padding: '5px 7px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: 'var(--bg-input)',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '0.8rem',
                                                            }}
                                                        >
                                                            <option value="schedule">
                                                                {t('agenda.typeAppointment', 'Saatli Randevu')}
                                                            </option>
                                                            <option value="call">
                                                                {t('agenda.typeCall', 'Telefon / Geri Arama')}
                                                            </option>
                                                            <option value="task">
                                                                {t('agenda.typeTask', 'Yapılacak Görev')}
                                                            </option>
                                                            <option value="follow_up">
                                                                {t('agenda.typeFollowUp', 'Takip')}
                                                            </option>
                                                            <option value="note">{t('agenda.typeNote', 'Not')}</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label
                                                            style={{
                                                                display: 'block',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                marginBottom: '2px',
                                                            }}
                                                        >
                                                            {t('agenda.editReminderLabel', 'Hatırlatma Zamanı')}
                                                        </label>
                                                        <input
                                                            type="datetime-local"
                                                            value={editDraft.reminderAt}
                                                            onChange={(e) =>
                                                                setEditDraft((prev) => ({
                                                                    ...prev,
                                                                    reminderAt: e.target.value,
                                                                }))
                                                            }
                                                            style={{
                                                                width: '100%',
                                                                padding: '5px 7px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: 'var(--bg-input)',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '0.78rem',
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <input
                                                    type="text"
                                                    value={editDraft.content}
                                                    onChange={(e) =>
                                                        setEditDraft((prev) => ({ ...prev, content: e.target.value }))
                                                    }
                                                    style={{
                                                        width: '100%',
                                                        padding: '7px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--glass-border)',
                                                        background: 'var(--bg-input)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '0.86rem',
                                                    }}
                                                />

                                                <div
                                                    style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingEntryId(null)}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--glass-border)',
                                                            background: 'transparent',
                                                            color: 'var(--text-secondary)',
                                                            fontSize: '0.78rem',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {t('agenda.cancelEditBtn', 'Vazgeç')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveEditEntry(entry.id)}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            background: 'var(--accent-primary)',
                                                            color: '#ffffff',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {t('agenda.saveEditBtn', 'Değişiklikleri Kaydet')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* RIGHT PAGE: Lined Freeform Notepad & Owner-Only Private Scratchpad */}
                <section
                    aria-label={t('agenda.rightPageTitle', 'Sağ Sayfa: Serbest Çizgili Not Defteri')}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: isMobile ? '14px' : '6px 16px 16px 6px',
                        padding: isMobile ? '14px' : '18px',
                        boxShadow: 'var(--glass-shadow)',
                        display: isMobile && mobilePageTab !== 'right' ? 'none' : 'flex',
                        flexDirection: 'column',
                        minHeight: isMobile ? '360px' : '520px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px',
                            paddingBottom: '12px',
                            marginBottom: '12px',
                            borderBottom: '2px solid var(--glass-border)',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setRightTab('shared')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border:
                                        rightTab === 'shared'
                                            ? '1px solid var(--accent-primary)'
                                            : '1px solid var(--glass-border)',
                                    background:
                                        rightTab === 'shared' ? 'var(--accent-primary-transparent)' : 'transparent',
                                    color: rightTab === 'shared' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                📝 {t('agenda.freeformNotepadTab', 'Günlük Serbest Not Sayfası')}
                            </button>

                            {isOwner && (
                                <button
                                    type="button"
                                    onClick={() => setRightTab('private')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border:
                                            rightTab === 'private'
                                                ? '1px solid var(--accent-warning)'
                                                : '1px solid var(--glass-border)',
                                        background: rightTab === 'private' ? 'rgba(245, 158, 11, 0.16)' : 'transparent',
                                        color:
                                            rightTab === 'private' ? 'var(--accent-warning)' : 'var(--text-secondary)',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <FaLock size={11} />
                                    <span>{t('agenda.privateNotepadTab', 'Özel Karalama (Gizli)')}</span>
                                </button>
                            )}
                        </div>

                        {canWrite && (
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSaveNotes()}
                                disabled={!notesDirty || savingNotes}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: notesDirty ? 'var(--accent-success)' : 'var(--glass-bg)',
                                    color: notesDirty ? '#ffffff' : 'var(--text-tertiary)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: notesDirty ? 'pointer' : 'default',
                                }}
                            >
                                <FaSave size={12} />
                                <span>
                                    {savingNotes
                                        ? t('agenda.savingNotes', 'Kaydediliyor...')
                                        : notesDirty
                                          ? t('agenda.saveNotesBtn', 'Sayfayı Kaydet')
                                          : t('agenda.savedNotesLabel', 'Kaydedildi')}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* P0-4: 409 Version Conflict Recovery Banner */}
                    {versionConflict && (
                        <div
                            role="alert"
                            style={{
                                padding: '10px 12px',
                                marginBottom: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--accent-warning)',
                                background: 'rgba(245, 158, 11, 0.14)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                fontSize: '0.81rem',
                            }}
                        >
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                ⚠️{' '}
                                {t(
                                    'agenda.conflictRecoveryTitle',
                                    'Bu not sayfası başka bir sekmede veya kullanıcı tarafından güncellendi.',
                                )}
                            </div>
                            {versionConflict.currentPage?.freeformNotes && (
                                <div
                                    style={{
                                        padding: '6px 8px',
                                        borderRadius: '6px',
                                        background: 'var(--bg-card)',
                                        border: '1px dashed var(--glass-border)',
                                        fontSize: '0.76rem',
                                        color: 'var(--text-secondary)',
                                        maxHeight: '64px',
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    <strong>{t('agenda.serverLatestPreview', 'Sunucudaki Son Metin')}:</strong>{' '}
                                    {versionConflict.currentPage.freeformNotes}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => handleSaveNotes(versionConflict.currentVersion)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'var(--accent-warning)',
                                        color: '#111827',
                                        fontWeight: 700,
                                        fontSize: '0.76rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t('agenda.conflictKeepMineBtn', 'Benim Taslağımı Kaydet (Üzerine Yaz)')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        delete draftsByContextRef.current[contextKey];
                                        if (versionConflict.currentPage) {
                                            setFreeformNotes(versionConflict.currentPage.freeformNotes || '');
                                            if (isOwner) {
                                                setPrivateNotes(versionConflict.currentPage.privateNotes || '');
                                            }
                                        }
                                        setNotesDirty(false);
                                        if (onResolveVersionConflict) onResolveVersionConflict();
                                    }}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                        fontWeight: 600,
                                        fontSize: '0.76rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t('agenda.conflictLoadServerBtn', 'Sunucudaki Son Hali Yükle')}
                                </button>
                            </div>
                        </div>
                    )}

                    {rightTab === 'private' && isOwner ? (
                        <textarea
                            aria-label={t('agenda.privateNotepadTab', 'Özel Karalama (Gizli)')}
                            value={privateNotes}
                            readOnly={!canWrite}
                            onChange={(e) => {
                                const nextVal = e.target.value;
                                const existing = draftsByContextRef.current[contextKey];
                                setPrivateNotes(nextVal);
                                setNotesDirty(true);
                                draftsByContextRef.current[contextKey] = {
                                    freeformNotes,
                                    privateNotes: nextVal,
                                    baseVersion:
                                        existing && existing.baseVersion !== undefined
                                            ? existing.baseVersion
                                            : page?.id
                                              ? page.version
                                              : undefined,
                                    dirty: true,
                                };
                            }}
                            onBlur={() => handleSaveNotes()}
                            placeholder={t(
                                'agenda.privateNotesPlaceholder',
                                '🔒 Bu alana yazdığınız özel notlar yalnızca size görünür. Vekil sekreter veya sayfa paylaşım linki bu alanı asla göremez...',
                            )}
                            style={{
                                flex: 1,
                                width: '100%',
                                resize: 'vertical',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                background:
                                    'repeating-linear-gradient(transparent, transparent 27px, rgba(245, 158, 11, 0.08) 28px)',
                                lineHeight: '28px',
                                color: 'var(--text-primary)',
                                fontSize: '0.93rem',
                                fontFamily: 'var(--font-family)',
                            }}
                        />
                    ) : (
                        <textarea
                            aria-label={t('agenda.freeformNotepadTab', 'Günlük Serbest Not Sayfası')}
                            value={freeformNotes}
                            readOnly={!canWrite}
                            onChange={(e) => {
                                const nextVal = e.target.value;
                                const existing = draftsByContextRef.current[contextKey];
                                setFreeformNotes(nextVal);
                                setNotesDirty(true);
                                draftsByContextRef.current[contextKey] = {
                                    freeformNotes: nextVal,
                                    privateNotes,
                                    baseVersion:
                                        existing && existing.baseVersion !== undefined
                                            ? existing.baseVersion
                                            : page?.id
                                              ? page.version
                                              : undefined,
                                    dirty: true,
                                };
                            }}
                            onBlur={() => handleSaveNotes()}
                            placeholder={t(
                                'agenda.freeformNotesPlaceholder',
                                'Fiziksel ajandanın sağ yaprağı gibi serbest telefon notlarınızı, yönetici talimatlarını veya toplantı özetlerini buraya yazabilirsiniz (Odaktan çıkınca otomatik kaydedilir)...',
                            )}
                            style={{
                                flex: 1,
                                width: '100%',
                                resize: 'vertical',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                background:
                                    'repeating-linear-gradient(transparent, transparent 27px, var(--glass-border) 28px)',
                                lineHeight: '28px',
                                color: 'var(--text-primary)',
                                fontSize: '0.93rem',
                                fontFamily: 'var(--font-family)',
                            }}
                        />
                    )}
                </section>
            </div>
        </div>
    );
};

export default DailyPageSpread;
