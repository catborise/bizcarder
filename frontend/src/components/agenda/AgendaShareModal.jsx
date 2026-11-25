import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/Modal';
import { FaShareAlt, FaCopy, FaTrash, FaCheck } from 'react-icons/fa';

const AgendaShareModal = ({ isOpen, onClose, selectedDate, shares = [], onCreateShare, onRevokeShare }) => {
    const { t } = useTranslation('pages');
    const [startDate, setStartDate] = useState(selectedDate);
    const [endDate, setEndDate] = useState(selectedDate);
    const [title, setTitle] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [lastGeneratedLink, setLastGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStartDate(selectedDate);
            setEndDate(selectedDate);
            setTitle('');
            setExpiresAt('');
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
            });
            if (result?.rawToken) {
                const url = `${window.location.origin}/agenda/share/${result.rawToken}`;
                setLastGeneratedLink(url);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = async () => {
        if (!lastGeneratedLink) return;
        await navigator.clipboard.writeText(lastGeneratedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                    {shares.filter((s) => s.isActive).length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                            {t('agenda.noActiveShares', 'Henüz paylaşılmış bir ajanda sayfası yok.')}
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {shares
                                .filter((s) => s.isActive)
                                .map((s) => (
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
                                            <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                                                {s.title || `${s.startDate}..${s.endDate}`}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                {s.startDate === s.endDate
                                                    ? s.startDate
                                                    : `${s.startDate} → ${s.endDate}`}{' '}
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
