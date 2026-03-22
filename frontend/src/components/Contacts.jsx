import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { API_URL } from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { saveCardsToOffline, getOfflineCards } from '../utils/offlineStore';
import { downloadFile } from '../utils/downloadHelper';
import { FaIdCard, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCity, FaGlobe, FaStickyNote, FaChevronDown, FaChevronUp, FaTrash, FaClock, FaFileExcel, FaFilePdf, FaDownload, FaCalendarCheck, FaEdit, FaSave, FaCopy, FaQrcode, FaStar, FaWhatsapp } from 'react-icons/fa';
import SearchBar from './SearchBar';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import QRCodeOverlay from './QRCodeOverlay';
import HistoryTimeline from './HistoryTimeline';
import AddCard from './AddCard';
import InteractionLog from './InteractionLog';
import { generateVCardString } from '../utils/vcardHelper';

import { motion, AnimatePresence } from 'framer-motion';

const Contacts = () => {
    const [cards, setCards] = useState([]);
    const [expandedCardId, setExpandedCardId] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    const [advancedFilters, setAdvancedFilters] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return {
            tagId: params.get('tagId') || '',
            city: '',
            hasReminder: false,
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
                setError('API beklenen formatta veri dönmedi.');
            }
        } catch (err) {
            const cachedCards = await getOfflineCards();
            if (cachedCards.length > 0) {
                setCards(cachedCards);
                setIsCachedData(true);
                showNotification('Çevrimdışı mod: Kayıtlı veriler gösteriliyor.', 'info');
            } else {
                setError('Veriler yüklenirken bir hata oluştu ve yerel kayıt bulunamadı.');
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

    const toggleNotes = (id) => {
        setExpandedNotesId(expandedNotesId === id ? null : id);
    };

    const handleDeleteClick = (card) => {
        setDeleteConfirmCard(card);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmCard) return;

        try {
            await api.delete(`/api/cards/${deleteConfirmCard.id}`);
            showNotification('Kartvizit silindi.', 'success');
            fetchCards(pagination.currentPage);
            setDeleteConfirmCard(null);
        } catch (error) {
            showNotification('Silme işlemi başarısız: ' + (error.response?.data?.error || error.message), 'error');
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

    const filteredCards = cards; // Filtered by backend now

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
            showNotification(`${selectedIds.length} kart silindi.`, 'success');
            setSelectedIds([]);
            setIsBulkDeleteConfirmOpen(false);
            fetchCards(pagination.currentPage);
        } catch (error) {
            showNotification('Toplu silme başarısız.', 'error');
        }
    };

    const handleBulkVisibility = async (visibility) => {
        try {
            await api.post('/api/cards/bulk-visibility', { ids: selectedIds, visibility });
            showNotification(`Görünürlük ${visibility === 'public' ? 'Herkese Açık' : 'Özel'} olarak güncellendi.`, 'success');
            setSelectedIds([]);
            fetchCards(pagination.currentPage);
        } catch (error) {
            showNotification('Görünürlük güncellenemedi.', 'error');
        }
    };

    const handleBulkTags = async () => {
        try {
            await api.post('/api/cards/bulk-tags', { 
                ids: selectedIds, 
                tagIds: selectedBulkTags,
                mode: bulkTagAction
            });
            showNotification('Etiketler başarıyla güncellendi.', 'success');
            setSelectedIds([]);
            setIsBulkTagModalOpen(false);
            setSelectedBulkTags([]);
            fetchCards(pagination.currentPage);
        } catch (error) {
            showNotification('Etiketleme işlemi başarısız.', 'error');
        }
    };

    const handleBulkExport = async (type) => {
        try {
            const endpoint = type === 'excel' ? '/api/cards/export/excel' : '/api/cards/export/pdf';
            const fileName = `secilen_kartvizitler.${type === 'excel' ? 'xlsx' : 'pdf'}`;
            const mimeType = type === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
            
            showNotification(`${type.toUpperCase()} dosyası hazırlanıyor...`, 'info');
            const response = await api.get(endpoint, {
                params: { ids: selectedIds.join(',') },
                responseType: 'blob'
            });
            downloadFile(response.data, fileName, mimeType);
            showNotification('Dosya indirildi.', 'success');
        } catch (error) {
            showNotification('İndirme başarısız.', 'error');
        }
    };

    const handleDownloadVCard = async (card) => {
        try {
            showNotification('vCard dosyası hazırlanıyor...', 'info');
            const response = await api.get(`/api/cards/${card.id}/vcf`, {
                responseType: 'blob'
            });
            downloadFile(response.data, `${card.firstName}_${card.lastName}.vcf`, 'text/vcard');
            showNotification('vCard indirildi.', 'success');
        } catch (error) {
            showNotification('İndirme başarısız.', 'error');
        }
    };

    const handleWhatsAppFollowUp = (card) => {
        const message = `Merhaba ${card.firstName + (card.lastName ? ' ' + card.lastName : '')}, az önce tanıştığımıza çok memnun oldum. İletişim bilgilerimi iletiyorum. Görüşmek dileğiyle.`;
        const phone = card.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone.startsWith('0') ? '9' + phone : phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleEmailFollowUp = (card) => {
        const subject = "Tanıştığımıza Memnun Oldum";
        const body = `Sayın ${card.firstName} ${card.lastName},\n\nAz önce tanıştığımıza çok memnun oldum. Kartvizitinizi CRM sistemime kaydettim.\n\nEn kısa sürede tekrar görüşmek dileğiyle.\n\nİyi çalışmalar.`;
        window.location.href = `mailto:${card.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'Hot': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: '🔥', label: 'Sıcak' };
            case 'Warm': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: '⛅', label: 'Ilık' };
            case 'Cold': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: '❄️', label: 'Soğuk' };
            case 'Following-up': return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', icon: '🔄', label: 'Takipte' };
            case 'Converted': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: '✅', label: 'Dönüştü' };
            default: return { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', icon: '👤', label: 'Bilinmiyor' };
        }
    };

    if (loading && cards.length === 0) {
        return (
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <div className="skeleton skeleton-title" style={{ width: '300px' }}></div>
                    <div className="skeleton skeleton-btn" style={{ width: '150px' }}></div>
                </div>
                <div className="skeleton" style={{ height: '60px', borderRadius: '12px', marginBottom: '30px' }}></div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="glass-container" style={{ padding: '20px', borderRadius: '16px', marginBottom: '20px', display: 'flex', gap: '20px' }}>
                        <div className="skeleton" style={{ width: '240px', height: '140px', borderRadius: '8px' }}></div>
                        <div style={{ flex: 1 }}>
                            <div className="skeleton skeleton-text" style={{ width: '40%', height: '24px', marginBottom: '15px' }}></div>
                            <div className="skeleton skeleton-text" style={{ width: '60%', height: '18px', marginBottom: '20px' }}></div>
                            <div style={{ display: 'grid', gap: '10px' }}>
                                <div className="skeleton skeleton-text" style={{ width: '30%' }}></div>
                                <div className="skeleton skeleton-text" style={{ width: '35%' }}></div>
                                <div className="skeleton skeleton-text" style={{ width: '25%' }}></div>
                            </div>
                        </div>
                        <div className="skeleton" style={{ width: '160px', height: '110px', borderRadius: '12px' }}></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--accent-error)' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Bir Hata Oluştu</h3>
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
                    Tekrar Dene
                </motion.button>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em'
                }}>Kartvizitler</h2>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                            onClick={async () => {
                                try {
                                    showNotification('Excel dosyası hazırlanıyor...', 'info');
                                    const response = await api.get('/api/cards/export/excel', {
                                        params: { search: searchTerm },
                                        responseType: 'blob'
                                    });
                                    downloadFile(response.data, 'kartvizitler.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                                    showNotification('Excel dosyası indirildi.', 'success');
                                } catch (error) {
                                    showNotification('İndirme başarısız.', 'error');
                                }
                            }}
                            title="Excel Olarak İndir"
                            className="glass-button"
                            style={{ color: 'var(--accent-success)' }}
                        >
                            <FaFileExcel size={20} />
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    showNotification('PDF dosyası hazırlanıyor...', 'info');
                                    const response = await api.get('/api/cards/export/pdf', {
                                        params: { search: searchTerm },
                                        responseType: 'blob'
                                    });
                                    downloadFile(response.data, 'kartvizitler.pdf', 'application/pdf');
                                    showNotification('PDF dosyası indirildi.', 'success');
                                } catch (error) {
                                    showNotification('İndirme başarısız.', 'error');
                                }
                            }}
                            title="PDF Olarak İndir"
                            className="glass-button"
                            style={{ color: 'var(--accent-error)' }}
                        >
                            <FaFilePdf size={20} />
                        </button>
                    </div>

                    <motion.button
                        whileHover={{ 
                            scale: 1.02, 
                            boxShadow: '0 8px 32px rgba(var(--accent-primary-rgb), 0.3)',
                            background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))'
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={openNewCardModal}
                        style={{
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            letterSpacing: '-0.01em'
                        }}
                    >
                        <span style={{ fontSize: '22px', fontWeight: '800', lineHeight: 1 }}>+</span> 
                        Yeni Kart Ekle
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
                    {selectedIds.length > 0 ? `${selectedIds.length} seçili` : 'Tümünü Seç'}
                </span>
            </div>

            <div style={{ marginTop: '30px', display: 'grid', gap: '20px' }}>
                {filteredCards.length > 0 ? (
                    filteredCards.map(card => (
                        <div key={card.id} className="glass-container" style={{ 
                            padding: '20px', 
                            borderRadius: '16px', 
                            position: 'relative',
                            border: selectedIds.includes(card.id) ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                            backgroundColor: selectedIds.includes(card.id) ? 'var(--accent-primary-transparent)' : 'var(--glass-bg)'
                        }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                {/* Row Checkbox */}
                                <div style={{ display: 'flex', alignItems: 'center', height: '120px' }}>
                                    <input 
                                        type="checkbox"
                                        checked={selectedIds.includes(card.id)}
                                        onChange={() => handleSelectCard(card.id)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                    />
                                </div>

                                {card.frontImageUrl ? (
                                    <div
                                        onClick={() => setSelectedImageCard(card)}
                                        style={{ width: '200px', height: '120px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                                    >
                                        <img src={`${API_URL}${card.frontImageUrl}`} alt={card.firstName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 'bold', opacity: 0.8 }}>v{card.version || 1}</div>
                                    </div>
                                ) : (
                                    <div style={{ width: '200px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-input)', color: 'var(--text-tertiary)', borderRadius: '8px', border: '1px solid var(--glass-border)', position: 'relative' }}>
                                        <FaIdCard size={64} style={{ opacity: 0.5 }} />
                                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 'bold', opacity: 0.5 }}>v{card.version || 1}</div>
                                    </div>
                                )}

                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2em', color: 'var(--text-primary)', fontWeight: '600' }}>{card.firstName} {card.lastName}</h3>
                                    <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {card.logoUrl && <img src={`${API_URL}${card.logoUrl}`} alt="Logo" style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '4px', background: 'var(--bg-card)', padding: '2px', border: '1px solid var(--glass-border)' }} />}
                                        {card.company} {card.title && `- ${card.title}`}
                                    </p>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
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
                                                gap: '5px',
                                                border: `1px solid ${getStatusStyle(card.leadStatus).color}33`
                                            }}>
                                                <span>{getStatusStyle(card.leadStatus).icon}</span>
                                                {getStatusStyle(card.leadStatus).label}
                                            </div>
                                        )}
                                        {card.priority > 0 && (
                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <FaStar key={star} size={12} color={card.priority >= star ? 'var(--accent-warning)' : 'rgba(255,255,255,0.1)'} />
                                                ))}
                                            </div>
                                        )}
                                        {card.tags && card.tags.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {card.tags.map(tag => {
                                                    // Determine if text should be light or dark based on background color
                                                    const isLight = (color) => {
                                                        if (!color || color.length < 7) return true;
                                                        const hex = color.replace('#', '');
                                                        const r = parseInt(hex.substring(0, 2), 16);
                                                        const g = parseInt(hex.substring(2, 4), 16);
                                                        const b = parseInt(hex.substring(4, 6), 16);
                                                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                                        return brightness > 155;
                                                    };
                                                    
                                                    return (
                                                        <span 
                                                            key={tag.id} 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/contacts?tagId=${tag.id}`);
                                                            }}
                                                            style={{ 
                                                                padding: '2px 10px', 
                                                                borderRadius: '12px', 
                                                                fontSize: '0.7rem', 
                                                                fontWeight: '700', 
                                                                background: tag.color || 'var(--accent-primary)', 
                                                                color: isLight(tag.color) ? '#000' : '#fff',
                                                                cursor: 'pointer',
                                                                transition: 'transform 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        >
                                                            {tag.name}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '0.9em' }}>
                                        {card.reminderDate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--glass-bg)', borderRadius: '8px', border: '1px solid var(--accent-warning)', marginBottom: '5px' }}>
                                                <FaCalendarCheck color="var(--accent-warning)" />
                                                <strong style={{ color: 'var(--text-primary)' }}>Hatırlatıcı:</strong>
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    {(() => {
                                                        const d = new Date(card.reminderDate);
                                                        return isNaN(d.getTime()) ? 'Tarih Belirtilmedi' : d.toLocaleDateString('tr-TR');
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                        {card.lastInteractionDate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaClock color="var(--accent-primary)" size={12} /> 
                                                <strong style={{ color: 'var(--text-tertiary)' }}>Son Etkileşim:</strong> 
                                                <span style={{ color: 'var(--text-secondary)' }}>{new Date(card.lastInteractionDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        )}
                                        {card.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaEnvelope color="var(--accent-warning)" /> <strong style={{ color: 'var(--text-tertiary)' }}>E-Posta:</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.email}</span></div>}
                                        {card.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaPhone color="var(--accent-success)" /> <strong style={{ color: 'var(--text-tertiary)' }}>Telefon:</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.phone}</span></div>}
                                        {card.website && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaGlobe color="var(--accent-primary)" /> <strong style={{ color: 'var(--text-tertiary)' }}>Web:</strong> <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)' }}>{card.website}</a></div>}
                                        {(card.city || card.country) && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaCity color="var(--accent-error)" /> <strong style={{ color: 'var(--text-tertiary)' }}>Konum:</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.city}{card.city && card.country && ', '}{card.country}</span></div>}
                                        {card.address && <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}><FaMapMarkerAlt color="var(--accent-error)" style={{ marginTop: '3px' }} /><strong style={{ color: 'var(--text-tertiary)' }}>Adres:</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.address}</span></div>}
                                        {card.source && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaIdCard color="var(--accent-primary)" size={12} /> <strong style={{ color: 'var(--text-tertiary)' }}>Kaynak:</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.source}</span></div>}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px', padding: '10px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <button onClick={() => toggleDetails(card.id)} className="glass-button-block" style={{ color: 'var(--accent-warning)', padding: '10px 12px', fontSize: '0.9rem', border: '1px solid var(--accent-warning)', background: expandedCardId === card.id ? 'var(--glass-bg-hover)' : 'transparent' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaStickyNote /> Aktivite ve Notlar</span>
                                        {expandedCardId === card.id ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                    </button>
                                    
                                    {/* Hızlı Takip Butonları */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        {card.phone && (
                                            <button 
                                                onClick={() => handleWhatsAppFollowUp(card)} 
                                                className="glass-button-square" 
                                                title="WhatsApp Takip" 
                                                style={{ color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.3)' }}
                                            >
                                                <FaWhatsapp size={20} />
                                            </button>
                                        )}
                                        {card.email && (
                                            <button 
                                                onClick={() => handleEmailFollowUp(card)} 
                                                className="glass-button-square" 
                                                title="E-Posta Takip" 
                                                style={{ color: 'var(--accent-warning)', borderColor: 'rgba(255, 193, 7, 0.3)' }}
                                            >
                                                <FaEnvelope size={18} />
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }}></div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setQrModalCard(card)} className="glass-button-square" title="QR / vCard"><FaQrcode size={18} /></button>
                                        <button onClick={() => handleDownloadVCard(card)} className="glass-button-square" title="vCard İndir"><FaDownload size={18} /></button>
                                        <button onClick={() => setHistoryCard(card)} className="glass-button-square" title="Geçmiş"><FaClock size={16} /></button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button onClick={() => handleEdit(card)} className="glass-button-small" style={{ flex: 1 }}>Düzenle</button>
                                        <button onClick={() => handleDeleteClick(card)} className="glass-button-small" style={{ color: 'var(--accent-error)', width: '40px' }}><FaTrash size={14} /></button>
                                    </div>
                                </div>
                            </div>

                            {expandedCardId === card.id && (
                                <div style={{ marginTop: '15px', padding: '20px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <InteractionLog cardId={card.id} />
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '50px', textAlign: 'center', opacity: 0.3 }}><FaIdCard size={64} style={{ marginBottom: '20px' }} /><h3>Kayıt bulunamadı</h3></div>
                )}
            </div>

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
                        Önceki
                    </button>
                    
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
                        Sayfa {pagination.currentPage} / {pagination.totalPages}
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
                        Sonraki
                    </button>
                </div>
            )}

            <Modal title={selectedImageCard ? `${selectedImageCard.firstName} ${selectedImageCard.lastName}` : 'Görsel'} isOpen={!!selectedImageCard} onClose={() => setSelectedImageCard(null)}>
                {selectedImageCard && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div><h4 style={{ color: 'var(--accent-primary)', textAlign: 'center', marginBottom: '10px' }}>Ön Yüz</h4><img src={`${API_URL}${selectedImageCard.frontImageUrl}`} alt="Ön Yüz" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }} /></div>
                        {selectedImageCard.backImageUrl && (<div><h4 style={{ color: 'var(--accent-warning)', textAlign: 'center', marginBottom: '10px' }}>Arka Yüz</h4><img src={`${API_URL}${selectedImageCard.backImageUrl}`} alt="Arka Yüz" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }} /></div>)}
                    </div>
                )}
            </Modal>

            <Modal title="Kartvizit Geçmişi" isOpen={!!historyCard} onClose={() => setHistoryCard(null)}>{historyCard && <HistoryTimeline cardId={historyCard.id} />}</Modal>

            <ConfirmModal isOpen={!!deleteConfirmCard} onClose={() => setDeleteConfirmCard(null)} onConfirm={handleDeleteConfirm} title="Kartviziti Sil" message={deleteConfirmCard ? `${deleteConfirmCard.firstName} ${deleteConfirmCard.lastName} adlı kartvizitini silmek istediğinizden emin misiniz?` : ''} />

            {qrModalCard && (
                <QRCodeOverlay title={`${qrModalCard.firstName} ${qrModalCard.lastName}`} url={`${window.location.origin}/contact-profile/${qrModalCard.sharingToken}`} vCardData={generateVCardString(qrModalCard)} onClose={() => setQrModalCard(null)} onDownloadVCard={() => handleDownloadVCard(qrModalCard)} />
            )}

            <Modal 
                title={editingCard ? 'Kartviziti Düzenle' : 'Yeni Kartvizit Ekle'} 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingCard(null);
                }}
            >
                <AddCard onCardAdded={handleCardAddedOrUpdated} activeCard={editingCard} />
            </Modal>

            {/* Bulk Tag Modal */}
            <Modal title="Toplu Etiket Geliştirme" isOpen={isBulkTagModalOpen} onClose={() => setIsBulkTagModalOpen(false)}>
                <div style={{ padding: '10px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>İşlem Tipi</label>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input type="radio" name="bulkTagAction" value="add" checked={bulkTagAction === 'add'} onChange={(e) => setBulkTagAction(e.target.value)} />
                                Mevcutlara Ekle
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input type="radio" name="bulkTagAction" value="replace" checked={bulkTagAction === 'replace'} onChange={(e) => setBulkTagAction(e.target.value)} />
                                Tümünü Değiştir
                            </label>
                        </div>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Etiketler</label>
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
                        <button onClick={() => setIsBulkTagModalOpen(false)} className="glass-button" style={{ padding: '8px 20px' }}>İptal</button>
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
                            Uygula
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal 
                isOpen={isBulkDeleteConfirmOpen} 
                onClose={() => setIsBulkDeleteConfirmOpen(false)} 
                onConfirm={handleBulkDelete} 
                title="Toplu Silme" 
                message={`${selectedIds.length} adet kartviziti silmek istediğinizden emin misiniz?`} 
            />

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        style={{
                            position: 'fixed',
                            bottom: '30px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '20px',
                            padding: '12px 25px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px var(--accent-primary-transparent)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            backdropFilter: 'blur(20px)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '15px', borderRight: '1px solid var(--glass-border)' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                                {selectedIds.length}
                            </div>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Seçili</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setIsBulkTagModalOpen(true)} className="glass-button" style={{ color: 'var(--accent-warning)', gap: '8px' }}>
                                <FaStar /> Etiketle
                            </button>
                            
                            <div style={{ position: 'relative', display: 'flex', gap: '5px' }}>
                                <button onClick={() => handleBulkVisibility('public')} className="glass-button" style={{ color: 'var(--accent-success)', gap: '8px' }}>
                                    <FaGlobe /> Herkese Açık
                                </button>
                                <button onClick={() => handleBulkVisibility('private')} className="glass-button" style={{ color: 'var(--text-tertiary)', gap: '8px' }}>
                                    <FaIdCard /> Özel Yap
                                </button>
                            </div>

                            <div style={{ height: '30px', width: '1px', background: 'var(--glass-border)', margin: '0 5px' }}></div>

                            <button onClick={() => handleBulkExport('excel')} className="glass-button" style={{ color: '#27ae60' }}>
                                <FaFileExcel /> Excel
                            </button>
                            <button onClick={() => handleBulkExport('pdf')} className="glass-button" style={{ color: '#e74c3c' }}>
                                <FaFilePdf /> PDF
                            </button>

                            <button 
                                onClick={() => setIsBulkDeleteConfirmOpen(true)} 
                                style={{ 
                                    background: 'var(--accent-error)', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '8px 16px', 
                                    borderRadius: '10px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                }}
                            >
                                <FaTrash /> Sil
                            </button>
                            
                            <button 
                                onClick={() => setSelectedIds([])} 
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', padding: '5px', cursor: 'pointer' }}
                            >
                                <FaDownload style={{ transform: 'rotate(180deg)' }} /> Vazgeç
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Contacts;
