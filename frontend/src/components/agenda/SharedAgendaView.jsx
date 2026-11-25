import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { FaPrint, FaCalendarAlt, FaUserTag } from 'react-icons/fa';

const SharedAgendaView = () => {
    const { token } = useParams();
    const { t } = useTranslation('pages');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const loadShared = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/public/agenda/${token}`);
                setData(res.data);
                setNotFound(false);
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        loadShared();
    }, [token]);

    if (loading) {
        return (
            <div style={{ maxWidth: '900px', margin: '40px auto', padding: '24px', textAlign: 'center' }}>
                {t('agenda.loadingSharedPage', 'Paylaşılan ajanda yaprağı yükleniyor...')}
            </div>
        );
    }

    if (notFound || !data) {
        return (
            <div
                style={{
                    maxWidth: '640px',
                    margin: '60px auto',
                    padding: '32px',
                    borderRadius: '16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    textAlign: 'center',
                }}
            >
                <h2 style={{ marginTop: 0 }}>{t('agenda.sharedNotFoundTitle', 'Ajanda Sayfası Bulunamadı')}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {t(
                        'agenda.sharedNotFoundDesc',
                        'Bu paylaşım bağlantısı iptal edilmiş veya geçerlilik süresi dolmuş olabilir.',
                    )}
                </p>
            </div>
        );
    }

    const { share, pages = [], entries = [] } = data;

    return (
        <div style={{ maxWidth: '1080px', margin: '28px auto', padding: '0 20px' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '18px 22px',
                    borderRadius: '16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    marginBottom: '20px',
                }}
            >
                <div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--accent-primary)',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                        }}
                    >
                        <FaCalendarAlt />
                        <span>
                            {share.startDate === share.endDate
                                ? share.startDate
                                : `${share.startDate} → ${share.endDate}`}
                        </span>
                    </div>
                    <h1 style={{ margin: '4px 0 0', fontSize: '1.4rem' }}>
                        {share.title || t('agenda.sharedDefaultTitle', 'Paylaşılan Ajanda Sayfası')}
                    </h1>
                    {share.ownerName && (
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {t('agenda.sharedByLabel', 'Paylaşan')}: <strong>{share.ownerName}</strong>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--glass-bg)',
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    <FaPrint />
                    <span>{t('agenda.printSheetBtn', 'Yazdır / PDF')}</span>
                </button>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
                    gap: '20px',
                }}
            >
                {/* Entries */}
                <div
                    style={{
                        padding: '20px',
                        borderRadius: '16px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                    }}
                >
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                        {t('agenda.leftPageTitle', 'Günlük Program ve Kayıtlar')}
                    </h3>
                    {entries.length === 0 ? (
                        <p style={{ color: 'var(--text-tertiary)' }}>
                            {t('agenda.emptyPageTitle', 'Bu ajanda yaprağında kayıt bulunmuyor.')}
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--glass-bg)',
                                    }}
                                >
                                    <div
                                        style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
                                    >
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                            {entry.date}
                                        </span>
                                        {entry.timeSlot && (
                                            <strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                                                {entry.timeSlot}
                                            </strong>
                                        )}
                                        <span
                                            style={{
                                                textDecoration:
                                                    entry.status === 'done' || entry.status === 'cancelled'
                                                        ? 'line-through'
                                                        : 'none',
                                            }}
                                        >
                                            {entry.content}
                                        </span>
                                    </div>
                                    {(entry.contactLinks || []).length > 0 && (
                                        <div
                                            style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}
                                        >
                                            {entry.contactLinks.map((c, idx) => (
                                                <span
                                                    key={idx}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '0.73rem',
                                                        padding: '2px 8px',
                                                        borderRadius: '999px',
                                                        background: 'rgba(16, 185, 129, 0.14)',
                                                        color: 'var(--accent-success)',
                                                    }}
                                                >
                                                    <FaUserTag size={10} />@{c.displayNameSnapshot}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lined Notes */}
                <div
                    style={{
                        padding: '20px',
                        borderRadius: '16px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                    }}
                >
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                        {t('agenda.freeformNotepadTab', 'Günlük Serbest Not Sayfası')}
                    </h3>
                    {pages.filter((p) => p.freeformNotes && p.freeformNotes.trim()).length === 0 ? (
                        <p style={{ color: 'var(--text-tertiary)' }}>
                            {t('agenda.noFreeformNotes', 'Serbest sayfa notu bulunmuyor.')}
                        </p>
                    ) : (
                        pages
                            .filter((p) => p.freeformNotes && p.freeformNotes.trim())
                            .map((p) => (
                                <div key={p.date} style={{ marginBottom: '14px' }}>
                                    <div
                                        style={{
                                            fontSize: '0.76rem',
                                            fontWeight: 700,
                                            color: 'var(--text-tertiary)',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        {p.date}
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{p.freeformNotes}</div>
                                </div>
                            ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SharedAgendaView;
