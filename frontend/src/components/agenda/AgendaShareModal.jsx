import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/Modal';
import { FaShareAlt, FaCopy, FaTrash, FaCheck, FaEye, FaLock, FaUserCheck } from 'react-icons/fa';

function getDefaultExpiryLocal() {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

const AgendaShareModal = ({
    isOpen,
    onClose,
    selectedDate,
    shares = [],
    colleagues = [],
    currentDayEntries = [],
    currentPage = null,
    onCreateShare,
    onRevokeShare,
}) => {
    const { t } = useTranslation('pages');
    const [startDate, setStartDate] = useState(selectedDate);
    const [endDate, setEndDate] = useState(selectedDate);
    const [title, setTitle] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [sharedWithUserId, setSharedWithUserId] = useState('');
    const [lastGeneratedLink, setLastGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStartDate(selectedDate);
            setEndDate(selectedDate);
            setTitle('');
            setExpiresAt(getDefaultExpiryLocal());
            setSharedWithUserId('');
            setLastGeneratedLink('');
            setCopied(false);
        }
    }, [isOpen, selectedDate]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            const result = await onCreateShare({
                startDate,
                endDate: endDate || startDate,
                title: title.trim() || `${startDate} ${t('agenda.sharedDefaultTitle', 'Paylaşılan Ajanda Sayfası')}`,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
                sharedWithUserId: sharedWithUserId ? Number(sharedWithUserId) : undefined,
            });
            if (result?.rawToken) {
                const url = `${window.location.origin}/agenda/share/${result.rawToken}`;
                setLastGeneratedLink(url);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const visiblePreviewEntries = currentDayEntries.filter((e) => !e.isPrivate);
    const hiddenPrivateEntriesCount = currentDayEntries.filter((e) => e.isPrivate).length;
    const hasHiddenPrivateNotes = Boolean(currentPage?.privateNotes && currentPage.privateNotes.trim());
    const hasSharedFreeformNotes = Boolean(currentPage?.freeformNotes && currentPage.freeformNotes.trim());

    const handleCopy = async () => {
        if (!lastGeneratedLink) return;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(lastGeneratedLink);
            } else {
                const ta = document.createElement('textarea');
                ta.value = lastGeneratedLink;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                ta.remove();
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const validActiveShares = shares.filter((s) => s.isActive && (!s.expiresAt || new Date(s.expiresAt) > new Date()));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('agenda.shareModalTitle', 'Ajanda Sayfasını Paylaş')}
            maxWidth="600px"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                    style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                    }}
                >
                    {t(
                        'agenda.sharePrivacyNote',
                        'Paylaşılan sayfada 🔒 Özel işaretli satırlarınız, özel karalama alanınız ve bağlı kişilerin telefon/e-posta bilgileri otomatik olarak gizlenir.',
                    )}
                </div>

                <form
                    onSubmit={handleSubmit}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                    }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label
                                htmlFor="share-start-date"
                                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                            >
                                {t('agenda.shareStartDate', 'Başlangıç Günü')}
                            </label>
                            <input
                                id="share-start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    if (endDate < e.target.value) setEndDate(e.target.value);
                                }}
                                required
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="share-end-date"
                                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                            >
                                {t('agenda.shareEndDate', 'Bitiş Günü (Tek sayfa için aynı bırakın)')}
                            </label>
                            <input
                                id="share-end-date"
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label
                                htmlFor="share-title-input"
                                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                            >
                                {t('agenda.shareTitleLabel', 'Paylaşım Başlığı')}
                            </label>
                            <input
                                id="share-title-input"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('agenda.shareTitlePlaceholder', 'Örn: Günlük Yönetici Programı')}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="share-expires-input"
                                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                            >
                                {t('agenda.shareExpiresLabel', 'Geçerlilik Bitişi (Opsiyonel)')}
                            </label>
                            <input
                                id="share-expires-input"
                                type="datetime-local"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="share-recipient-select"
                            style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                        >
                            {t('agenda.shareRecipientLabel', 'Alıcı Erişim Kısıtlaması')}
                        </label>
                        <select
                            id="share-recipient-select"
                            value={sharedWithUserId}
                            onChange={(e) => setSharedWithUserId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                fontSize: '0.84rem',
                            }}
                        >
                            <option value="">
                                🌐 {t('agenda.shareAnyoneWithLink', 'Bağlantıya Sahip Herkes (Salt-Okunur)')}
                            </option>
                            {colleagues.map((c) => (
                                <option key={c.id} value={c.id}>
                                    🔒 {t('agenda.shareOnlyUserPrefix', 'Sadece')}: {c.displayName || c.username} (
                                    {c.username})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* P0-5: Recipient Content Preview Box */}
                    <div
                        style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--glass-border)',
                            fontSize: '0.79rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '6px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <FaEye size={12} color="var(--accent-primary)" />
                                {t('agenda.sharePreviewHeader', 'Alıcının Göreceği İçerik Önizlemesi')} ({selectedDate})
                            </span>
                            <span style={{ fontSize: '0.73rem', color: 'var(--accent-warning)' }}>
                                {t(
                                    'agenda.shareLiveNotice',
                                    'Canlı Sayfa: Tarih aralığındaki güncellemeler alıcıya yansır',
                                )}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--text-secondary)' }}>
                            <span>
                                ✅{' '}
                                <strong>
                                    {visiblePreviewEntries.length}{' '}
                                    {t('agenda.shareVisibleEntriesCount', 'görünür kayıt')}
                                </strong>{' '}
                                {hasSharedFreeformNotes
                                    ? `+ ${t('agenda.shareIncludesFreeform', 'sağ sayfa serbest notu')}`
                                    : ''}
                            </span>
                            <span>
                                • <FaLock size={10} color="var(--accent-warning)" />{' '}
                                <strong>
                                    {hiddenPrivateEntriesCount}{' '}
                                    {t('agenda.shareHiddenEntriesCount', 'özel kayıt gizlendi')}
                                </strong>
                                {hasHiddenPrivateNotes
                                    ? ` (${t('agenda.shareHiddenPrivatePad', 'Özel Karalama gizlendi')})`
                                    : ''}
                            </span>
                            <span>•📵 {t('agenda.sharePiiStripped', 'Kişi telefon/e-posta bilgileri gizlenir')}</span>
                        </div>

                        {(startDate !== selectedDate || endDate !== selectedDate) && (
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>
                                ℹ️{' '}
                                {t(
                                    'agenda.shareRangePreviewNote',
                                    'Yukarıdaki sayaçlar aktif günün özetidir; seçili tarih aralığındaki tüm görünür sayfalar paylaşıma dahil edilir.',
                                )}
                            </div>
                        )}

                        {startDate === selectedDate && endDate === selectedDate && visiblePreviewEntries.length > 0 && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px',
                                    maxHeight: '90px',
                                    overflowY: 'auto',
                                    paddingTop: '4px',
                                    borderTop: '1px dashed var(--glass-border)',
                                    fontSize: '0.76rem',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                {visiblePreviewEntries.slice(0, 6).map((item) => (
                                    <div key={item.id}>
                                        <strong>{item.timeSlot || '--:--'}</strong> — {item.content}
                                    </div>
                                ))}
                                {visiblePreviewEntries.length > 6 && (
                                    <div style={{ color: 'var(--text-tertiary)' }}>
                                        +{visiblePreviewEntries.length - 6} {t('agenda.moreEntries', 'kayıt daha')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            alignSelf: 'flex-end',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 16px',
                            borderRadius: '9px',
                            border: 'none',
                            background: 'var(--accent-primary)',
                            color: '#ffffff',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        <FaShareAlt size={12} />
                        <span>{t('agenda.createShareLinkBtn', 'Güvenli Paylaşım Linki Oluştur')}</span>
                    </button>
                </form>

                {lastGeneratedLink && (
                    <div
                        style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--accent-success)',
                            background: 'rgba(16, 185, 129, 0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                        }}
                    >
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-success)' }}>
                            {t('agenda.shareLinkReady', 'Paylaşım Linki Hazır (Tek sefer gösterilir):')}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                readOnly
                                value={lastGeneratedLink}
                                style={{
                                    flex: 1,
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.82rem',
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--accent-success)',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
                                <span>
                                    {copied ? t('agenda.copied', 'Kopyalandı') : t('agenda.copyBtn', 'Kopyala')}
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Existing Active Shares */}
                <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem' }}>
                        {t('agenda.activeSharesListTitle', 'Aktif Paylaşımlar')}
                    </h4>
                    {validActiveShares.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                            {t('agenda.noActiveShares', 'Henüz paylaşılmış bir ajanda sayfası yok.')}
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {validActiveShares.map((s) => (
                                <div
                                    key={s.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--glass-bg)',
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontWeight: 700,
                                                fontSize: '0.86rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <span>{s.title || `${s.startDate}..${s.endDate}`}</span>
                                            {(s.sharedWith || s.sharedWithUserId) && (
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
                                                    }}
                                                >
                                                    <FaUserCheck size={10} />
                                                    {s.sharedWith?.displayName ||
                                                        s.sharedWith?.username ||
                                                        `#${s.sharedWithUserId}`}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                            {s.startDate === s.endDate ? s.startDate : `${s.startDate} → ${s.endDate}`}{' '}
                                            • {t('agenda.viewCount', 'Görüntülenme')}: {s.viewCount || 0}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onRevokeShare(s.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '6px 10px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--accent-error)',
                                            background: 'var(--accent-error-transparent)',
                                            color: 'var(--accent-error)',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <FaTrash size={11} />
                                        <span>{t('agenda.revokeShareBtn', 'İptal Et')}</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default AgendaShareModal;
