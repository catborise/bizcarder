import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { API_URL } from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { saveCardsToOffline, getOfflineCards } from '../../utils/offlineStore';
import { downloadFile } from '../../utils/downloadHelper';
import { FaIdCard, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCity, FaGlobe, FaStickyNote, FaChevronDown, FaChevronUp, FaTrash, FaClock, FaFileExcel, FaFilePdf, FaDownload, FaCalendarCheck, FaEdit, FaSave, FaCopy, FaQrcode, FaStar, FaWhatsapp, FaAddressCard } from 'react-icons/fa';
import EmptyState from '../shared/EmptyState';
import SearchBar from './SearchBar';
import Modal from '../shared/Modal';
import ConfirmModal from '../shared/ConfirmModal';
import QRCodeOverlay from '../shared/QRCodeOverlay';
import HistoryTimeline from './HistoryTimeline';
import AddCard from './AddCard';
import InteractionLog from './InteractionLog';
import { generateVCardString } from '../../utils/vcardHelper';

import { motion, AnimatePresence } from 'framer-motion';

const Contacts = () => {
    const { t, i18n } = useTranslation(['cards', 'common']);
    const [cards, setCards] = useState([]);
    const [expandedCardId, setExpandedCardId] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    const [advancedFilters, setAdvancedFilters] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return {
            tagId: params.get('tagId') || '',
            city: '',
            hasReminder: params.get('filter') === 'reminders' ? true : false,
            leadStatus: '',
            source: '',
            dateStart: '',
            dateEnd: ''
        };
    });

    const [pagination, setPagination] = useState({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 20
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
    const [bulkTagAction, setBulkTagAction] = useState('add'); // 'add' or 'replace'
    const [selectedBulkTags, setSelectedBulkTags] = useState([]);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const { showNotification } = useNotification();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.openAddCard) {
            setIsModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCachedData, setIsCachedData] = useState(false);

    const fetchAvailableFilters = async () => {
        try {
            const [tagsRes, citiesRes] = await Promise.all([
                api.get('/api/tags'),
                api.get('/api/cards/cities')
            ]);
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
                dateEnd: advancedFilters.dateEnd
            };

            const res = await api.get('/api/cards', { params });
            
            if (res.data && Array.isArray(res.data.cards)) {
                setCards(res.data.cards);
                setPagination(res.data.pagination);
                setIsCachedData(false);
                if (page === 1 && !searchTerm) {
                    await saveCardsToOffline(res.data.cards);
                }
            } else {
                setCards([]);
                setError(t('cards:contacts.error.unexpectedFormat'));
            }
        } catch (err) {
            const cachedCards = await getOfflineCards();
            if (cachedCards.length > 0) {
                setCards(cachedCards);
                setIsCachedData(true);
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
    }, []); // Sadece bir kez yükle

    // Filtreleri veya Arama Terimini Takip Eden Tek Bir Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCards(1);
        }, searchTerm ? 500 : 0); // Boş aramada anında çek, yazarken bekle

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, sortOption, advancedFilters]);

    // Sadece Sayfa Değişimi İçin (Filtreler Değiştiğinde Değil)
    // Bu Effect, Sayfa Değiştiğinde fetchCards'ı çağırmak için gerekli
    useEffect(() => {
        // Eğer sayfa 1 değilse (başlangıçta 1 olduğu için ilk renderda kaçınabiliriz ama sayfa değişimi kritik)
        if (pagination.currentPage !== 1) {
            fetchCards(pagination.currentPage);
        }
    }, [pagination.currentPage]);

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
        } catch (error) {
            showNotification(t('cards:contacts.notify.deleteFailed', { error: error.response?.data?.error || error.message }), 'error');
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

    const handleCardAddedOrUpdated = () => {
        fetchCards(1);
        setIsModalOpen(false);
        setEditingCard(null);
        setSelectedIds([]);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(cards.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectCard = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        try {
            await api.post('/api/cards/bulk-delete', { ids: selectedIds });
            showNotification(t('cards:contacts.notify.bulkDeleted', { count: selectedIds.length }), 'success');
            setSelectedIds([]);
            setIsBulkDeleteConfirmOpen(false);
            fetchCards(pagination.currentPage);
        } catch (error) {
            showNotification(t('cards:contacts.notify.bulkDeleteFailed'), 'error');
        }
    };

    const handleBulkVisibility = async (visibility) => {
        try {
            await api.post('/api/cards/bulk-visibility', { ids: selectedIds, visibility });
            showNotification(t('cards:contacts.notify.visibilityUpdated', { visibility: visibility === 'public' ? t('common:visibility.public') : t('common:visibility.private') }), 'success');
            setSelectedIds([]);
            fetchCards(pagination.currentPage);
        } catch (error) {
            showNotification(t('cards:contacts.notify.visibilityFailed'), 'error');
        }
    };

    const handleBulkTags = async () => {
        try {
            await api.post('/api/cards/bulk-tags', { 
                ids: selectedIds, 
                tagIds: selectedBulkTags,
                mode: bulkTagAction
            });
            showNotification(t('cards:contacts.notify.tagsUpdated'), 'success');
            setSelectedIds([]);
            setIsBulkTagModalOpen(false);
            setSelectedBulkTags([]);
            fetchCards(pagination.currentPage);
        } catch (error) {
            showNotification(t('cards:contacts.notify.tagsFailed'), 'error');
        }
    };

    const handleBulkExport = async (type) => {
        try {
            const endpoint = type === 'excel' ? '/api/cards/export/excel' : '/api/cards/export/pdf';
            const fileName = `secilen_kartvizitler.${type === 'excel' ? 'xlsx' : 'pdf'}`;
            const mimeType = type === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
            
            showNotification(t('cards:contacts.notify.exportPreparing', { type: type.toUpperCase() }), 'info');
            const response = await api.get(endpoint, {
                params: { ids: selectedIds.join(',') },
                responseType: 'blob'
            });
            downloadFile(response.data, fileName, mimeType);
            showNotification(t('cards:contacts.notify.fileDownloaded'), 'success');
        } catch (error) {
            showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
        }
    };

    const handleDownloadVCard = async (card) => {
        try {
            showNotification(t('cards:contacts.notify.vcardPreparing'), 'info');
            const response = await api.get(`/api/cards/${card.id}/vcf`, {
                responseType: 'blob'
            });
            downloadFile(response.data, `${card.firstName}_${card.lastName}.vcf`, 'text/vcard');
            showNotification(t('cards:contacts.notify.vcardDownloaded'), 'success');
        } catch (error) {
            showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
        }
    };

    const handleWhatsAppFollowUp = (card) => {
        const message = t('cards:contacts.followUp.whatsappMessage', { name: card.firstName + (card.lastName ? ' ' + card.lastName : '') });
        const phone = card.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone.startsWith('0') ? '9' + phone : phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleEmailFollowUp = (card) => {
        const subject = t('cards:contacts.followUp.emailSubject');
        const body = t('cards:contacts.followUp.emailBody', { firstName: card.firstName, lastName: card.lastName });
        window.location.href = `mailto:${card.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'Hot': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: '🔥', label: t('common:leadStatusShort.Hot') };
            case 'Warm': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: '⛅', label: t('common:leadStatusShort.Warm') };
            case 'Cold': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: '❄️', label: t('common:leadStatusShort.Cold') };
            case 'Following-up': return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', icon: '🔄', label: t('common:leadStatusShort.Following-up') };
            case 'Converted': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: '✅', label: t('common:leadStatusShort.Converted') };
            default: return { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', icon: '👤', label: t('common:leadStatusShort.unknown') };
        }
    };

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--accent-error)' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>{t('cards:contacts.error.title')}</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{error}</p>
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={fetchCards} 
                    style={{ 
                        padding: '12px 24px', 
                        backgroundColor: 'var(--bg-card)', 
                        color: 'var(--text-primary)', 
                        border: '1px solid var(--glass-border)', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    {t('common:retry')}
                </motion.button>
            </div>
        );
    }

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
                                    responseType: 'blob'
                                });
                                downloadFile(response.data, 'kartvizitler.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                                showNotification(t('cards:contacts.notify.excelDownloaded'), 'success');
                            } catch (error) {
                                showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
                            }
                        }}
                        title={t('cards:contacts.titleAttr.downloadExcel')}
                        style={{
                            width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px',
                            cursor: 'pointer', color: 'var(--accent-success)', transition: 'all 0.2s ease',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <FaFileExcel size={20} />
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                showNotification(t('cards:contacts.notify.pdfPreparing'), 'info');
                                const response = await api.get('/api/cards/export/pdf', {
                                    params: { search: searchTerm },
                                    responseType: 'blob'
                                });
                                downloadFile(response.data, 'kartvizitler.pdf', 'application/pdf');
                                showNotification(t('cards:contacts.notify.pdfDownloaded'), 'success');
                            } catch (error) {
                                showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
                            }
                        }}
                        title={t('cards:contacts.titleAttr.downloadPdf')}
                        style={{
                            width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px',
                            cursor: 'pointer', color: 'var(--accent-error)', transition: 'all 0.2s ease',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <FaFilePdf size={20} />
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                showNotification(t('cards:contacts.notify.vcardPreparing', 'Preparing vCard...'), 'info');
                                const response = await api.get('/api/cards/export/vcf', {
                                    responseType: 'blob',
                                });
                                downloadFile(response.data, `contacts_${new Date().toISOString().slice(0, 10)}.vcf`, 'text/vcard');
                                showNotification(t('cards:contacts.notify.vcardDownloaded', 'vCard downloaded.'), 'success');
                            } catch (err) {
                                showNotification(t('cards:contacts.notify.downloadFailed'), 'error');
                            }
                        }}
                        title={t('cards:contacts.titleAttr.downloadVcf', 'Download all as vCard')}
                        style={{
                            width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px',
                            cursor: 'pointer', color: 'var(--accent-secondary)', transition: 'all 0.2s ease',
                        }}
                    >
                        <FaDownload size={20} />
                    </button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={openNewCardModal}
                        style={{
                            height: '44px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
                            fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap'
                        }}
                    >
                        <span style={{ fontSize: '18px', lineHeight: 1, fontWeight: '800' }}>+</span> {t('cards:contacts.btn.addNew')}
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
            <div style={{ 
                margin: '20px 0 10px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                padding: '0 10px'
            }}>
                <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={selectedIds.length === cards.length && cards.length > 0}
                    style={{ 
                        width: '18px', 
                        height: '18px', 
                        cursor: 'pointer',
                        accentColor: 'var(--accent-primary)'
                    }} 
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    {selectedIds.length > 0 ? t('cards:contacts.selected', { count: selectedIds.length }) : t('cards:contacts.selectAll')}
                </span>
            </div>

            {loading && (
              <div className="my-card-layout">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card-wrapper">
                    <div className="glass-container skeleton-box" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                        <div style={{ width: '200px', height: '120px', borderRadius: '12px', background: 'rgba(var(--accent-secondary-rgb), 0.05)' }} />
                        <div style={{ flex: 1 }}>
                          <div className="skeleton-text" style={{ width: '60%', height: '20px', marginBottom: '8px' }} />
                          <div className="skeleton-text" style={{ width: '40%', height: '16px', marginBottom: '12px' }} />
                          <div className="skeleton-text" style={{ width: '80%', height: '14px' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && cards.length === 0 ? (
              searchTerm || advancedFilters.tagId || advancedFilters.city || advancedFilters.hasReminder || advancedFilters.leadStatus || advancedFilters.source || advancedFilters.dateStart || advancedFilters.dateEnd ? (
                <EmptyState
                  icon={FaAddressCard}
                  title={t('cards:contacts.noResults', 'Sonuç bulunamadı')}
                  description={t('cards:contacts.noResultsDescription', 'Filtrelere uygun kartvizit bulunamadı. Filtreleri temizleyip tekrar deneyin.')}
                  actionLabel={t('common:clearFilters', 'Filtreleri Temizle')}
                  onAction={() => {
                    setSearchTerm('');
                    setAdvancedFilters({ tagId: '', city: '', hasReminder: false, leadStatus: '', source: '', dateStart: '', dateEnd: '' });
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
                {cards.length > 0 ? (
                    cards.map((card, index) => (
                        <motion.div
                          key={card.id}
                          className="card-wrapper"
                          data-priority={card.priority || ''}
                          data-lead={card.leadStatus || ''}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.04,
                            ease: 'easeOut',
                          }}
                        >
                        <div className="glass-container" style={{
                            border: selectedIds.includes(card.id) ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                            backgroundColor: selectedIds.includes(card.id) ? 'var(--accent-primary-transparent)' : 'var(--glass-bg)',
                            padding: '20px'
                        }}>
                            <div className="contact-card">
                                {/* Row Checkbox */}
                                <div className="checkbox-container">
                                    <input 
                                        type="checkbox"
                                        checked={selectedIds.includes(card.id)}
                                        onChange={() => handleSelectCard(card.id)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                    />
                                </div>

                                {/* Image + Status Badges Column */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                                {card.frontImageUrl ? (
                                    <div
                                        onClick={() => setSelectedImageCard(card)}
                                        className="card-image-container"
                                    >
                                        <img src={`${API_URL}${card.frontImageUrl}`} alt={card.firstName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 'bold', opacity: 0.8 }}>v{card.version || 1}</div>
                                    </div>
                                ) : (
                                    <div className="card-image-container">
                                        <FaIdCard size={64} style={{ opacity: 0.5 }} />
                                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 'bold', opacity: 0.5 }}>v{card.version || 1}</div>
                                    </div>
                                )}

                                {/* Status / Priority / Tags — below the image */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {card.leadStatus && (
                                        <div style={{ 
                                            padding: '4px 10px', 
                                            borderRadius: '8px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 'bold',
                                            background: getStatusStyle(card.leadStatus).bg,
                                            color: getStatusStyle(card.leadStatus).color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            border: `1px solid ${getStatusStyle(card.leadStatus).color}33`
                                        }}>
                                            <span>{getStatusStyle(card.leadStatus).icon}</span>
                                            {getStatusStyle(card.leadStatus).label}
                                        </div>
                                    )}
                                    {card.priority > 0 && (
                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <FaStar key={star} size={12} color={card.priority >= star ? 'var(--accent-warning)' : 'rgba(128,128,128,0.3)'} />
                                            ))}
                                        </div>
                                    )}
                                    {card.tags && card.tags.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                                            {card.tags.map(tag => {
                                                const isLight = (color) => {
                                                    if (!color || color.length < 7) return true;
                                                    const hex = color.replace('#', '');
                                                    const r = parseInt(hex.substring(0, 2), 16);
                                                    const g = parseInt(hex.substring(2, 4), 16);
                                                    const b = parseInt(hex.substring(4, 6), 16);
                                                    return (r * 299 + g * 587 + b * 114) / 1000 > 155;
                                                };
                                                return (
                                                    <span 
                                                        key={tag.id} 
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/contacts?tagId=${tag.id}`); }}
                                                        style={{ 
                                                            padding: '2px 8px', 
                                                            borderRadius: '12px', 
                                                            fontSize: '0.7rem', 
                                                            fontWeight: '700', 
                                                            background: tag.color || 'var(--accent-primary)', 
                                                            color: isLight(tag.color) ? '#000' : '#fff',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                </div>

                                <div className="card-info">
                                    <h3>{card.firstName} {card.lastName}</h3>
                                    <p className="company-line">
                                        {card.logoUrl && <img src={`${API_URL}${card.logoUrl}`} alt={card.company ? `${card.company} logo` : 'Company logo'} style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '4px', background: 'var(--bg-card)', padding: '2px', border: '1px solid var(--glass-border)' }} />}
                                        {card.company} {card.title && `- ${card.title}`}
                                    </p>

                                    {card.tags && card.tags.length > 0 && (
                                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                        {card.tags.slice(0, 3).map(tag => (
                                          <span key={tag._id || tag} className="tag-chip">
                                            {tag.name || tag}
                                          </span>
                                        ))}
                                        {card.tags.length > 3 && (
                                          <span className="tag-chip-more">+{card.tags.length - 3}</span>
                                        )}
                                      </div>
                                    )}

                                    {card.lastInteraction && (
                                      <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-tertiary)',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}>
                                        <FaClock size={10} />
                                        {t('cards:contacts.lastInteraction')}: {card.lastInteraction.type} — {new Date(card.lastInteraction.date).toLocaleDateString()}
                                      </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '0.9em' }}>
                                        {card.reminderDate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--glass-bg)', borderRadius: '8px', border: '1px solid var(--accent-warning)', marginBottom: '5px' }}>
                                                <FaCalendarCheck color="var(--accent-warning)" />
                                                <strong style={{ color: 'var(--text-primary)' }}>{t('cards:contacts.field.reminder')}</strong>
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    {(() => {
                                                        const d = new Date(card.reminderDate);
                                                        return isNaN(d.getTime()) ? t('cards:contacts.field.noDate') : d.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US');
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                        {card.lastInteractionDate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaClock color="var(--accent-primary)" size={12} /> 
                                                <strong style={{ color: 'var(--text-tertiary)' }}>{t('cards:contacts.field.lastInteraction')}</strong> 
                                                <span style={{ color: 'var(--text-secondary)' }}>{new Date(card.lastInteractionDate).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}</span>
                                            </div>
                                        )}
                                        {card.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaEnvelope color="var(--accent-warning)" /> <strong style={{ color: 'var(--text-tertiary)' }}>{t('cards:contacts.field.email')}</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.email}</span></div>}
                                        {card.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaPhone color="var(--accent-success)" /> <strong style={{ color: 'var(--text-tertiary)' }}>{t('cards:contacts.field.phone')}</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.phone}</span></div>}
                                        {card.website && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaGlobe color="var(--accent-primary)" /> <strong style={{ color: 'var(--text-tertiary)' }}>{t('cards:contacts.field.web')}</strong> <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)' }}>{card.website}</a></div>}
                                        {(card.city || card.country) && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaCity color="var(--accent-error)" /> <strong style={{ color: 'var(--text-tertiary)' }}>{t('cards:contacts.field.location')}</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.city}{card.city && card.country && ', '}{card.country}</span></div>}
                                        {card.address && <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}><FaMapMarkerAlt color="var(--accent-error)" style={{ marginTop: '3px' }} /><strong style={{ color: 'var(--text-tertiary)' }}>{t('cards:contacts.field.address')}</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.address}</span></div>}
                                        {card.source && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaIdCard color="var(--accent-primary)" size={12} /> <strong style={{ color: 'var(--text-tertiary)' }}>{t('cards:contacts.field.source')}</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.source}</span></div>}
                                    </div>
                                </div>

                                <div className="card-actions">
                                    <button onClick={() => toggleDetails(card.id)} className="glass-button-block" style={{ color: 'var(--accent-warning)', padding: '10px 12px', fontSize: '0.9rem', border: '1px solid var(--accent-warning)', background: expandedCardId === card.id ? 'var(--glass-bg-hover)' : 'transparent' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaStickyNote /> {t('cards:contacts.btn.activityNotes')}</span>
                                        {expandedCardId === card.id ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                    </button>
                                    
                                    {/* Hızlı Takip Butonları */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        {card.phone && (
                                            <button 
                                                onClick={() => handleWhatsAppFollowUp(card)} 
                                                className="glass-button-square" 
                                                title={t('cards:contacts.titleAttr.whatsappFollow')} 
                                                style={{ color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.3)' }}
                                            >
                                                <FaWhatsapp size={20} />
                                            </button>
                                        )}
                                        {card.email && (
                                            <button 
                                                onClick={() => handleEmailFollowUp(card)} 
                                                className="glass-button-square" 
                                                title={t('cards:contacts.titleAttr.emailFollow')} 
                                                style={{ color: 'var(--accent-warning)', borderColor: 'rgba(255, 193, 7, 0.3)' }}
                                            >
                                                <FaEnvelope size={18} />
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }}></div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setQrModalCard(card)} className="glass-button-square" title={t('cards:contacts.titleAttr.qrVcard')} aria-label={t('cards:contacts.titleAttr.qrVcard')}><FaQrcode size={18} /></button>
                                        <button onClick={() => handleDownloadVCard(card)} className="glass-button-square" title={t('cards:contacts.titleAttr.downloadVcard')} aria-label={t('cards:contacts.titleAttr.downloadVcard')}><FaDownload size={18} /></button>
                                        <button onClick={() => setHistoryCard(card)} className="glass-button-square" title={t('cards:contacts.titleAttr.history')} aria-label={t('cards:contacts.titleAttr.history')}><FaClock size={16} /></button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleEdit(card)} className="glass-button-small" style={{ flex: 1 }}>{t('cards:contacts.btn.edit')}</button>
                                        <button onClick={() => handleDeleteClick(card)} className="glass-button-small" aria-label={t('cards:contacts.deleteTitle', { firstName: card.firstName, lastName: card.lastName })} style={{ color: 'var(--accent-error)', width: '40px' }}><FaTrash size={14} /></button>
                                    </div>
                                </div>
                            </div>

                            {expandedCardId === card.id && (
                                <div style={{ marginTop: '15px', padding: '20px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <InteractionLog cardId={card.id} />
                                </div>
                            )}
                        </div>
                        </motion.div>
                    ))
                ) : (
                    <div style={{ padding: '50px', textAlign: 'center', opacity: 0.3 }}><FaIdCard size={64} style={{ marginBottom: '20px' }} /><h3>{t('cards:contacts.empty')}</h3></div>
                )}
            </div>
            ) : null}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '20px',
                    marginTop: '40px',
                    padding: '20px'
                }}>
                    <button
                        onClick={() => fetchCards(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="glass-button"
                        style={{
                            padding: '10px 20px',
                            opacity: pagination.currentPage === 1 ? 0.5 : 1,
                            cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {t('cards:contacts.btn.previous')}
                    </button>

                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
                        {t('cards:contacts.pagination', { current: pagination.currentPage, total: pagination.totalPages })}
                    </span>

                    <button
                        onClick={() => fetchCards(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="glass-button"
                        style={{
                            padding: '10px 20px',
                            opacity: pagination.currentPage === pagination.totalPages ? 0.5 : 1,
                            cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {t('cards:contacts.btn.next')}
                    </button>
                </div>
            )}

            <Modal title={selectedImageCard ? `${selectedImageCard.firstName} ${selectedImageCard.lastName}` : t('cards:contacts.modal.image')} isOpen={!!selectedImageCard} onClose={() => setSelectedImageCard(null)}>
                {selectedImageCard && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div><h4 style={{ color: 'var(--accent-primary)', textAlign: 'center', marginBottom: '10px' }}>{t('cards:contacts.modal.frontSide')}</h4><img src={`${API_URL}${selectedImageCard.frontImageUrl}`} alt={t('cards:contacts.modal.frontSide')} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }} /></div>
                        {selectedImageCard.backImageUrl && (<div><h4 style={{ color: 'var(--accent-warning)', textAlign: 'center', marginBottom: '10px' }}>{t('cards:contacts.modal.backSide')}</h4><img src={`${API_URL}${selectedImageCard.backImageUrl}`} alt={t('cards:contacts.modal.backSide')} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }} /></div>)}
                    </div>
                )}
            </Modal>

            <Modal title={t('cards:contacts.modal.history')} isOpen={!!historyCard} onClose={() => setHistoryCard(null)}>{historyCard && <HistoryTimeline cardId={historyCard.id} />}</Modal>

            <ConfirmModal isOpen={!!deleteConfirmCard} onClose={() => setDeleteConfirmCard(null)} onConfirm={handleDeleteConfirm} title={t('cards:contacts.modal.deleteTitle')} message={deleteConfirmCard ? t('cards:contacts.modal.deleteMessage', { firstName: deleteConfirmCard.firstName, lastName: deleteConfirmCard.lastName }) : ''} />

            {qrModalCard && (
                <QRCodeOverlay title={`${qrModalCard.firstName} ${qrModalCard.lastName}`} url={`${window.location.origin}/contact-profile/${qrModalCard.sharingToken}`} vCardData={generateVCardString(qrModalCard)} onClose={() => setQrModalCard(null)} onDownloadVCard={() => handleDownloadVCard(qrModalCard)} />
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

            {/* Bulk Tag Modal */}
            <Modal title={t('cards:contacts.modal.bulkTagTitle')} isOpen={isBulkTagModalOpen} onClose={() => setIsBulkTagModalOpen(false)}>
                <div style={{ padding: '10px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>{t('cards:contacts.modal.actionType')}</label>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input type="radio" name="bulkTagAction" value="add" checked={bulkTagAction === 'add'} onChange={(e) => setBulkTagAction(e.target.value)} />
                                {t('cards:contacts.bulkTag.addToExisting')}
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input type="radio" name="bulkTagAction" value="replace" checked={bulkTagAction === 'replace'} onChange={(e) => setBulkTagAction(e.target.value)} />
                                {t('cards:contacts.bulkTag.replaceAll')}
                            </label>
                        </div>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>{t('cards:contacts.modal.tags')}</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {availableTags.map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => setSelectedBulkTags(prev => prev.includes(tag.id) ? prev.filter(i => i !== tag.id) : [...prev, tag.id])}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        border: '1px solid var(--glass-border)',
                                        background: selectedBulkTags.includes(tag.id) ? (tag.color || 'var(--accent-primary)') : 'var(--glass-bg)',
                                        color: selectedBulkTags.includes(tag.id) ? 'var(--bg-card)' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button onClick={() => setIsBulkTagModalOpen(false)} className="glass-button" style={{ padding: '8px 20px' }}>{t('common:cancel')}</button>
                        <button 
                            onClick={handleBulkTags} 
                            disabled={selectedBulkTags.length === 0}
                            style={{ 
                                padding: '8px 25px', 
                                background: 'var(--accent-primary)', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '10px', 
                                fontWeight: 'bold',
                                opacity: selectedBulkTags.length === 0 ? 0.5 : 1,
                                cursor: selectedBulkTags.length === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {t('cards:contacts.btn.apply')}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal 
                isOpen={isBulkDeleteConfirmOpen} 
                onClose={() => setIsBulkDeleteConfirmOpen(false)} 
                onConfirm={handleBulkDelete}
                title={t('cards:contacts.modal.bulkDeleteTitle')}
                message={t('cards:contacts.modal.bulkDeleteMessage', { count: selectedIds.length })} 
            />

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="bulk-bar"
                    >
                        <div className="bulk-bar-count">
                            <div style={{ width: '28px', height: '28px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '12px', flexShrink: 0 }}>
                                {selectedIds.length}
                            </div>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{t('cards:contacts.selectedLabel')}</span>
                        </div>

                        <div className="bulk-bar-actions">
                            <button onClick={() => setIsBulkTagModalOpen(true)} className="glass-button-small" style={{ color: 'var(--accent-warning)' }}>
                                <FaStar size={12} /> {t('cards:contacts.btn.tag')}
                            </button>
                            <button onClick={() => handleBulkVisibility('public')} className="glass-button-small" style={{ color: 'var(--accent-success)' }}>
                                <FaGlobe size={12} />
                            </button>
                            <button onClick={() => handleBulkVisibility('private')} className="glass-button-small" style={{ color: 'var(--text-tertiary)' }}>
                                <FaIdCard size={12} />
                            </button>
                            <button onClick={() => handleBulkExport('excel')} className="glass-button-small" style={{ color: '#27ae60' }}>
                                <FaFileExcel size={12} />
                            </button>
                            <button onClick={() => handleBulkExport('pdf')} className="glass-button-small" style={{ color: '#e74c3c' }}>
                                <FaFilePdf size={12} />
                            </button>
                            <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="glass-button-small" style={{ background: 'var(--accent-error)', color: 'white', border: 'none' }}>
                                <FaTrash size={12} />
                            </button>
                            <button onClick={() => setSelectedIds([])} className="glass-button-small" style={{ color: 'var(--text-tertiary)' }}>
                                ✕
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Contacts;
