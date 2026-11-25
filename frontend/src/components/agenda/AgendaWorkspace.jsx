import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import MonthIndexTabs from './MonthIndexTabs';
import QuickEntryBar from './QuickEntryBar';
import DailyPageSpread from './DailyPageSpread';
import DelegationModal from './DelegationModal';
import AgendaShareModal from './AgendaShareModal';
import AgendaPrintModal from './AgendaPrintModal';
import {
    FaChevronLeft,
    FaChevronRight,
    FaUserShield,
    FaShareAlt,
    FaPrint,
    FaSearch,
    FaTimes,
    FaCalendarDay,
} from 'react-icons/fa';

function getTodayLocal() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function shiftDateString(dateStr, deltaDays) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
}

const AgendaWorkspace = () => {
    const { t, i18n } = useTranslation('pages');
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const quickInputRef = useRef(null);
    const dayRequestSeqRef = useRef(0);

    const [selectedDate, setSelectedDate] = useState(getTodayLocal);
    const [activeOwnerId, setActiveOwnerId] = useState(null); // null => own agenda (user.id)
    const [dayData, setDayData] = useState(null);
    const [yearOverview, setYearOverview] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [tags, setTags] = useState([]);
    const [delegationsData, setDelegationsData] = useState({ outgoing: [], incoming: [], colleagues: [] });
    const [shares, setShares] = useState([]);

    const [showDelegationModal, setShowDelegationModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);

    // Contact history drawer state
    const [contactDrawer, setContactDrawer] = useState(null); // { cardId, displayName, card, entries }

    const effectiveOwnerId = activeOwnerId || user?.id;
    const currentYear = selectedDate.slice(0, 4);

    // Refs to prevent stale blur-save or out-of-order responses from overwriting newly selected date/owner
    const selectedDateRef = useRef(selectedDate);
    const effectiveOwnerIdRef = useRef(effectiveOwnerId);
    selectedDateRef.current = selectedDate;
    effectiveOwnerIdRef.current = effectiveOwnerId;

    const buildHeadersForOwner = useCallback(
        (targetOwnerId) => {
            const ownerToUse = targetOwnerId || effectiveOwnerId;
            if (ownerToUse && user?.id && Number(ownerToUse) !== Number(user.id)) {
                return { 'X-Agenda-Owner-Id': String(ownerToUse) };
            }
            return {};
        },
        [effectiveOwnerId, user?.id],
    );

    const fetchDailyPage = useCallback(async () => {
        const seq = ++dayRequestSeqRef.current;
        const requestedDate = selectedDate;
        const requestedOwnerId = effectiveOwnerId;
        try {
            const res = await api.get(`/api/agenda/day/${requestedDate}`, {
                headers: buildHeadersForOwner(requestedOwnerId),
            });
            if (
                seq === dayRequestSeqRef.current &&
                requestedDate === selectedDateRef.current &&
                Number(requestedOwnerId) === Number(effectiveOwnerIdRef.current)
            ) {
                setDayData(res.data);
            }
        } catch (err) {
            if (seq === dayRequestSeqRef.current) {
                console.error('Agenda day fetch error:', err);
                if (err.response?.status === 403 && activeOwnerId !== null) {
                    setActiveOwnerId(null);
                }
                showNotification(t('agenda.loadDayError', 'Ajanda sayfası yüklenemedi.'), 'error');
            }
        }
    }, [selectedDate, effectiveOwnerId, activeOwnerId, buildHeadersForOwner, showNotification, t]);

    const fetchYearOverview = useCallback(async () => {
        try {
            const res = await api.get(`/api/agenda/year-overview/${currentYear}`, {
                headers: buildHeadersForOwner(effectiveOwnerId),
            });
            setYearOverview(res.data);
        } catch (err) {
            console.error('Agenda year overview fetch error:', err);
        }
    }, [currentYear, effectiveOwnerId, buildHeadersForOwner]);

    const fetchDelegations = useCallback(async () => {
        try {
            const res = await api.get('/api/agenda/delegations');
            setDelegationsData(res.data);
        } catch (err) {
            console.error('Delegations fetch error:', err);
        }
    }, []);

    const fetchFihristAndTags = useCallback(async () => {
        try {
            const [cardsRes, tagsRes] = await Promise.all([api.get('/api/cards?limit=100'), api.get('/api/tags')]);
            setContacts(
                Array.isArray(cardsRes.data?.cards)
                    ? cardsRes.data.cards
                    : Array.isArray(cardsRes.data)
                      ? cardsRes.data
                      : [],
            );
            setTags(Array.isArray(tagsRes.data) ? tagsRes.data : []);
        } catch (err) {
            console.error('Fihrist/tags fetch error:', err);
        }
    }, []);

    useEffect(() => {
        fetchDailyPage();
    }, [fetchDailyPage]);

    useEffect(() => {
        fetchYearOverview();
    }, [fetchYearOverview]);

    useEffect(() => {
        fetchDelegations();
        fetchFihristAndTags();
    }, [fetchDelegations, fetchFihristAndTags]);

    // Input-safe & modal-safe keyboard navigation (← / → to flip pages, N to focus quick entry, Esc to close drawer)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && contactDrawer) {
                e.preventDefault();
                setContactDrawer(null);
                return;
            }

            if (showDelegationModal || showShareModal || showPrintModal || contactDrawer) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const tag = document.activeElement?.tagName?.toLowerCase();
            const isEditable =
                tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;

            if (isEditable) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setSelectedDate((prev) => shiftDateString(prev, -1));
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setSelectedDate((prev) => shiftDateString(prev, 1));
            } else if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                quickInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showDelegationModal, showShareModal, showPrintModal, contactDrawer]);

    const handleCreateEntry = async (payload) => {
        try {
            await api.post(
                '/api/agenda/entries',
                {
                    ...payload,
                    date: selectedDate,
                },
                { headers: buildHeadersForOwner(effectiveOwnerId) },
            );
            await Promise.all([fetchDailyPage(), fetchYearOverview()]);
            return true;
        } catch {
            showNotification(t('agenda.entryCreateError', 'Kayıt eklenemedi.'), 'error');
            return false;
        }
    };

    const handleUpdateEntry = async (entryId, updates) => {
        try {
            await api.patch(`/api/agenda/entries/${entryId}`, updates, {
                headers: buildHeadersForOwner(effectiveOwnerId),
            });
            await Promise.all([fetchDailyPage(), fetchYearOverview()]);
        } catch {
            showNotification(t('agenda.entryUpdateError', 'Kayıt güncellenemedi.'), 'error');
        }
    };

    const handleDeleteEntry = async (entryId) => {
        try {
            await api.delete(`/api/agenda/entries/${entryId}`, {
                headers: buildHeadersForOwner(effectiveOwnerId),
            });
            await Promise.all([fetchDailyPage(), fetchYearOverview()]);
        } catch {
            showNotification(t('agenda.entryDeleteError', 'Bu kaydı silme yetkiniz yok.'), 'error');
        }
    };

    const handleMigrateUnfinished = async () => {
        try {
            const res = await api.post(
                '/api/agenda/entries/migrate-unfinished',
                { fromDate: selectedDate },
                { headers: buildHeadersForOwner(effectiveOwnerId) },
            );
            showNotification(
                t('agenda.migratedSuccess', {
                    defaultValue: `${res.data.migratedCount} açık kayıt ${res.data.toDate} sayfasına devredildi.`,
                    count: res.data.migratedCount,
                    toDate: res.data.toDate,
                }),
                'success',
            );
            await Promise.all([fetchDailyPage(), fetchYearOverview()]);
        } catch {
            showNotification(t('agenda.migrateError', 'Yarına devretme işlemi başarısız.'), 'error');
        }
    };

    const handleSavePageNotes = async (notesPayload, targetDate = selectedDate, targetOwnerId = effectiveOwnerId) => {
        try {
            const res = await api.put(`/api/agenda/day/${targetDate}/notes`, notesPayload, {
                headers: buildHeadersForOwner(targetOwnerId),
            });
            // Only update active dayData state if user is still viewing the same date and agenda owner
            if (
                targetDate === selectedDateRef.current &&
                Number(targetOwnerId) === Number(effectiveOwnerIdRef.current)
            ) {
                setDayData((prev) => (prev ? { ...prev, page: res.data.page } : prev));
            }
            fetchYearOverview();
            return true;
        } catch (err) {
            if (err.response?.status === 409) {
                showNotification(
                    t(
                        'agenda.versionConflictError',
                        'Bu sayfa başka bir sekmede güncellendi. Metninizi kopyalayıp sayfayı yenileyin.',
                    ),
                    'warning',
                );
            } else {
                showNotification(t('agenda.notesSaveError', 'Not sayfası kaydedilemedi.'), 'error');
            }
            return false;
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults(null);
            return;
        }
        try {
            const res = await api.get(`/api/agenda/search?q=${encodeURIComponent(searchQuery.trim())}`, {
                headers: buildHeadersForOwner(effectiveOwnerId),
            });
            setSearchResults(res.data.entries || []);
        } catch {
            showNotification(t('agenda.searchError', 'Arama yapılamadı.'), 'error');
        }
    };

    const handleOpenContactHistory = async (cardId, displayName, card) => {
        try {
            const res = await api.get(`/api/agenda/contact/${cardId}`, {
                headers: buildHeadersForOwner(effectiveOwnerId),
            });
            setContactDrawer({
                cardId,
                displayName,
                card,
                entries: res.data.entries || [],
            });
        } catch {
            showNotification(t('agenda.contactHistoryError', 'Kişi ajanda geçmişi yüklenemedi.'), 'error');
        }
    };

    const handleCreateDelegation = async (payload) => {
        try {
            await api.post('/api/agenda/delegations', payload);
            showNotification(t('agenda.delegationCreated', 'Vekil sekreter görevlendirmesi tanımlandı.'), 'success');
            fetchDelegations();
        } catch {
            showNotification(t('agenda.delegationCreateError', 'Vekâlet tanımlanamadı.'), 'error');
        }
    };

    const handleRevokeDelegation = async (id) => {
        try {
            await api.delete(`/api/agenda/delegations/${id}`);
            showNotification(t('agenda.delegationRevoked', 'Vekâlet sonlandırıldı.'), 'info');
            fetchDelegations();
        } catch {
            showNotification(t('agenda.delegationRevokeError', 'Vekâlet sonlandırılamadı.'), 'error');
        }
    };

    const handleOpenShareModal = async () => {
        setShowShareModal(true);
        try {
            const res = await api.get('/api/agenda/shares');
            setShares(res.data.outgoing || []);
        } catch {
            setShares([]);
        }
    };

    const handleCreateShare = async (payload) => {
        try {
            const res = await api.post('/api/agenda/shares', payload);
            const listRes = await api.get('/api/agenda/shares');
            setShares(listRes.data.outgoing || []);
            showNotification(t('agenda.shareCreated', 'Paylaşım bağlantısı oluşturuldu.'), 'success');
            return res.data;
        } catch {
            showNotification(t('agenda.shareCreateError', 'Paylaşım bağlantısı oluşturulamadı.'), 'error');
            return null;
        }
    };

    const handleRevokeShare = async (id) => {
        try {
            await api.delete(`/api/agenda/shares/${id}`);
            setShares((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: false } : s)));
            showNotification(t('agenda.shareRevoked', 'Paylaşım bağlantısı iptal edildi.'), 'info');
        } catch {
            showNotification(t('agenda.shareRevokeError', 'Paylaşım iptal edilemedi.'), 'error');
        }
    };

    const isOwner = dayData?.access
        ? dayData.access.isOwner
        : !activeOwnerId || Number(activeOwnerId) === Number(user?.id);
    const canWrite = dayData?.access ? isOwner || dayData.access.permission === 'write' : true;

    const formattedHumanDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
        (i18n.language || 'tr').startsWith('tr') ? 'tr-TR' : 'en-US',
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    );

    return (
        <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '18px 20px 60px' }}>
            {/* Substitute (Vekâlet) Active Banner */}
            {dayData?.access?.isDelegate && (
                <div
                    role="status"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                        padding: '12px 16px',
                        marginBottom: '14px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.16)',
                        border: '1px solid var(--accent-warning)',
                        color: 'var(--text-primary)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <FaUserShield color="var(--accent-warning)" size={18} />
                        <span>
                            <strong>
                                {t('agenda.substituteBannerPrefix', 'Vekâlet Modu')}:{' '}
                                {dayData.owner?.displayName || dayData.owner?.username}
                            </strong>{' '}
                            (
                            {dayData.access.permission === 'write'
                                ? t('agenda.permWrite', 'Not Ekleme & Durum Güncelleme')
                                : t('agenda.permRead', 'Sadece Görüntüleme')}
                            )
                        </span>
                        {dayData.access.handoverNote && (
                            <span
                                style={{
                                    padding: '3px 10px',
                                    borderRadius: '999px',
                                    background: 'var(--bg-card)',
                                    fontSize: '0.8rem',
                                }}
                            >
                                📌 {dayData.access.handoverNote}
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setActiveOwnerId(null)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        {t('agenda.backToMyAgenda', 'Kendi Ajandama Dön')}
                    </button>
                </div>
            )}

            {/* Top Agenda Desk Header */}
            <header
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '14px 18px',
                    borderRadius: '16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                    marginBottom: '14px',
                }}
            >
                {/* Left: Active Agenda Switcher + Date Flipper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {delegationsData.incoming?.filter((d) => d.isCurrentlyActive).length > 0 && (
                        <select
                            aria-label={t('agenda.switchAgendaAria', 'Aktif Ajanda Seçimi')}
                            value={activeOwnerId || ''}
                            onChange={(e) => setActiveOwnerId(e.target.value ? Number(e.target.value) : null)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1px solid var(--accent-warning)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                            }}
                        >
                            <option value="">📓 {t('agenda.myOwnAgendaOption', 'Kendi Ajandam')}</option>
                            {delegationsData.incoming
                                .filter((d) => d.isCurrentlyActive)
                                .map((d) => (
                                    <option key={d.id} value={d.principalUserId}>
                                        🤝 {t('agenda.substitutePrefix', 'Vekâlet')}:{' '}
                                        {d.principal?.displayName || d.principal?.username}
                                    </option>
                                ))}
                        </select>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            type="button"
                            onClick={() => setSelectedDate((prev) => shiftDateString(prev, -1))}
                            aria-label={t('agenda.prevDay', 'Önceki Gün')}
                            title={t('agenda.prevDayHint', 'Önceki Gün (←)')}
                            style={{
                                padding: '8px 10px',
                                borderRadius: '9px',
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <FaChevronLeft size={13} />
                        </button>

                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                            aria-label={t('agenda.datePickerAria', 'Ajanda Tarihi')}
                            style={{
                                padding: '7px 10px',
                                borderRadius: '9px',
                                border: '1px solid var(--glass-border)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => setSelectedDate((prev) => shiftDateString(prev, 1))}
                            aria-label={t('agenda.nextDay', 'Sonraki Gün')}
                            title={t('agenda.nextDayHint', 'Sonraki Gün (→)')}
                            style={{
                                padding: '8px 10px',
                                borderRadius: '9px',
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <FaChevronRight size={13} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedDate(getTodayLocal())}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '7px 12px',
                                borderRadius: '9px',
                                border: '1px solid var(--accent-primary)',
                                background: 'var(--accent-primary-transparent)',
                                color: 'var(--accent-primary)',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                            }}
                        >
                            <FaCalendarDay size={12} />
                            <span>{t('agenda.todayBtn', 'Bugün')}</span>
                        </button>
                    </div>

                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {formattedHumanDate}
                    </div>
                </div>

                {/* Right: Search + Vekâlet + Share + Print */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!e.target.value.trim()) setSearchResults(null);
                            }}
                            placeholder={t('agenda.searchPlaceholder', 'Ajandada ara...')}
                            style={{
                                padding: '7px 11px',
                                borderRadius: '9px',
                                border: '1px solid var(--glass-border)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                fontSize: '0.83rem',
                                width: '170px',
                            }}
                        />
                        <button
                            type="submit"
                            aria-label={t('agenda.searchBtnAria', 'Ajandada Ara')}
                            style={{
                                padding: '8px 10px',
                                borderRadius: '9px',
                                border: '1px solid var(--glass-border)',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                            }}
                        >
                            <FaSearch size={12} />
                        </button>
                    </form>

                    {isOwner && (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowDelegationModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    borderRadius: '9px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                <FaUserShield size={13} color="var(--accent-warning)" />
                                <span>{t('agenda.delegationBtn', 'Vekâlet / İzin')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenShareModal}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    borderRadius: '9px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                <FaShareAlt size={12} color="var(--accent-success)" />
                                <span>{t('agenda.sharePageBtn', 'Sayfayı Paylaş')}</span>
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowPrintModal(true)}
                        title={t('agenda.printSheetBtn', 'Yazdır / PDF')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '9px',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--glass-bg)',
                            color: 'var(--text-primary)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <FaPrint size={13} color="var(--accent-primary)" />
                        <span>{t('agenda.printSheetBtn', 'Yazdır / PDF')}</span>
                    </button>
                </div>
            </header>

            {/* Search Results Overlay Strip */}
            {searchResults !== null && (
                <div
                    style={{
                        padding: '12px 16px',
                        marginBottom: '14px',
                        borderRadius: '12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--accent-primary)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                        }}
                    >
                        <strong style={{ fontSize: '0.86rem' }}>
                            {t('agenda.searchResultsTitle', 'Ajanda Arama Sonuçları')} ({searchResults.length})
                        </strong>
                        <button
                            type="button"
                            onClick={() => setSearchResults(null)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                            }}
                        >
                            <FaTimes />
                        </button>
                    </div>
                    {searchResults.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                            {t('agenda.noSearchResults', 'Eşleşen ajanda kaydı bulunamadı.')}
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                maxHeight: '220px',
                                overflowY: 'auto',
                            }}
                        >
                            {searchResults.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedDate(item.date);
                                        setSearchResults(null);
                                    }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        textAlign: 'left',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--glass-bg)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.84rem',
                                    }}
                                >
                                    <span>
                                        <strong>{item.date}</strong> {item.timeSlot ? `(${item.timeSlot})` : ''} —{' '}
                                        {item.content}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--accent-primary)',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {t('agenda.goToPage', 'Sayfayı Aç →')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 12-Month Binder Tabs & Day Strip */}
            <MonthIndexTabs selectedDate={selectedDate} yearOverview={yearOverview} onSelectDate={setSelectedDate} />

            {/* Single-Line Keyboard-First Entry Bar */}
            <QuickEntryBar
                contacts={contacts}
                tags={tags}
                isOwner={isOwner}
                canWrite={canWrite}
                ownerId={effectiveOwnerId}
                onCreateEntry={handleCreateEntry}
                inputRef={quickInputRef}
            />

            {/* Two-Page Physical Desk Agenda Spread */}
            <DailyPageSpread
                selectedDate={selectedDate}
                page={dayData?.page}
                entries={dayData?.entries || []}
                access={
                    dayData?.access || {
                        isOwner,
                        permission: canWrite ? 'write' : 'read',
                        ownerId: effectiveOwnerId,
                        actorUserId: user?.id,
                    }
                }
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onMigrateUnfinished={handleMigrateUnfinished}
                onSavePageNotes={handleSavePageNotes}
                onOpenContactHistory={handleOpenContactHistory}
            />

            {/* Contact Agenda History Drawer ("Fihrist Kişi Geçmişi") */}
            {contactDrawer && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={contactDrawer.displayName}
                    style={{
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: 'min(420px, 92vw)',
                        zIndex: 1200,
                        background: 'var(--bg-card)',
                        borderLeft: '1px solid var(--glass-border)',
                        boxShadow: 'var(--glass-shadow-hover)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        overflowY: 'auto',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: 700 }}>
                                {t('agenda.contactDrawerSubtitle', 'Fihrist & Ajanda Geçmişi')}
                            </div>
                            <h3 style={{ margin: '2px 0 0' }}>@{contactDrawer.displayName}</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setContactDrawer(null)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                            }}
                        >
                            <FaTimes size={16} />
                        </button>
                    </div>

                    {contactDrawer.card && (
                        <div
                            style={{
                                padding: '12px',
                                borderRadius: '10px',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                fontSize: '0.83rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                            }}
                        >
                            {contactDrawer.card.company && (
                                <div>
                                    🏢 <strong>{contactDrawer.card.company}</strong> ({contactDrawer.card.title || '-'})
                                </div>
                            )}
                            {contactDrawer.card.phone && <div>📞 {contactDrawer.card.phone}</div>}
                            {contactDrawer.card.email && <div>✉️ {contactDrawer.card.email}</div>}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <strong style={{ fontSize: '0.84rem' }}>
                            {t('agenda.contactMentionedDays', 'Bu Kişinin Geçtiği Ajanda Yaprakları')} (
                            {contactDrawer.entries.length})
                        </strong>
                        {contactDrawer.entries.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setSelectedDate(item.date);
                                    setContactDrawer(null);
                                }}
                                style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {item.date} {item.timeSlot ? `• ${item.timeSlot}` : ''}
                                </div>
                                <div style={{ fontSize: '0.86rem', marginTop: '3px' }}>{item.content}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            <DelegationModal
                isOpen={showDelegationModal}
                onClose={() => setShowDelegationModal(false)}
                delegationsData={delegationsData}
                onCreateDelegation={handleCreateDelegation}
                onRevokeDelegation={handleRevokeDelegation}
            />

            <AgendaShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                selectedDate={selectedDate}
                shares={shares}
                onCreateShare={handleCreateShare}
                onRevokeShare={handleRevokeShare}
            />

            <AgendaPrintModal
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                selectedDate={selectedDate}
                isOwner={isOwner}
                ownerId={effectiveOwnerId}
                currentUserId={user?.id}
                onError={(msg) => showNotification(msg, 'error')}
            />
        </div>
    );
};

export default AgendaWorkspace;
