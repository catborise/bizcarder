import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FaLock,
    FaLockOpen,
    FaPlus,
    FaUserTag,
    FaClock,
    FaPhoneAlt,
    FaCheckSquare,
    FaStickyNote,
    FaBell,
    FaMicrophone,
    FaMicrophoneSlash,
    FaTimes,
} from 'react-icons/fa';

const QUICK_TIME_PRESETS = ['09:30', '11:00', '14:00', '15:30', '17:00'];

function shiftDateStr(dateStr, deltaDays) {
    const base = dateStr || new Date().toISOString().slice(0, 10);
    const d = new Date(`${base}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return base;
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
}

function buildPresetReminderIso(presetKey, selectedDate) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const baseDate = selectedDate || todayStr;
    if (presetKey === 'plus1h') {
        return new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
    if (presetKey === 'today16') {
        return new Date(`${baseDate}T16:00:00`).toISOString();
    }
    if (presetKey === 'tomorrow09') {
        const nextDay = shiftDateStr(baseDate, 1);
        return new Date(`${nextDay}T09:00:00`).toISOString();
    }
    return null;
}

const QuickEntryBar = ({
    contacts = [],
    tags = [],
    isOwner = true,
    canWrite = true,
    ownerId,
    selectedDate,
    onCreateEntry,
    inputRef: externalRef,
}) => {
    const { t, i18n } = useTranslation('pages');
    const internalRef = useRef(null);
    const inputRef = externalRef || internalRef;
    const recognitionRef = useRef(null);

    const [content, setContent] = useState('');
    const [entryType, setEntryType] = useState('auto');
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [mentionQuery, setMentionQuery] = useState(null);
    const [showContactPicker, setShowContactPicker] = useState(false);
    const [contactPickerSearch, setContactPickerSearch] = useState('');
    const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Mobile-friendly 1-tap chips state
    const [quickTimeSlot, setQuickTimeSlot] = useState('');
    const [quickReminderPreset, setQuickReminderPreset] = useState(''); // '' | 'plus1h' | 'today16' | 'tomorrow09'
    const [isListening, setIsListening] = useState(false);

    const ownerIdRef = useRef(ownerId);
    ownerIdRef.current = ownerId;

    useEffect(() => {
        if (!isOwner) {
            setIsPrivate(false);
        }
    }, [isOwner]);

    // Clear draft and stop any active voice recognition session when switching between agendas
    useEffect(() => {
        if (recognitionRef.current) {
            try {
                if (typeof recognitionRef.current.abort === 'function') {
                    recognitionRef.current.abort();
                } else {
                    recognitionRef.current.stop();
                }
            } catch {
                // ignore
            }
            recognitionRef.current = null;
        }
        setIsListening(false);
        setContent('');
        setSelectedContacts([]);
        setSelectedTags([]);
        setIsPrivate(false);
        setEntryType('auto');
        setMentionQuery(null);
        setShowContactPicker(false);
        setContactPickerSearch('');
        setQuickTimeSlot('');
        setQuickReminderPreset('');
    }, [ownerId]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    // ignore
                }
            }
        };
    }, []);

    // Live parsed preview from inline text + 1-tap chips (identical precedence to backend parseInlineSyntax)
    const livePreview = useMemo(() => {
        const raw = content.trim();
        let textAfterTime = raw;
        const timeMatch = raw.match(/^([01]?\d|2[0-3])[:.]([0-5]\d)\s+([\s\S]+)$/);
        const inlineTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;
        if (timeMatch) {
            textAfterTime = timeMatch[3].trim();
        }
        const effectiveTime = quickTimeSlot || inlineTime;

        const baseDate = selectedDate || new Date().toISOString().slice(0, 10);
        const remMatch = raw.match(
            /(?:^|\s)!(yarın|yarin|tomorrow|bugün|bugun|today|\d{4}-\d{2}-\d{2})(?:\s+([01]?\d|2[0-3])[:.]([0-5]\d))?(?=\s|$)/i,
        );
        let reminderLabel = null;
        if (quickReminderPreset === 'plus1h') {
            reminderLabel = t('agenda.remPresetPlus1h', '+1 Saat');
        } else if (quickReminderPreset === 'today16') {
            reminderLabel = `${t('agenda.remPresetToday16', 'Bugün 16:00')} (${baseDate})`;
        } else if (quickReminderPreset === 'tomorrow09') {
            reminderLabel = `${t('agenda.remPresetTomorrow09', 'Yarın 09:00')} (${shiftDateStr(baseDate, 1)})`;
        } else if (remMatch) {
            reminderLabel = `!${remMatch[1]}${remMatch[2] ? ` ${remMatch[2].padStart(2, '0')}:${remMatch[3]}` : ' 09:00'}`;
        }

        const isTaskPrefix = textAfterTime.startsWith('[] ') || textAfterTime.startsWith('[ ] ');
        const isCallPrefix = textAfterTime.startsWith('☎ ') || textAfterTime.toLowerCase().startsWith('[arama] ');

        const effectiveType =
            entryType !== 'auto'
                ? entryType
                : isTaskPrefix
                  ? 'task'
                  : isCallPrefix
                    ? 'call'
                    : effectiveTime
                      ? 'schedule'
                      : 'note';

        return {
            effectiveTime,
            effectiveType,
            reminderLabel,
            hasAnySignal:
                Boolean(raw) ||
                Boolean(effectiveTime) ||
                Boolean(reminderLabel) ||
                selectedContacts.length > 0 ||
                selectedTags.length > 0,
        };
    }, [
        content,
        quickTimeSlot,
        quickReminderPreset,
        entryType,
        selectedDate,
        selectedContacts.length,
        selectedTags.length,
        t,
    ]);

    if (!canWrite) return null;

    const handleToggleVoiceInput = () => {
        const SpeechRecognition =
            typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
        if (!SpeechRecognition) return;

        if (isListening && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore
            }
            setIsListening(false);
            return;
        }

        try {
            const sessionOwnerId = ownerId;
            const recognition = new SpeechRecognition();
            recognition.lang = (i18n.language || 'tr').startsWith('tr') ? 'tr-TR' : 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onresult = (event) => {
                if (Number(sessionOwnerId) !== Number(ownerIdRef.current)) return;
                const transcript = event.results?.[0]?.[0]?.transcript?.trim();
                if (transcript) {
                    setContent((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
                    inputRef.current?.focus();
                }
            };
            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);

            recognitionRef.current = recognition;
            setIsListening(true);
            recognition.start();
        } catch {
            setIsListening(false);
        }
    };

    const hasSpeechSupport =
        typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

    const handleTextChange = (e) => {
        const val = e.target.value;
        setContent(val);

        // Detect trailing @token (no spaces inside query token so completed '@Ahmet Yılmaz ' closes dropdown)
        const atMatch = val.match(/(?:^|\s)@([\p{L}\p{N}._-]{1,30})$/u);
        if (atMatch) {
            setMentionQuery(atMatch[1].toLowerCase().trim());
            setActiveSuggestionIdx(0);
        } else {
            setMentionQuery(null);
        }
    };

    const effectiveQuery =
        mentionQuery !== null ? mentionQuery : showContactPicker ? contactPickerSearch.toLowerCase().trim() : null;

    const matchingContacts =
        effectiveQuery !== null
            ? contacts
                  .filter((c) => {
                      const full =
                          `${c.firstName || ''} ${c.lastName || ''} ${c.company || ''} ${c.phone || ''}`.toLowerCase();
                      return !effectiveQuery || full.includes(effectiveQuery);
                  })
                  .slice(0, 8)
            : [];

    const handleSelectMention = (card) => {
        const fullName = `${card.firstName || ''} ${card.lastName || ''}`.trim() || card.company;
        if (!selectedContacts.some((sc) => sc.id === card.id)) {
            setSelectedContacts((prev) => [...prev, { id: card.id, displayName: fullName }]);
        }
        if (mentionQuery !== null) {
            setContent((prev) =>
                prev.replace(/(?:^|\s)@[\p{L}\p{N}._-]{1,30}$/u, (m) => `${m.startsWith(' ') ? ' ' : ''}@${fullName} `),
            );
        } else if (!content.includes(`@${fullName}`)) {
            setContent((prev) => (prev.trim() ? `${prev.trim()} @${fullName} ` : `@${fullName} `));
        }
        setMentionQuery(null);
        setShowContactPicker(false);
        setContactPickerSearch('');
        setActiveSuggestionIdx(0);
        inputRef.current?.focus();
    };

    const handleInputKeyDown = (e) => {
        if (matchingContacts.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIdx((prev) => (prev + 1) % matchingContacts.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIdx((prev) => (prev - 1 + matchingContacts.length) % matchingContacts.length);
        } else if (e.key === 'Enter' && matchingContacts[activeSuggestionIdx] && mentionQuery !== null) {
            e.preventDefault();
            handleSelectMention(matchingContacts[activeSuggestionIdx]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setMentionQuery(null);
            setShowContactPicker(false);
        }
    };

    const toggleTag = (tag) => {
        setSelectedTags((prev) =>
            prev.some((tItem) => tItem.id === tag.id) ? prev.filter((tItem) => tItem.id !== tag.id) : [...prev, tag],
        );
    };

    const removeContactChip = (cardId) => {
        setSelectedContacts((prev) => prev.filter((c) => c.id !== cardId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() || submitting) return;

        setSubmitting(true);
        try {
            const reminderIso = quickReminderPreset
                ? buildPresetReminderIso(quickReminderPreset, selectedDate)
                : undefined;
            const ok = await onCreateEntry({
                content: content.trim(),
                timeSlot: quickTimeSlot || undefined,
                entryType: entryType === 'auto' ? undefined : entryType,
                reminderAt: reminderIso,
                isPrivate: isOwner ? isPrivate : false,
                contactIds: selectedContacts.map((c) => c.id),
                tagIds: selectedTags.map((tItem) => tItem.id),
            });
            if (ok !== false) {
                setContent('');
                setSelectedContacts([]);
                setSelectedTags([]);
                setIsPrivate(false);
                setEntryType('auto');
                setMentionQuery(null);
                setShowContactPicker(false);
                setContactPickerSearch('');
                setQuickTimeSlot('');
                setQuickReminderPreset('');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const typeOptions = [
        { key: 'auto', label: t('agenda.typeAuto', 'Otomatik'), icon: null },
        { key: 'schedule', label: t('agenda.typeSchedule', 'Randevu'), icon: <FaClock size={12} /> },
        { key: 'call', label: t('agenda.typeCall', 'Telefon'), icon: <FaPhoneAlt size={12} /> },
        { key: 'task', label: t('agenda.typeTask', 'Görev'), icon: <FaCheckSquare size={12} /> },
        { key: 'note', label: t('agenda.typeNote', 'Not'), icon: <FaStickyNote size={12} /> },
    ];

    const reminderPresets = [
        { key: 'plus1h', label: t('agenda.remPresetPlus1h', '+1 Saat') },
        { key: 'today16', label: t('agenda.remPresetToday16', 'Bugün 16:00') },
        { key: 'tomorrow09', label: t('agenda.remPresetTomorrow09', 'Yarın 09:00') },
    ];

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '16px',
                position: 'relative',
                boxShadow: 'var(--glass-shadow)',
            }}
        >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={content}
                    onChange={handleTextChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder={t(
                        'agenda.quickEntryPlaceholder',
                        '14:30 @Kişi ile görüşme #etiket !yarın 10:00 (Enter ile anında ajandaya yazın...)',
                    )}
                    aria-label={t('agenda.quickEntryAria', 'Hızlı ajanda satırı ekle')}
                    aria-expanded={matchingContacts.length > 0}
                    aria-autocomplete="list"
                    style={{
                        flex: '1 1 240px',
                        minHeight: '44px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                    }}
                />

                {hasSpeechSupport && (
                    <button
                        type="button"
                        onClick={handleToggleVoiceInput}
                        aria-label={t('agenda.voiceInputBtnAria', 'Sesle ajanda notu yazdır')}
                        title={t('agenda.voiceInputBtnAria', 'Sesle ajanda notu yazdır')}
                        style={{
                            minHeight: '44px',
                            minWidth: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: isListening ? '1px solid var(--accent-error)' : '1px solid var(--glass-border)',
                            background: isListening ? 'var(--accent-error-transparent)' : 'var(--bg-card)',
                            color: isListening ? 'var(--accent-error)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                        }}
                    >
                        {isListening ? <FaMicrophoneSlash size={15} /> : <FaMicrophone size={15} />}
                    </button>
                )}

                {isOwner && (
                    <button
                        type="button"
                        onClick={() => setIsPrivate((v) => !v)}
                        title={t(
                            'agenda.privateToggleHint',
                            'Özel işaretlenen notlar vekil sekretere ve dış paylaşım linklerine gizlenir',
                        )}
                        style={{
                            minHeight: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            border: isPrivate ? '1px solid var(--accent-warning)' : '1px solid var(--glass-border)',
                            background: isPrivate ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
                            color: isPrivate ? 'var(--accent-warning)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                        }}
                    >
                        {isPrivate ? <FaLock size={12} /> : <FaLockOpen size={12} />}
                        <span>
                            {isPrivate ? t('agenda.privateBadge', 'Özel Not') : t('agenda.publicBadge', 'Standart')}
                        </span>
                    </button>
                )}

                <button
                    type="submit"
                    disabled={!content.trim() || submitting}
                    style={{
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'var(--accent-primary)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: content.trim() ? 'pointer' : 'not-allowed',
                        opacity: content.trim() ? 1 : 0.6,
                    }}
                >
                    <FaPlus size={12} />
                    <span>{t('agenda.addEntryBtn', 'Ajandaya Yaz')}</span>
                </button>
            </div>

            {/* @Contact Autocomplete or 1-Tap Contact Picker Dropdown */}
            {(mentionQuery !== null || showContactPicker) && (
                <div
                    role="listbox"
                    aria-label={t('agenda.contactSuggestions', 'Fihrist Kişi Önerileri')}
                    style={{
                        position: 'absolute',
                        top: '62px',
                        left: '14px',
                        right: '14px',
                        zIndex: 40,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        boxShadow: 'var(--glass-shadow-hover)',
                        maxWidth: '440px',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                    }}
                >
                    {showContactPicker && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                                type="search"
                                value={contactPickerSearch}
                                onChange={(e) => setContactPickerSearch(e.target.value)}
                                placeholder={t('agenda.searchContactInPicker', 'Fihristte ad, şirket veya tel ara...')}
                                style={{
                                    flex: 1,
                                    padding: '7px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.83rem',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowContactPicker(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    padding: '6px',
                                    cursor: 'pointer',
                                }}
                            >
                                <FaTimes size={13} />
                            </button>
                        </div>
                    )}

                    {matchingContacts.length === 0 ? (
                        <div style={{ padding: '6px 8px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                            {t('agenda.noMatchingContacts', 'Eşleşen kartvizit bulunamadı.')}
                        </div>
                    ) : (
                        matchingContacts.map((card, idx) => (
                            <button
                                key={card.id}
                                type="button"
                                role="option"
                                aria-selected={idx === activeSuggestionIdx}
                                onClick={() => handleSelectMention(card)}
                                style={{
                                    width: '100%',
                                    minHeight: '40px',
                                    textAlign: 'left',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background:
                                        idx === activeSuggestionIdx
                                            ? 'var(--accent-primary-transparent)'
                                            : 'transparent',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.85rem',
                                }}
                            >
                                <span>
                                    <strong>
                                        {card.firstName} {card.lastName}
                                    </strong>
                                    {card.company ? ` — ${card.company}` : ''}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {card.title || ''}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Mobile-Friendly 1-Tap Smart Toolbar: Quick Time Chips + @Kişi Picker + Quick Reminder Chips */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    alignItems: 'center',
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px dashed var(--glass-border)',
                }}
            >
                {/* 1-Tap @Contact Picker Button */}
                <button
                    type="button"
                    onClick={() => setShowContactPicker((prev) => !prev)}
                    style={{
                        minHeight: '34px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        border: showContactPicker ? '1px solid var(--accent-success)' : '1px solid var(--glass-border)',
                        background: showContactPicker ? 'rgba(16, 185, 129, 0.16)' : 'var(--bg-card)',
                        color: showContactPicker ? 'var(--accent-success)' : 'var(--text-secondary)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    <FaUserTag size={11} />
                    <span>{t('agenda.pickContactChipBtn', '@Kişi Seç')}</span>
                </button>

                {/* 1-Tap Quick Time Presets + Time Input */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {QUICK_TIME_PRESETS.map((slot) => {
                        const active = quickTimeSlot === slot;
                        return (
                            <button
                                key={slot}
                                type="button"
                                onClick={() => setQuickTimeSlot((prev) => (prev === slot ? '' : slot))}
                                style={{
                                    minHeight: '34px',
                                    padding: '4px 9px',
                                    borderRadius: '8px',
                                    border: active
                                        ? '1px solid var(--accent-primary)'
                                        : '1px solid var(--glass-border)',
                                    background: active ? 'var(--accent-primary-transparent)' : 'var(--bg-card)',
                                    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    fontWeight: active ? 700 : 600,
                                    cursor: 'pointer',
                                }}
                            >
                                🕒 {slot}
                            </button>
                        );
                    })}

                    <input
                        type="time"
                        aria-label={t('agenda.customQuickTimeAria', 'Özel saat seç')}
                        value={quickTimeSlot}
                        onChange={(e) => setQuickTimeSlot(e.target.value)}
                        style={{
                            minHeight: '34px',
                            padding: '3px 7px',
                            borderRadius: '8px',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            fontSize: '0.76rem',
                        }}
                    />
                </div>

                {/* 1-Tap Quick Reminder Chips */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {reminderPresets.map((preset) => {
                        const active = quickReminderPreset === preset.key;
                        return (
                            <button
                                key={preset.key}
                                type="button"
                                onClick={() =>
                                    setQuickReminderPreset((prev) => (prev === preset.key ? '' : preset.key))
                                }
                                style={{
                                    minHeight: '34px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 9px',
                                    borderRadius: '8px',
                                    border: active
                                        ? '1px solid var(--accent-warning)'
                                        : '1px solid var(--glass-border)',
                                    background: active ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-card)',
                                    color: active ? 'var(--accent-warning)' : 'var(--text-secondary)',
                                    fontSize: '0.74rem',
                                    fontWeight: active ? 700 : 500,
                                    cursor: 'pointer',
                                }}
                            >
                                <FaBell size={10} />
                                <span>{preset.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Live Parsed Summary Strip (shows what system understood before hitting Enter) */}
            {livePreview.hasAnySignal && (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center',
                        marginTop: '8px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <strong style={{ color: 'var(--text-primary)' }}>
                        ⚡ {t('agenda.liveParsedPreviewLabel', 'Algılanan Kayıt')}:
                    </strong>
                    <span
                        style={{
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: 'var(--accent-primary-transparent)',
                            color: 'var(--accent-primary)',
                            fontWeight: 700,
                        }}
                    >
                        {livePreview.effectiveType === 'schedule'
                            ? t('agenda.typeAppointment', 'Saatli Randevu')
                            : livePreview.effectiveType === 'call'
                              ? t('agenda.typeCall', 'Telefon / Geri Arama')
                              : livePreview.effectiveType === 'task'
                                ? t('agenda.typeTask', 'Yapılacak Görev')
                                : t('agenda.typeNote', 'Not')}
                    </span>

                    {livePreview.effectiveTime && (
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            🕒 {livePreview.effectiveTime}
                        </span>
                    )}

                    {livePreview.reminderLabel && (
                        <span style={{ fontWeight: 700, color: 'var(--accent-warning)' }}>
                            🔔 {livePreview.reminderLabel}
                        </span>
                    )}
                </div>
            )}

            {/* Quick Type Pills, Linked @Contacts & #Tags */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: '10px',
                }}
            >
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {typeOptions.map((opt) => (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => setEntryType(opt.key)}
                            style={{
                                minHeight: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 11px',
                                borderRadius: '999px',
                                border:
                                    entryType === opt.key
                                        ? '1px solid var(--accent-primary)'
                                        : '1px solid var(--glass-border)',
                                background: entryType === opt.key ? 'var(--accent-primary-transparent)' : 'transparent',
                                color: entryType === opt.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontSize: '0.76rem',
                                fontWeight: entryType === opt.key ? 700 : 500,
                                cursor: 'pointer',
                            }}
                        >
                            {opt.icon}
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>

                {/* Selected Contact Chips & Quick Tag Selector */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {selectedContacts.map((c) => (
                        <span
                            key={c.id}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                background: 'rgba(16, 185, 129, 0.16)',
                                color: 'var(--accent-success)',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                            }}
                        >
                            <FaUserTag size={11} />@{c.displayName}
                            <button
                                type="button"
                                onClick={() => removeContactChip(c.id)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                }}
                            >
                                ×
                            </button>
                        </span>
                    ))}

                    {tags.slice(0, 8).map((tag) => {
                        const active = selectedTags.some((st) => st.id === tag.id);
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                style={{
                                    minHeight: '32px',
                                    padding: '4px 9px',
                                    borderRadius: '999px',
                                    border: active ? `1px solid ${tag.color}` : '1px solid var(--glass-border)',
                                    background: active ? `${tag.color}22` : 'transparent',
                                    color: active ? tag.color : 'var(--text-tertiary)',
                                    fontSize: '0.73rem',
                                    fontWeight: active ? 700 : 400,
                                    cursor: 'pointer',
                                }}
                            >
                                #{tag.name}
                            </button>
                        );
                    })}
                </div>
            </div>
        </form>
    );
};

export default QuickEntryBar;
