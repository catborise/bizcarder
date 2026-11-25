import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/Modal';
import { FaUserShield, FaTrash, FaPlus } from 'react-icons/fa';

function toLocalDatetimeInput(dateObj) {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    const mm = pad(dateObj.getMonth() + 1);
    const dd = pad(dateObj.getDate());
    const hh = pad(dateObj.getHours());
    const min = pad(dateObj.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

const DelegationModal = ({ isOpen, onClose, delegationsData, onCreateDelegation, onRevokeDelegation }) => {
    const { t } = useTranslation('pages');
    const colleagues = delegationsData?.colleagues || [];
    const outgoing = delegationsData?.outgoing || [];
    const incoming = delegationsData?.incoming || [];

    const [delegateUserId, setDelegateUserId] = useState('');
    const [permission, setPermission] = useState('write');
    const [startsAt, setStartsAt] = useState(() => toLocalDatetimeInput(new Date()));
    const [endsAt, setEndsAt] = useState(() => toLocalDatetimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStartsAt(toLocalDatetimeInput(new Date()));
            setEndsAt(toLocalDatetimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
            setNote('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!delegateUserId || submitting) return;
        setSubmitting(true);
        try {
            await onCreateDelegation({
                delegateUserId: Number(delegateUserId),
                permission,
                startsAt: new Date(startsAt).toISOString(),
                endsAt: new Date(endsAt).toISOString(),
                note,
            });
            setNote('');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('agenda.delegationModalTitle', 'Vekâlet & Geçici Görevlendirme (İzin Devri)')}
            maxWidth="640px"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div
                    style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <strong>{t('agenda.delegationSecurityNoticeTitle', 'Güvenlik & Yetki Sınırı:')}</strong>{' '}
                    {t(
                        'agenda.delegationSecurityNoticeBody',
                        'Görevlendirilen vekil sekreter izin süresince ajandanıza not/randevu ekleyebilir ve işlerin durumunu güncelleyebilir; ancak 🔒 Özel işaretli notlarınızı göremez, mevcut kayıtlarınızı silemez ve ajandanızı dış linkle paylaşamaz.',
                    )}
                </div>

                {/* New Delegation Form */}
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
                                htmlFor="delegate-user-select"
                                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                            >
                                {t('agenda.selectSubstituteLabel', 'Vekil Sekreter Seçin')}
                            </label>
                            <select
                                id="delegate-user-select"
                                value={delegateUserId}
                                onChange={(e) => setDelegateUserId(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                <option value="">
                                    {t('agenda.selectColleaguePlaceholder', '— Çalışma arkadaşı seçin —')}
                                </option>
                                {colleagues.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.displayName || u.username} (@{u.username})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="delegate-permission-select"
                                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                            >
                                {t('agenda.delegationPermissionLabel', 'Vekil Yetkisi')}
                            </label>
                            <select
                                id="delegate-permission-select"
                                value={permission}
                                onChange={(e) => setPermission(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                <option value="write">
                                    {t('agenda.permWrite', 'Not Ekleme & Durum Güncelleme (Önerilen)')}
                                </option>
                                <option value="read">{t('agenda.permRead', 'Sadece Görüntüleme')}</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label
                                htmlFor="delegate-starts-at"
                                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                            >
                                {t('agenda.startsAtLabel', 'Başlangıç Tarihi/Saati')}
                            </label>
                            <input
                                id="delegate-starts-at"
                                type="datetime-local"
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
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
                                htmlFor="delegate-ends-at"
                                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                            >
                                {t('agenda.endsAtLabel', 'Bitiş Tarihi/Saati')}
                            </label>
                            <input
                                id="delegate-ends-at"
                                type="datetime-local"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
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

                    <div>
                        <label
                            htmlFor="delegate-handover-note"
                            style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}
                        >
                            {t('agenda.handoverNoteLabel', 'Devir Notu (Vekil ekranında üst bilgi olarak görünür)')}
                        </label>
                        <input
                            id="delegate-handover-note"
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t(
                                'agenda.handoverNotePlaceholder',
                                'Örn: Cuma gününe kadar izindeyim, Genel Müdür randevu taleplerini lütfen not alın...',
                            )}
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

                    <button
                        type="submit"
                        disabled={!delegateUserId || submitting}
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
                            cursor: delegateUserId ? 'pointer' : 'not-allowed',
                        }}
                    >
                        <FaPlus size={11} />
                        <span>{t('agenda.assignSubstituteBtn', 'Vekil Görevlendir')}</span>
                    </button>
                </form>

                {/* Outgoing Delegations */}
                <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem' }}>
                        <FaUserShield style={{ marginRight: '6px' }} />
                        {t('agenda.myAssignedSubstitutes', 'Benim Yerime Görevlendirilenler')}
                    </h4>
                    {outgoing.filter((d) => d.isActive).length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                            {t('agenda.noActiveSubstitutes', 'Aktif bir vekâlet tanımlı değil.')}
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {outgoing
                                .filter((d) => d.isActive)
                                .map((d) => (
                                    <div
                                        key={d.id}
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
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                                                {d.delegate?.displayName || d.delegate?.username} (
                                                {d.permission === 'write'
                                                    ? t('agenda.permWriteShort', 'Yazma')
                                                    : t('agenda.permReadShort', 'Okuma')}
                                                )
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                {new Date(d.startsAt).toLocaleString()} →{' '}
                                                {new Date(d.endsAt).toLocaleString()}
                                            </div>
                                            {d.note && (
                                                <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>“{d.note}”</div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onRevokeDelegation(d.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--accent-error)',
                                                background: 'var(--accent-error-transparent)',
                                                color: 'var(--accent-error)',
                                                fontSize: '0.76rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <FaTrash size={11} />
                                            <span>{t('agenda.revokeBtn', 'Sonlandır')}</span>
                                        </button>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* Incoming Delegations */}
                {incoming.length > 0 && (
                    <div>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem' }}>
                            {t('agenda.delegatedToMeTitle', 'Bana Devredilen Vekâletler')}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {incoming.map((d) => (
                                <div
                                    key={d.id}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--glass-bg)',
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    <strong>{d.principal?.displayName || d.principal?.username}</strong> —{' '}
                                    {new Date(d.startsAt).toLocaleString()} → {new Date(d.endsAt).toLocaleString()}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default DelegationModal;
