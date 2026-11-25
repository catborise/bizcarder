import { useState, useRef, useEffect } from 'react';
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
} from 'react-icons/fa';

const QuickEntryBar = ({
    contacts = [],
    tags = [],
    isOwner = true,
    canWrite = true,
    onCreateEntry,
    inputRef: externalRef,
}) => {
    const { t } = useTranslation('pages');
    const internalRef = useRef(null);
    const inputRef = externalRef || internalRef;

    const [content, setContent] = useState('');
    const [entryType, setEntryType] = useState('auto');
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [mentionQuery, setMentionQuery] = useState(null);
    const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOwner) {
            setIsPrivate(false);
        }
    }, [isOwner]);

    if (!canWrite) return null;

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

    const matchingContacts =
        mentionQuery !== null
            ? contacts
                  .filter((c) => {
                      const full = `${c.firstName || ''} ${c.lastName || ''} ${c.company || ''}`.toLowerCase();
                      return full.includes(mentionQuery);
                  })
                  .slice(0, 6)
            : [];

    const handleSelectMention = (card) => {
        const fullName = `${card.firstName || ''} ${card.lastName || ''}`.trim() || card.company;
        if (!selectedContacts.some((sc) => sc.id === card.id)) {
            setSelectedContacts((prev) => [...prev, { id: card.id, displayName: fullName }]);
        }
        setContent((prev) =>
            prev.replace(/(?:^|\s)@[\p{L}\p{N}._-]{1,30}$/u, (m) => `${m.startsWith(' ') ? ' ' : ''}@${fullName} `),
        );
        setMentionQuery(null);
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
        } else if (e.key === 'Enter' && matchingContacts[activeSuggestionIdx]) {
            e.preventDefault();
            handleSelectMention(matchingContacts[activeSuggestionIdx]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setMentionQuery(null);
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
            await onCreateEntry({
                content: content.trim(),
                entryType: entryType === 'auto' ? undefined : entryType,
                isPrivate: isOwner ? isPrivate : false,
                contactIds: selectedContacts.map((c) => c.id),
                tagIds: selectedTags.map((tItem) => tItem.id),
            });
            setContent('');
            setSelectedContacts([]);
            setSelectedTags([]);
            setIsPrivate(false);
            setEntryType('auto');
            setMentionQuery(null);
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
                        flex: '1 1 280px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                    }}
                />

                {isOwner && (
                    <button
                        type="button"
                        onClick={() => setIsPrivate((v) => !v)}
                        title={t(
                            'agenda.privateToggleHint',
                            'Özel işaretlenen notlar vekil sekretere ve dış paylaşım linklerine gizlenir',
                        )}
                        style={{
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

            {/* @Contact Autocomplete Dropdown */}
            {matchingContacts.length > 0 && (
                <div
                    role="listbox"
                    aria-label={t('agenda.contactSuggestions', 'Fihrist Kişi Önerileri')}
                    style={{
                        position: 'absolute',
                        top: '56px',
                        left: '14px',
                        zIndex: 40,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '10px',
                        boxShadow: 'var(--glass-shadow-hover)',
                        minWidth: '280px',
                        maxWidth: '420px',
                        padding: '6px',
                    }}
                >
                    {matchingContacts.map((card, idx) => (
                        <button
                            key={card.id}
                            type="button"
                            role="option"
                            aria-selected={idx === activeSuggestionIdx}
                            onClick={() => handleSelectMention(card)}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: 'none',
                                background:
                                    idx === activeSuggestionIdx ? 'var(--accent-primary-transparent)' : 'transparent',
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
                    ))}
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
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
                                padding: '3px 9px',
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
                                    padding: '3px 8px',
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
