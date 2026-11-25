import { useState, useEffect, useRef } from 'react';
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
} from 'react-icons/fa';

const DailyPageSpread = ({
    selectedDate,
    page,
    entries = [],
    access,
    onUpdateEntry,
    onDeleteEntry,
    onMigrateUnfinished,
    onSavePageNotes,
    onOpenContactHistory,
}) => {
    const { t } = useTranslation('pages');
    const isOwner = Boolean(access?.isOwner);
    const canWrite = isOwner || access?.permission === 'write';
    const actorUserId = Number(access?.actorUserId);
    const ownerId = Number(access?.ownerId);

    const [filterTab, setFilterTab] = useState('all');
    const [rightTab, setRightTab] = useState('shared'); // 'shared' | 'private'
    const [freeformNotes, setFreeformNotes] = useState(page?.freeformNotes || '');
    const [privateNotes, setPrivateNotes] = useState(page?.privateNotes || '');
    const [savingNotes, setSavingNotes] = useState(false);
    const [notesDirty, setNotesDirty] = useState(false);

    // Ref mutex prevents double PUT (false 409) when onBlur and Save button onClick fire together
    const savingMutexRef = useRef(false);
    const lastSyncedKeyRef = useRef('');

    useEffect(() => {
        if (!isOwner && rightTab === 'private') {
            setRightTab('shared');
        }
    }, [isOwner, rightTab]);

    useEffect(() => {
        const syncKey = `${selectedDate}:${ownerId}:${page?.id || 'new'}:${page?.version || 1}`;
        if (lastSyncedKeyRef.current !== syncKey) {
            setFreeformNotes(page?.freeformNotes || '');
            setPrivateNotes(page?.privateNotes || '');
            setNotesDirty(false);
            lastSyncedKeyRef.current = syncKey;
        }
    }, [selectedDate, ownerId, page?.id, page?.version, page?.freeformNotes, page?.privateNotes]);

    const filteredEntries = entries.filter((entry) => {
        if (filterTab === 'schedule') return Boolean(entry.timeSlot) || entry.entryType === 'schedule';
        if (filterTab === 'call') return entry.entryType === 'call' || entry.entryType === 'note';
        if (filterTab === 'task') return entry.entryType === 'task' || entry.entryType === 'follow_up';
        return true;
    });

    const openCount = entries.filter((e) => e.status === 'open').length;

    const handleSaveNotes = async () => {
        if (!canWrite || !notesDirty || savingMutexRef.current) return;
        savingMutexRef.current = true;
        setSavingNotes(true);
        const targetDate = selectedDate;
        const targetOwnerId = ownerId;
        try {
            await onSavePageNotes(
                {
                    freeformNotes,
                    ...(isOwner ? { privateNotes } : {}),
                    version: page?.id ? page.version : undefined,
                },
                targetDate,
                targetOwnerId,
            );
            setNotesDirty(false);
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
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
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
                    borderRadius: '16px 6px 6px 16px',
                    padding: '18px',
                    boxShadow: 'var(--glass-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '520px',
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
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                                    color: filterTab === tab.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontSize: '0.8rem',
                                    fontWeight: filterTab === tab.key ? 700 : 500,
                                    cursor: 'pointer',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {canWrite && openCount > 0 && (
                        <button
                            type="button"
                            onClick={onMigrateUnfinished}
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
                    )}
                </div>

                {/* Entries List */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                                {t('agenda.emptyPageTitle', 'Bu ajanda yaprağında henüz kayıt yok.')}
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
                            const createdByDelegate = entry.createdBy && Number(entry.createdBy.id) !== ownerId;
                            const canDeleteThisEntry =
                                canWrite &&
                                (isOwner || Number(entry.createdBy?.id || entry.createdByUserId) === actorUserId);

                            return (
                                <div
                                    key={entry.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: entry.isPrivate
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
                                    {/* Left: Status Mark Buttons + Time + Content */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
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
                                                    background: isDone ? 'var(--accent-success)' : 'transparent',
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
                                                    </span>
                                                )}

                                                <span
                                                    style={{
                                                        fontSize: '0.92rem',
                                                        color: 'var(--text-primary)',
                                                        textDecoration: isDone || isCancelled ? 'line-through' : 'none',
                                                        fontWeight: isDone ? 400 : 500,
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    {entry.content}
                                                </span>
                                            </div>

                                            {/* Badges Row: @Contacts, #Tags, Vekâleten, Migrated, Private */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '6px',
                                                    marginTop: '6px',
                                                    alignItems: 'center',
                                                }}
                                            >
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
                                                        {entry.createdBy.displayName || entry.createdBy.username}
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

                                    {/* Right: Quick Cancel & Delete Controls */}
                                    {canWrite && (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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

                                            {canDeleteThisEntry && (
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
                    borderRadius: '6px 16px 16px 6px',
                    padding: '18px',
                    boxShadow: 'var(--glass-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '520px',
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
                                background: rightTab === 'shared' ? 'var(--accent-primary-transparent)' : 'transparent',
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
                                    color: rightTab === 'private' ? 'var(--accent-warning)' : 'var(--text-secondary)',
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
                            onClick={handleSaveNotes}
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

                {rightTab === 'private' && isOwner ? (
                    <textarea
                        value={privateNotes}
                        onChange={(e) => {
                            setPrivateNotes(e.target.value);
                            setNotesDirty(true);
                        }}
                        onBlur={handleSaveNotes}
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
                        value={freeformNotes}
                        readOnly={!canWrite}
                        onChange={(e) => {
                            setFreeformNotes(e.target.value);
                            setNotesDirty(true);
                        }}
                        onBlur={handleSaveNotes}
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
    );
};

export default DailyPageSpread;
