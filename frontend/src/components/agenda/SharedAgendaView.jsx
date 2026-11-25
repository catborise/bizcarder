import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { FaPrint, FaCalendarAlt, FaUserTag } from 'react-icons/fa';

const SharedAgendaView = () => {
    const { token } = useParams();
    const { t, i18n } = useTranslation('pages');
    const isTr = (i18n.language || 'tr').startsWith('tr');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const printAreaRef = useRef(null);

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

    const handleCleanPrint = () => {
        if (!printAreaRef.current || !data) return;
        const { share, pages = [], entries = [] } = data;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const escapeHtml = (str) =>
            String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

        const statusMark = (st) => (st === 'done' ? '✓' : st === 'migrated' ? '→' : st === 'cancelled' ? '✗' : '☐');

        const rowsHtml = entries
            .map((e) => {
                const contacts = (e.contactLinks || []).map((c) => `@${escapeHtml(c.displayNameSnapshot)}`).join(', ');
                return `<tr>
                    <td style="font-family:monospace;font-weight:700">${escapeHtml(e.timeSlot || '—')}</td>
                    <td style="text-align:center;font-weight:700">${statusMark(e.status)}</td>
                    <td>${escapeHtml(e.date)} — ${escapeHtml(e.content)} ${contacts ? `<strong>(${contacts})</strong>` : ''}</td>
                </tr>`;
            })
            .join('');

        const notesHtml = pages
            .filter((p) => p.freeformNotes && p.freeformNotes.trim())
            .map(
                (p) =>
                    `<div style="margin-bottom:10px"><strong>${escapeHtml(p.date)}:</strong><div style="border:1px solid #cbd5e1;border-radius:6px;padding:10px;white-space:pre-wrap;margin-top:4px">${escapeHtml(p.freeformNotes)}</div></div>`,
            )
            .join('');

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`<!DOCTYPE html>
<html lang="${isTr ? 'tr' : 'en'}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(share.title || 'Ajanda')}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #0f172a; background: #fff; margin: 0; font-size: 10.5pt; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; }
</style>
</head>
<body>
  <div style="border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div style="font-size:9pt;color:#475569;font-weight:700">${escapeHtml(share.startDate === share.endDate ? share.startDate : `${share.startDate} → ${share.endDate}`)}</div>
      <h2 style="margin:4px 0 0">${escapeHtml(share.title || 'Ajanda Sayfası')}</h2>
    </div>
    <div style="font-size:9.5pt;color:#334155">${escapeHtml(share.ownerName || '')}</div>
  </div>
  ${
      entries.length > 0
          ? `<table><thead><tr><th style="width:65px">Saat</th><th style="width:55px;text-align:center">Durum</th><th>Program / Not</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
          : ''
  }
  ${notesHtml}
</body>
</html>`);
        doc.close();
        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => iframe.remove(), 1000);
        }, 150);
    };

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
        <div ref={printAreaRef} style={{ maxWidth: '1080px', margin: '28px auto', padding: '0 20px' }}>
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
                    onClick={handleCleanPrint}
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
