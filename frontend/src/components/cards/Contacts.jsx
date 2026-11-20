import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FaFileExcel, FaFilePdf, FaDownload, FaAddressCard } from 'react-icons/fa';
import api from '../../api/axios';
import { resolveApiError } from '../../utils/apiError';
import { useNotification } from '../../context/NotificationContext';
import { saveCardsToOffline, getOfflineCards } from '../../utils/offlineStore';
import { downloadFile } from '../../utils/downloadHelper';
import { generateVCardString } from '../../utils/vcardHelper';
import EmptyState from '../shared/EmptyState';
import SearchBar from './SearchBar';
import Modal from '../shared/Modal';
import ConfirmModal from '../shared/ConfirmModal';
import QRCodeOverlay from '../shared/QRCodeOverlay';
import HistoryTimeline from './HistoryTimeline';
import AddCard from './AddCard';
import ContactCardItem from './ContactCardItem';
import ContactsBulkBar, { CardImageModal } from './ContactsBulkBar';

const Contacts = () => {
    const { t, i18n } = useTranslation(['cards', 'common']);
    const [cards, setCards] = useState([]);
    const [expandedCardId, setExpandedCardId] = useState(null);

    const location = useLocation();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(location.search).get('search') || '');
    const [sortOption, setSortOption] = useState(() => new URLSearchParams(location.search).get('sort') || 'newest');
    const [advancedFilters, setAdvancedFilters] = useState(() => {
        const params = new URLSearchParams(location.search);
        return {
            tagId: params.get('tagId') || '',
            city: '',
            hasReminder: params.get('filter') === 'reminders',
            leadStatus: '',
            source: '',
            dateStart: '',
            dateEnd: '',
        };
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlSearch = params.get('search');
        const urlSort = params.get('sort');
        const urlTagId = params.get('tagId');
        const urlReminders = params.get('filter') === 'reminders';

        if (urlSearch !== null) setSearchTerm(urlSearch);
        if (urlSort) setSortOption(urlSort);
        if (urlTagId !== null || params.has('filter')) {
            setAdvancedFilters((prev) => ({
                ...prev,
                ...(urlTagId !== null ? { tagId: urlTagId } : {}),
                ...(params.has('filter') ? { hasReminder: urlReminders } : {}),
            }));
        }
    }, [location.search]);

    const [pagination, setPagination] = useState({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 20,
    });

    const [availableTags, setAvailableTags] = useState([]);
    const [availableCities, setAvailableCities] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [historyCard, setHistoryCard] = useState(null);
    const [selectedImageCard, setSelectedImageCard] = useState(null);
    const [qrModalCard, setQrModalCard] = useState(null);
    const [deleteConfirmCard, setDeleteConfirmCard] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
    const [bulkTagAction, setBulkTagAction] = useState('add');
    const [selectedBulkTags, setSelectedBulkTags] = useState([]);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isVcfExportConfirmOpen, setIsVcfExportConfirmOpen] = useState(false);
    const { showNotification } = useNotification();

    useEffect(() => {
        if (location.state?.openAddCard) {
            setIsModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAvailableFilters = async () => {
        try {
            const [tagsRes, citiesRes] = await Promise.all([api.get('/api/tags'), api.get('/api/cards/cities')]);
            setAvailableTags(tagsRes.data);
            setAvailableCities(citiesRes.data);
        } catch (err) {
            console.error('Filtreler yüklenemedi:', err);
        }
    };

    const fetchCards = async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page,
                limit: pagination.limit,
                search: searchTerm,
                sort: sortOption,
                tagId: advancedFilters.tagId,
                city: advancedFilters.city,
                hasReminder: advancedFilters.hasReminder,
                leadStatus: advancedFilters.leadStatus,
                source: advancedFilters.source,
                dateStart: advancedFilters.dateStart,
                dateEnd: advancedFilters.dateEnd,
            };

            const res = await api.get('/api/cards', { params });

            if (res.data && Array.isArray(res.data.cards)) {
                setCards(res.data.cards);
                setPagination(res.data.pagination);
                const hasActiveFilters = Boolean(
                    searchTerm ||
                    advancedFilters.tagId ||
                    advancedFilters.city ||
                    advancedFilters.hasReminder ||
                    advancedFilters.leadStatus ||
                    advancedFilters.source ||
                    advancedFilters.dateStart ||
                    advancedFilters.dateEnd,
                );
                if (page === 1 && !hasActiveFilters) {
                    await saveCardsToOffline(res.data.cards);
                }
            } else {
                setCards([]);
                setError(t('cards:contacts.error.unexpectedFormat'));
            }
        } catch {
            const cachedCards = await getOfflineCards();
            if (cachedCards.length > 0) {
                setCards(cachedCards);
                showNotification(t('cards:contacts.notify.offlineMode'), 'info');
            } else {
                setError(t('cards:contacts.error.loadFailedNoCache'));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAvailableFilters();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(
            () => {
                fetchCards(1);
            },
            searchTerm ? 500 : 0,
        );

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, sortOption, advancedFilters]);

    const toggleDetails = (id) => {
        setExpandedCardId(expandedCardId === id ? null : id);
    };

    const handleDeleteClick = (card) => {
        setDeleteConfirmCard(card);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmCard) return;

        try {
            await api.delete(`/api/cards/${deleteConfirmCard.id}`);
            showNotification(t('cards:contacts.notify.deleted'), 'success');
            fetchCards(pagination.currentPage);
            setDeleteConfirmCard(null);
        } catch (err) {
            showNotification(
                t('cards:contacts.notify.deleteFailed', { error: resolveApiError(err, '') || err.message }),
                'error',
            );
        }
    };

    const handleEdit = (card) => {
        setEditingCard(card);
        setIsModalOpen(true);
    };

    const openNewCardModal = () => {
        setEditingCard(null);
        setIsModalOpen(true);
    };

    const handleCardAddedOrUpdated = (cardToEdit) => {
        if (cardToEdit && cardToEdit.id) {
            setEditingCard(cardToEdit);
            setIsModalOpen(true);
            return;
        }
        fetchCards(1);
        setIsModalOpen(false);
        setEditingCard(null);
        setSelectedIds([]);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(cards.map((c) => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectCard = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const handleBulkVcfExport = async () => {
        setIsVcfExportConfirmOpen(false);
        try {
            showNotification(t('cards:contacts.notify.vcardPreparing'), 'info');
            const response = await api.get('/api/cards/export/vcf', { responseType: 'blob' });
            downloadFile(response.data, `contacts_${new Date().toISOString().slice(0, 10)}.vcf`, 'text/vcard');
            showNotification(t('cards:contacts.notify.vcardDownloaded'), 'success');
        } catch {
            showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
        }
    };

    const handleBulkDelete = async () => {
        try {
            await api.post('/api/cards/bulk-delete', { ids: selectedIds });
            showNotification(t('cards:contacts.notify.bulkDeleted', { count: selectedIds.length }), 'success');
            setSelectedIds([]);
            setIsBulkDeleteConfirmOpen(false);
            fetchCards(pagination.currentPage);
        } catch {
            showNotification(t('cards:contacts.notify.bulkDeleteFailed'), 'error');
        }
    };

    const handleBulkVisibility = async (visibility) => {
        try {
            await api.post('/api/cards/bulk-visibility', { ids: selectedIds, visibility });
            showNotification(
                t('cards:contacts.notify.visibilityUpdated', {
                    visibility:
                        visibility === 'public' ? t('common:visibility.public') : t('common:visibility.private'),
                }),
                'success',
            );
            setSelectedIds([]);
            fetchCards(pagination.currentPage);
        } catch {
            showNotification(t('cards:contacts.notify.visibilityFailed'), 'error');
        }
    };

    const handleBulkTags = async () => {
        try {
            await api.post('/api/cards/bulk-tags', {
                ids: selectedIds,
                tagIds: selectedBulkTags,
                mode: bulkTagAction,
            });
            showNotification(t('cards:contacts.notify.tagsUpdated'), 'success');
            setSelectedIds([]);
            setIsBulkTagModalOpen(false);
            setSelectedBulkTags([]);
            fetchCards(pagination.currentPage);
        } catch {
            showNotification(t('cards:contacts.notify.tagsFailed'), 'error');
        }
    };

    const handleBulkExport = async (type) => {
        try {
            const endpoint = type === 'excel' ? '/api/cards/export/excel' : '/api/cards/export/pdf';
            const fileName = `secilen_kartvizitler.${type === 'excel' ? 'xlsx' : 'pdf'}`;
            const mimeType =
                type === 'excel'
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    : 'application/pdf';

            showNotification(t('cards:contacts.notify.exportPreparing', { type: type.toUpperCase() }), 'info');
            const response = await api.get(endpoint, {
                params: { ids: selectedIds.join(',') },
                responseType: 'blob',
            });
            downloadFile(response.data, fileName, mimeType);
            showNotification(t('cards:contacts.notify.fileDownloaded'), 'success');
        } catch {
            showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
        }
    };

    const handleDownloadVCard = async (card) => {
        try {
            showNotification(t('cards:contacts.notify.vcardPreparing'), 'info');
            const response = await api.get(`/api/cards/${card.id}/vcf`, {
                responseType: 'blob',
            });
            downloadFile(response.data, `${card.firstName}_${card.lastName}.vcf`, 'text/vcard');
            showNotification(t('cards:contacts.notify.vcardDownloaded'), 'success');
        } catch {
            showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
        }
    };

    const handleWhatsAppFollowUp = (card) => {
        const message = t('cards:contacts.followUp.whatsappMessage', {
            name: card.firstName + (card.lastName ? ' ' + card.lastName : ''),
        });
        const phone = card.phone.replace(/\D/g, '');
        window.open(
            `https://wa.me/${phone.startsWith('0') ? '9' + phone : phone}?text=${encodeURIComponent(message)}`,
            '_blank',
        );
    };

    const handleEmailFollowUp = (card) => {
        const subject = t('cards:contacts.followUp.emailSubject');
        const body = t('cards:contacts.followUp.emailBody', { firstName: card.firstName, lastName: card.lastName });
        window.location.href = `mailto:${card.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Hot':
                return {
                    bg: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    icon: '🔥',
                    label: t('common:leadStatusShort.Hot'),
                };
            case 'Warm':
                return {
                    bg: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    icon: '⛅',
                    label: t('common:leadStatusShort.Warm'),
                };
            case 'Cold':
                return {
                    bg: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                    icon: '❄️',
                    label: t('common:leadStatusShort.Cold'),
                };
            case 'Following-up':
                return {
                    bg: 'rgba(139, 92, 246, 0.1)',
                    color: '#8b5cf6',
                    icon: '🔄',
                    label: t('common:leadStatusShort.Following-up'),
                };
            case 'Converted':
                return {
                    bg: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    icon: '✅',
                    label: t('common:leadStatusShort.Converted'),
                };
            default:
                return {
                    bg: 'rgba(156, 163, 175, 0.1)',
                    color: '#9ca3af',
                    icon: '👤',
                    label: t('common:leadStatusShort.unknown'),
                };
        }
    };

    const headerIconBtnStyle = (color) => ({
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px',
        cursor: 'pointer',
        color,
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(10px)',
    });

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--accent-error)' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>{t('cards:contacts.error.title')}</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{error}</p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fetchCards(1)}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                    }}
                >
                    {t('common:retry')}
                </motion.button>
            </div>
        );
    }

    const hasActiveFilters = Boolean(
        searchTerm ||
        advancedFilters.tagId ||
        advancedFilters.city ||
        advancedFilters.hasReminder ||
        advancedFilters.leadStatus ||
        advancedFilters.source ||
        advancedFilters.dateStart ||
        advancedFilters.dateEnd,
    );

    return (
        <div className="fade-in">
            <div className="contacts-header">
                <h2>{t('cards:contacts.title')}</h2>

                <div className="contacts-actions">
                    <button
                        onClick={async () => {
                            try {
                                showNotification(t('cards:contacts.notify.excelPreparing'), 'info');
                                const response = await api.get('/api/cards/export/excel', {
                                    params: { search: searchTerm },
                                    responseType: 'blob',
                                });
                                downloadFile(
                                    response.data,
                                    'kartvizitler.xlsx',
                                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                );
                                showNotification(t('cards:contacts.notify.excelDownloaded'), 'success');
                            } catch {
                                showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
                            }
                        }}
                        title={t('cards:contacts.titleAttr.downloadExcel')}
                        style={headerIconBtnStyle('var(--accent-success)')}
                    >
                        <FaFileExcel size={20} />
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                showNotification(t('cards:contacts.notify.pdfPreparing'), 'info');
                                const response = await api.get('/api/cards/export/pdf', {
                                    params: { search: searchTerm },
                                    responseType: 'blob',
                                });
                                downloadFile(response.data, 'kartvizitler.pdf', 'application/pdf');
                                showNotification(t('cards:contacts.notify.pdfDownloaded'), 'success');
                            } catch {
                                showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
                            }
                        }}
                        title={t('cards:contacts.titleAttr.downloadPdf')}
                        style={headerIconBtnStyle('var(--accent-error)')}
                    >
                        <FaFilePdf size={20} />
                    </button>

                    <button
                        onClick={() => setIsVcfExportConfirmOpen(true)}
                        title={t('cards:contacts.titleAttr.downloadVcf')}
                        style={headerIconBtnStyle('var(--accent-secondary)')}
                    >
                        <FaDownload size={20} />
                    </button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={openNewCardModal}
                        style={{
                            height: '44px',
                            padding: '0 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '700',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <span style={{ fontSize: '18px', lineHeight: 1, fontWeight: '800' }}>+</span>{' '}
                        {t('cards:contacts.btn.addNew')}
                    </motion.button>
                </div>
            </div>

            <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortOption={sortOption}
                onSortChange={setSortOption}
                advancedFilters={advancedFilters}
                onAdvancedFilterChange={setAdvancedFilters}
                allTags={availableTags}
                allCities={availableCities}
            />

            {/* Select All Bar */}
            <div
                style={{
                    margin: '20px 0 10px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0 10px',
                }}
            >
                <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length === cards.length && cards.length > 0}
                    style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: 'var(--accent-primary)',
                    }}
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    {selectedIds.length > 0
                        ? t('cards:contacts.selected', { count: selectedIds.length })
                        : t('cards:contacts.selectAll')}
                </span>
            </div>

            {loading && (
                <div className="my-card-layout">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card-wrapper">
                            <div className="glass-container skeleton-box" style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                    <div
                                        style={{
                                            width: '200px',
                                            height: '120px',
                                            borderRadius: '12px',
                                            background: 'rgba(var(--accent-secondary-rgb), 0.05)',
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div
                                            className="skeleton-text"
                                            style={{ width: '60%', height: '20px', marginBottom: '8px' }}
                                        />
                                        <div
                                            className="skeleton-text"
                                            style={{ width: '40%', height: '16px', marginBottom: '12px' }}
                                        />
                                        <div className="skeleton-text" style={{ width: '80%', height: '14px' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && cards.length === 0 ? (
                hasActiveFilters ? (
                    <EmptyState
                        icon={FaAddressCard}
                        title={t('cards:contacts.noResults', 'Sonuç bulunamadı')}
                        description={t(
                            'cards:contacts.noResultsDescription',
                            'Filtrelere uygun kartvizit bulunamadı. Filtreleri temizleyip tekrar deneyin.',
                        )}
                        actionLabel={t('common:clearFilters', 'Filtreleri Temizle')}
                        onAction={() => {
                            setSearchTerm('');
                            setAdvancedFilters({
                                tagId: '',
                                city: '',
                                hasReminder: false,
                                leadStatus: '',
                                source: '',
                                dateStart: '',
                                dateEnd: '',
                            });
                        }}
                    />
                ) : (
                    <EmptyState
                        icon={FaAddressCard}
                        title={t('cards:contacts.emptyTitle')}
                        description={t('cards:contacts.emptyDescription')}
                        actionLabel={t('cards:contacts.btn.addNew')}
                        onAction={() => setIsModalOpen(true)}
                    />
                )
            ) : !loading ? (
                <div className="my-card-layout" style={{ marginTop: '30px' }}>
                    {cards.map((card, index) => (
                        <ContactCardItem
                            key={card.id}
                            card={card}
                            index={index}
                            t={t}
                            i18n={i18n}
                            navigate={navigate}
                            isSelected={selectedIds.includes(card.id)}
                            isExpanded={expandedCardId === card.id}
                            getStatusStyle={getStatusStyle}
                            onSelectCard={handleSelectCard}
                            onSelectImage={setSelectedImageCard}
                            onToggleDetails={toggleDetails}
                            onWhatsAppFollowUp={handleWhatsAppFollowUp}
                            onEmailFollowUp={handleEmailFollowUp}
                            onOpenQr={setQrModalCard}
                            onDownloadVCard={handleDownloadVCard}
                            onOpenHistory={setHistoryCard}
                            onEdit={handleEdit}
                            onDeleteClick={handleDeleteClick}
                        />
                    ))}
                </div>
            ) : null}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '20px',
                        marginTop: '40px',
                        padding: '20px',
                    }}
                >
                    <button
                        onClick={() => fetchCards(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="glass-button"
                        style={{
                            padding: '10px 20px',
                            opacity: pagination.currentPage === 1 ? 0.5 : 1,
                            cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {t('cards:contacts.btn.previous')}
                    </button>

                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
                        {t('cards:contacts.pagination', {
                            current: pagination.currentPage,
                            total: pagination.totalPages,
                        })}
                    </span>

                    <button
                        onClick={() => fetchCards(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="glass-button"
                        style={{
                            padding: '10px 20px',
                            opacity: pagination.currentPage === pagination.totalPages ? 0.5 : 1,
                            cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {t('cards:contacts.btn.next')}
                    </button>
                </div>
            )}

            <CardImageModal t={t} selectedImageCard={selectedImageCard} onClose={() => setSelectedImageCard(null)} />

            <Modal
                title={t('cards:contacts.modal.history')}
                isOpen={!!historyCard}
                onClose={() => setHistoryCard(null)}
            >
                {historyCard && <HistoryTimeline cardId={historyCard.id} />}
            </Modal>

            <ConfirmModal
                isOpen={!!deleteConfirmCard}
                onClose={() => setDeleteConfirmCard(null)}
                onConfirm={handleDeleteConfirm}
                title={t('cards:contacts.modal.deleteTitle')}
                message={
                    deleteConfirmCard
                        ? t('cards:contacts.modal.deleteMessage', {
                              firstName: deleteConfirmCard.firstName,
                              lastName: deleteConfirmCard.lastName,
                          })
                        : ''
                }
            />

            {qrModalCard && (
                <QRCodeOverlay
                    title={`${qrModalCard.firstName} ${qrModalCard.lastName}`}
                    url={`${window.location.origin}/contact-profile/${qrModalCard.sharingToken}`}
                    vCardData={generateVCardString(qrModalCard)}
                    onClose={() => setQrModalCard(null)}
                    onDownloadVCard={() => handleDownloadVCard(qrModalCard)}
                />
            )}

            <Modal
                title={editingCard ? t('cards:contacts.modal.editTitle') : t('cards:contacts.modal.addTitle')}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingCard(null);
                }}
            >
                <AddCard onCardAdded={handleCardAddedOrUpdated} activeCard={editingCard} />
            </Modal>

            <ContactsBulkBar
                t={t}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                availableTags={availableTags}
                isBulkTagModalOpen={isBulkTagModalOpen}
                setIsBulkTagModalOpen={setIsBulkTagModalOpen}
                bulkTagAction={bulkTagAction}
                setBulkTagAction={setBulkTagAction}
                selectedBulkTags={selectedBulkTags}
                setSelectedBulkTags={setSelectedBulkTags}
                onBulkTags={handleBulkTags}
                onBulkVisibility={handleBulkVisibility}
                onBulkExport={handleBulkExport}
                isBulkDeleteConfirmOpen={isBulkDeleteConfirmOpen}
                setIsBulkDeleteConfirmOpen={setIsBulkDeleteConfirmOpen}
                onBulkDelete={handleBulkDelete}
                isVcfExportConfirmOpen={isVcfExportConfirmOpen}
                setIsVcfExportConfirmOpen={setIsVcfExportConfirmOpen}
                onBulkVcfExport={handleBulkVcfExport}
            />
        </div>
    );
};

export default Contacts;
