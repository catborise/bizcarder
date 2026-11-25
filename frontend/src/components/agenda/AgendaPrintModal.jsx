import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/Modal';
import api from '../../api/axios';
import { FaPrint, FaFilePdf, FaCalendarDay, FaCalendarWeek, FaCalendarAlt } from 'react-icons/fa';

function addDays(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function getMondayOfWeek(dateStr) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const day = d.getUTCDay(); // 0=Sun..6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
}

function getDayAndIsoWeekOfYear(dateStr) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
    const dayOfYear = Math.floor((d - start) / (1000 * 60 * 60 * 24));

    // ISO-8601 week number calculation
    const target = new Date(d.valueOf());
    const dayNr = (d.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setUTCMonth(0, 1);
    if (target.getUTCDay() !== 4) {
        target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
    }
    const weekOfYear = 1 + Math.ceil((firstThursday - target) / 604800000);
    return { dayOfYear, weekOfYear };
}

const AgendaPrintModal = ({ isOpen, onClose, selectedDate, isOwner = true, ownerId, currentUserId, onError }) => {
    const { t, i18n } = useTranslation('pages');
    const isTr = (i18n.language || 'tr').startsWith('tr');
    const locale = isTr ? 'tr-TR' : 'en-US';
    const previewRef = useRef(null);
    const requestSeqRef = useRef(0);
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const [mode, setMode] = useState('daily'); // 'daily' | 'weekly' | 'range'
    const [startDate, setStartDate] = useState(selectedDate);
    const [endDate, setEndDate] = useState(selectedDate);
    const [includePrivate, setIncludePrivate] = useState(false);
    const [includeContactPhones, setIncludeContactPhones] = useState(true);
    const [includeBlankLines, setIncludeBlankLines] = useState(true);

    const [rangeData, setRangeData] = useState({ owner: null, pages: [], entries: [] });
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIncludePrivate(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (mode === 'daily') {
            setStartDate(selectedDate);
            setEndDate(selectedDate);
        } else if (mode === 'weekly') {
            const mon = getMondayOfWeek(selectedDate);
            setStartDate(mon);
            setEndDate(addDays(mon, 6));
        }
    }, [isOpen, mode, selectedDate]);

    useEffect(() => {
        if (!isOwner) {
            setIncludePrivate(false);
        }
    }, [isOwner]);

    const buildHeaders = useCallback(() => {
        if (ownerId && currentUserId && Number(ownerId) !== Number(currentUserId)) {
            return { 'X-Agenda-Owner-Id': String(ownerId) };
        }
        return {};
    }, [ownerId, currentUserId]);

    const fetchRangeData = useCallback(async () => {
        if (!isOpen || !startDate || !endDate || endDate < startDate) return;
        const seq = ++requestSeqRef.current;
        setLoadingPreview(true);
        setPreviewError(false);
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                includePrivate: String(Boolean(isOwner && includePrivate)),
            });
            const res = await api.get(`/api/agenda/range?${params.toString()}`, {
                headers: buildHeaders(),
            });
            if (seq === requestSeqRef.current) {
                setRangeData({
                    owner: res.data.owner || null,
                    pages: res.data.pages || [],
                    entries: res.data.entries || [],
                });
            }
        } catch {
            if (seq === requestSeqRef.current) {
                setPreviewError(true);
                setRangeData({ owner: null, pages: [], entries: [] });
                if (onErrorRef.current) {
                    onErrorRef.current(t('agenda.printLoadError', 'Yazdırma önizlemesi yüklenemedi.'));
                }
            }
        } finally {
            if (seq === requestSeqRef.current) {
                setLoadingPreview(false);
            }
        }
    }, [isOpen, startDate, endDate, isOwner, includePrivate, buildHeaders, t]);

    useEffect(() => {
        fetchRangeData();
    }, [fetchRangeData]);

    if (!isOpen) return null;

    const handleDownloadPdf = async () => {
        if (downloadingPdf || previewError) return;
        setDownloadingPdf(true);
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                includePrivate: String(Boolean(isOwner && includePrivate)),
                includeContactPhones: String(includeContactPhones),
                includeBlankLines: String(includeBlankLines),
                lang: isTr ? 'tr' : 'en',
            });
            const res = await api.get(`/api/agenda/export/pdf?${params.toString()}`, {
                headers: buildHeaders(),
                responseType: 'blob',
            });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute(
                'download',
                startDate === endDate ? `ajanda_${startDate}.pdf` : `ajanda_${startDate}_${endDate}.pdf`,
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            if (onErrorRef.current) {
                onErrorRef.current(t('agenda.pdfDownloadError', 'PDF dosyası oluşturulamadı.'));
            }
        } finally {
            setDownloadingPdf(false);
        }
    };

    const handleBrowserPrint = () => {
        if (!previewRef.current || loadingPreview || previewError) return;
        const sheetHtml = previewRef.current.innerHTML;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`<!DOCTYPE html>
<html lang="${isTr ? 'tr' : 'en'}">
<head>
<meta charset="utf-8" />
<title>Ajanda - ${startDate}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 9.5pt; }
  th { background: #f1f5f9; font-weight: 700; color: #0f172a; }
  .lined-box {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px 12px;
    white-space: pre-wrap;
    font-size: 10pt;
    line-height: 1.65;
  }
  .blank-line {
    border-bottom: 1px solid #cbd5e1;
    height: 24px;
    width: 100%;
  }
</style>
</head>
<body>${sheetHtml}</body>
</html>`);
        doc.close();

        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => iframe.remove(), 1000);
        }, 150);
    };

    const dateList = [];
    if (startDate && endDate && startDate <= endDate) {
        let cur = startDate;
        let guard = 0;
        while (cur <= endDate && guard < 32) {
            dateList.push(cur);
            cur = addDays(cur, 1);
            guard++;
        }
    }

    const pagesByDate = Object.fromEntries((rangeData.pages || []).map((p) => [p.date, p]));
    const visibleEntries = (rangeData.entries || []).filter((e) => (isOwner && includePrivate ? true : !e.isPrivate));
    const { dayOfYear, weekOfYear } = getDayAndIsoWeekOfYear(startDate);
    const maxEndDate = addDays(startDate, 31);

    const statusBadge = (status) => {
        if (status === 'done') return '✓';
        if (status === 'migrated') return '→';
        if (status === 'cancelled') return '✗';
        return '☐';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('agenda.printModalTitle', 'Ajanda Yaprağı Yazdır & Kurumsal PDF Çıktısı')}
            maxWidth="880px"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Mode & Options Toolbar */}
                <div
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                {
                                    key: 'daily',
                                    label: t('agenda.printModeDaily', 'Günlük Ajanda Yaprağı (1 Gün)'),
                                    icon: <FaCalendarDay size={12} />,
                                },
                                {
                                    key: 'weekly',
                                    label: t('agenda.printModeWeekly', 'Haftalık Program (7 Gün)'),
                                    icon: <FaCalendarWeek size={12} />,
                                },
                                {
                                    key: 'range',
                                    label: t('agenda.printModeRange', 'Özel Tarih Aralığı'),
                                    icon: <FaCalendarAlt size={12} />,
                                },
                            ].map((opt) => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setMode(opt.key)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '7px 13px',
                                        borderRadius: '9px',
                                        border:
                                            mode === opt.key
                                                ? '1px solid var(--accent-primary)'
                                                : '1px solid var(--glass-border)',
                                        background:
                                            mode === opt.key ? 'var(--accent-primary-transparent)' : 'transparent',
                                        color: mode === opt.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {opt.icon}
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>

                        {mode === 'range' && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        const nextStart = e.target.value;
                                        setStartDate(nextStart);
                                        const nextMax = addDays(nextStart, 31);
                                        if (endDate < nextStart) setEndDate(nextStart);
                                        else if (endDate > nextMax) setEndDate(nextMax);
                                    }}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                                <span>→</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate}
                                    max={maxEndDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Checkboxes */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.83rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={includeContactPhones}
                                onChange={(e) => setIncludeContactPhones(e.target.checked)}
                            />
                            <span>
                                {t('agenda.printIncludePhones', 'Bağlı kişilerin şirket ve telefon numarasını yazdır')}
                            </span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={includeBlankLines}
                                onChange={(e) => setIncludeBlankLines(e.target.checked)}
                            />
                            <span>
                                {t('agenda.printIncludeBlankLines', 'Sayfa altına elle not alma çizgileri ekle')}
                            </span>
                        </label>

                        {isOwner && (
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    color: 'var(--accent-warning)',
                                    fontWeight: 600,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={includePrivate}
                                    onChange={(e) => setIncludePrivate(e.target.checked)}
                                />
                                <span>
                                    {t('agenda.printIncludePrivate', '🔒 Özel notları ve özel karalamayı dahil et')}
                                </span>
                            </label>
                        )}
                    </div>
                </div>

                {/* Live A4 Paper Sheet Preview */}
                <div
                    style={{
                        maxHeight: '460px',
                        overflowY: 'auto',
                        padding: '24px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
                    }}
                >
                    {loadingPreview ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            {t('agenda.printPreviewLoading', 'A4 ajanda yaprağı hazırlanıyor...')}
                        </div>
                    ) : (
                        <div ref={previewRef} className="agenda-print-sheet">
                            {/* Physical Planner Sheet Header */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-end',
                                    borderBottom: '2px solid #0f172a',
                                    paddingBottom: '10px',
                                    marginBottom: '16px',
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            color: '#475569',
                                        }}
                                    >
                                        {t(
                                            'agenda.printHeaderSubtitle',
                                            'YÖNETİCİ ASİSTANI GÜNLÜK / HAFTALIK AJANDA FÖYÜ',
                                        )}
                                    </div>
                                    <h2 style={{ margin: '4px 0 0', fontSize: '1.35rem', color: '#0f172a' }}>
                                        {startDate === endDate
                                            ? new Date(`${startDate}T00:00:00`).toLocaleDateString(locale, {
                                                  weekday: 'long',
                                                  year: 'numeric',
                                                  month: 'long',
                                                  day: 'numeric',
                                              })
                                            : `${startDate} — ${endDate}`}
                                    </h2>
                                </div>

                                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#334155' }}>
                                    <div>
                                        <strong>
                                            {rangeData.owner?.displayName || rangeData.owner?.username || ''}
                                        </strong>
                                    </div>
                                    {startDate === endDate && (
                                        <div>
                                            {t('agenda.dayOfYearLabel', 'Yılın Günü')}: <strong>{dayOfYear}</strong> •{' '}
                                            {t('agenda.weekOfYearLabel', 'Hafta')}: <strong>{weekOfYear}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Day-by-Day Print Content */}
                            {dateList.map((dStr) => {
                                const dayEntries = visibleEntries.filter((e) => e.date === dStr);
                                const dayPage = pagesByDate[dStr];
                                const hasFreeform = Boolean(dayPage?.freeformNotes && dayPage.freeformNotes.trim());
                                const hasPrivate = Boolean(
                                    isOwner && includePrivate && dayPage?.privateNotes && dayPage.privateNotes.trim(),
                                );

                                if (dateList.length > 1 && dayEntries.length === 0 && !hasFreeform && !hasPrivate) {
                                    return null;
                                }

                                return (
                                    <div key={dStr} style={{ marginBottom: '18px' }}>
                                        {dateList.length > 1 && (
                                            <div
                                                style={{
                                                    fontWeight: 800,
                                                    fontSize: '0.98rem',
                                                    color: '#1e3a8a',
                                                    background: '#f1f5f9',
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                {new Date(`${dStr}T00:00:00`).toLocaleDateString(locale, {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </div>
                                        )}

                                        {dayEntries.length > 0 ? (
                                            <table
                                                style={{
                                                    width: '100%',
                                                    borderCollapse: 'collapse',
                                                    marginBottom: '10px',
                                                    fontSize: '0.86rem',
                                                }}
                                            >
                                                <thead>
                                                    <tr>
                                                        <th
                                                            style={{
                                                                width: '68px',
                                                                border: '1px solid #cbd5e1',
                                                                padding: '6px 8px',
                                                                background: '#f1f5f9',
                                                            }}
                                                        >
                                                            {t('agenda.printColTime', 'Saat')}
                                                        </th>
                                                        <th
                                                            style={{
                                                                width: '54px',
                                                                border: '1px solid #cbd5e1',
                                                                padding: '6px 8px',
                                                                background: '#f1f5f9',
                                                                textAlign: 'center',
                                                            }}
                                                        >
                                                            {t('agenda.printColStatus', 'Durum')}
                                                        </th>
                                                        <th
                                                            style={{
                                                                border: '1px solid #cbd5e1',
                                                                padding: '6px 8px',
                                                                background: '#f1f5f9',
                                                            }}
                                                        >
                                                            {t(
                                                                'agenda.printColContent',
                                                                'Randevu / Telefon Notu / Görev',
                                                            )}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dayEntries.map((entry) => (
                                                        <tr key={entry.id}>
                                                            <td
                                                                style={{
                                                                    border: '1px solid #cbd5e1',
                                                                    padding: '6px 8px',
                                                                    fontFamily: 'monospace',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {entry.timeSlot || '—'}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    border: '1px solid #cbd5e1',
                                                                    padding: '6px 8px',
                                                                    textAlign: 'center',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {statusBadge(entry.status)}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    border: '1px solid #cbd5e1',
                                                                    padding: '6px 8px',
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        textDecoration:
                                                                            entry.status === 'done' ||
                                                                            entry.status === 'cancelled'
                                                                                ? 'line-through'
                                                                                : 'none',
                                                                    }}
                                                                >
                                                                    {entry.content}
                                                                </span>
                                                                {(entry.contactLinks || []).map((link, idx) => {
                                                                    const extra =
                                                                        includeContactPhones && link.card
                                                                            ? [link.card.company, link.card.phone]
                                                                                  .filter(Boolean)
                                                                                  .join(' • ')
                                                                            : '';
                                                                    return (
                                                                        <span
                                                                            key={idx}
                                                                            style={{
                                                                                marginLeft: '8px',
                                                                                fontSize: '0.8rem',
                                                                                color: '#0f766e',
                                                                                fontWeight: 600,
                                                                            }}
                                                                        >
                                                                            @{link.displayNameSnapshot}
                                                                            {extra ? ` (${extra})` : ''}
                                                                        </span>
                                                                    );
                                                                })}
                                                                {(entry.tags || []).map((tag, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        style={{
                                                                            marginLeft: '6px',
                                                                            fontSize: '0.76rem',
                                                                            color: '#475569',
                                                                        }}
                                                                    >
                                                                        #{tag.name}
                                                                    </span>
                                                                ))}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div
                                                style={{
                                                    padding: '10px 12px',
                                                    border: '1px dashed #cbd5e1',
                                                    borderRadius: '6px',
                                                    color: '#64748b',
                                                    fontSize: '0.84rem',
                                                    marginBottom: '10px',
                                                }}
                                            >
                                                {t('agenda.emptyPageTitle', 'Bu ajanda yaprağında henüz kayıt yok.')}
                                            </div>
                                        )}

                                        {hasFreeform && (
                                            <div style={{ marginBottom: '10px' }}>
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: '0.84rem',
                                                        marginBottom: '4px',
                                                        color: '#0f172a',
                                                    }}
                                                >
                                                    {t('agenda.freeformNotepadTab', 'Günlük Serbest Not Sayfası')}:
                                                </div>
                                                <div
                                                    className="lined-box"
                                                    style={{
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '6px',
                                                        padding: '10px 12px',
                                                        whiteSpace: 'pre-wrap',
                                                        fontSize: '0.88rem',
                                                    }}
                                                >
                                                    {dayPage.freeformNotes}
                                                </div>
                                            </div>
                                        )}

                                        {hasPrivate && (
                                            <div style={{ marginBottom: '10px' }}>
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: '0.84rem',
                                                        marginBottom: '4px',
                                                        color: '#b45309',
                                                    }}
                                                >
                                                    🔒 {t('agenda.privateNotepadTab', 'Özel Karalama (Gizli)')}:
                                                </div>
                                                <div
                                                    className="lined-box"
                                                    style={{
                                                        border: '1px solid #fcd34d',
                                                        borderRadius: '6px',
                                                        padding: '10px 12px',
                                                        whiteSpace: 'pre-wrap',
                                                        fontSize: '0.88rem',
                                                    }}
                                                >
                                                    {dayPage.privateNotes}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Blank Ruled Lines for Handwritten Notes */}
                            {includeBlankLines && (
                                <div style={{ marginTop: '14px' }}>
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontSize: '0.82rem',
                                            color: '#475569',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        ✍️ {t('agenda.printBlankLinesTitle', 'Toplantı / El Yazısı Not Alanı')}:
                                    </div>
                                    {Array.from({ length: 6 }, (_, idx) => (
                                        <div
                                            key={idx}
                                            className="blank-line"
                                            style={{
                                                borderBottom: '1px solid #cbd5e1',
                                                height: '24px',
                                                width: '100%',
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons: PDF Download + Direct Clean A4 Print */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf || loadingPreview || previewError}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: '1px solid var(--accent-primary)',
                            background: 'var(--accent-primary-transparent)',
                            color: 'var(--accent-primary)',
                            fontWeight: 700,
                            cursor: downloadingPdf || loadingPreview || previewError ? 'not-allowed' : 'pointer',
                            opacity: downloadingPdf || loadingPreview || previewError ? 0.6 : 1,
                        }}
                    >
                        <FaFilePdf size={14} />
                        <span>
                            {downloadingPdf
                                ? t('agenda.preparingPdf', 'PDF Hazırlanıyor...')
                                : t('agenda.downloadPdfBtn', 'Kurumsal PDF İndir')}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={handleBrowserPrint}
                        disabled={loadingPreview || previewError}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'var(--accent-primary)',
                            color: '#ffffff',
                            fontWeight: 700,
                            cursor: loadingPreview || previewError ? 'not-allowed' : 'pointer',
                            opacity: loadingPreview || previewError ? 0.6 : 1,
                        }}
                    >
                        <FaPrint size={14} />
                        <span>{t('agenda.printNowBtn', 'A4 Ajanda Yaprağını Yazdır')}</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AgendaPrintModal;
