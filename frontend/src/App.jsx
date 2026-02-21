import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AddCard from './components/AddCard';
import InteractionLog from './components/InteractionLog';
import ActivityLogs from './components/ActivityLogs';
import UserManagement from './components/UserManagement';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import NotificationBanner from './components/NotificationBanner';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import UserMenu from './components/UserMenu';
import api, { API_URL } from './api/axios';
import { downloadFile } from './utils/downloadHelper';
import { saveCardsToOffline, getOfflineCards, getPendingSync, clearSyncItem } from './utils/offlineStore';
import { generateVCardString } from './utils/vcardHelper';

import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import TrashBin from './components/TrashBin';
import HistoryTimeline from './components/HistoryTimeline';
import ImportCards from './components/ImportCards';
import Modal from './components/Modal';
import ConfirmModal from './components/ConfirmModal';
import SearchBar from './components/SearchBar';
import MyCard from './components/MyCard';
import ContactProfile from './components/ContactProfile';
import QRCodeOverlay from './components/QRCodeOverlay';
import { FaIdCard, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCity, FaGlobe, FaStickyNote, FaChevronDown, FaChevronUp, FaTrash, FaSignInAlt, FaClock, FaFileExcel, FaFilePdf, FaDownload, FaWifi, FaPlane, FaTimes, FaCalendarCheck, FaEdit, FaSave, FaCopy, FaQrcode } from 'react-icons/fa';

// Sayfa Yer Tutucuları
const Contacts = () => {
    const [cards, setCards] = useState([]);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [expandedNotesId, setExpandedNotesId] = useState(null);
    const [editingNoteId, setEditingNoteId] = useState(null); // Şebeke içi not düzenleme
    const [editingNoteText, setEditingNoteText] = useState('');

    // Arama ve Sıralama State'leri
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');

    // Modal ve Düzenleme State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null); // Düzenlenen kart
    const [historyCard, setHistoryCard] = useState(null); // Geçmiş görüntülenen kart
    const [selectedImageCard, setSelectedImageCard] = useState(null); // Resim görüntüleme
    const [qrModalCard, setQrModalCard] = useState(null); // QR Kod görüntüleme
    const [deleteConfirmCard, setDeleteConfirmCard] = useState(null); // Silme onayı için
    const { showNotification } = useNotification();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCachedData, setIsCachedData] = useState(false);

    const fetchCards = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/cards');
            if (Array.isArray(res.data)) {
                setCards(res.data);
                setIsCachedData(false);
                await saveCardsToOffline(res.data);
            } else {
                setCards([]);
                setError('API beklenen formatta veri dönmedi.');
            }
        } catch (err) {
            // Try to get from offline store if network fails
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
        fetchCards();
    }, []);

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
            const response = await api.delete(`/api/cards/${deleteConfirmCard.id}`);
            showNotification('Kartvizit silindi.', 'success');
            fetchCards();
        } catch (error) {
            showNotification('Silme işlemi başarısız: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handleEdit = (card) => {
        setEditingCard(card);
        setIsModalOpen(true);
    };

    const openNewCardModal = () => {
        setEditingCard(null); // Yeni kart için resetle
        setIsModalOpen(true);
    };

    // Filtreleme ve Sıralama Mantığı
    const filteredCards = cards.filter(card => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (card.firstName && card.firstName.toLowerCase().includes(searchLower)) ||
            (card.lastName && card.lastName.toLowerCase().includes(searchLower)) ||
            (card.company && card.company.toLowerCase().includes(searchLower)) ||
            (card.city && card.city.toLowerCase().includes(searchLower))
        );
    }).sort((a, b) => {
        switch (sortOption) {
            case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
            case 'nameAsc': return (a.firstName || '').localeCompare(b.firstName || '');
            case 'nameDesc': return (b.firstName || '').localeCompare(a.firstName || '');
            case 'companyAsc': return (a.company || '').localeCompare(b.company || '');
            default: return 0;
        }
    });

    const handleCardAddedOrUpdated = () => {
        fetchCards();
        setIsModalOpen(false);
        setEditingCard(null);
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

    const handleQuickNoteUpdate = async (cardId) => {
        try {
            await api.put(`/api/cards/${cardId}`, { notes: editingNoteText });
            showNotification('Not güncellendi.', 'success');
            setEditingNoteId(null);
            fetchCards(); // Listeyi yenile
        } catch (error) {
            showNotification('Not güncellenemedi: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: '#aaa', fontSize: '18px' }}>Yükleniyor...</div>;
    if (error) return (
        <div style={{ textAlign: 'center', padding: '50px', color: '#ff6b6b' }}>
            <h3>Bir Hata Oluştu</h3>
            <p>{error}</p>
            <button onClick={fetchCards} style={{ padding: '8px 16px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
                Tekrar Dene
            </button>
        </div>
    );

    return (
        <div className="fade-in">
            {/* Üst Başlık ve Ekle Butonu */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: 'white',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    letterSpacing: '-0.02em'
                }}>Kartvizitler</h2>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Export Buttons */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                            onClick={async () => {
                                try {
                                    showNotification('Excel dosyası hazırlanıyor...', 'info');

                                    const response = await api.get('/api/cards/export/excel', {
                                        params: { search: searchTerm },
                                        responseType: 'blob'
                                    });

                                    // Hata kontrolü
                                    if (response.headers['content-type'] && response.headers['content-type'].includes('application/json')) {
                                        const text = await response.data.text();
                                        const err = JSON.parse(text);
                                        throw new Error(err.error || 'Excel oluşturulamadı.');
                                    }

                                    downloadFile(response.data, 'kartvizitler.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                                    showNotification('Excel dosyası indirildi.', 'success');
                                } catch (error) {
                                    showNotification('İndirme başarısız: ' + (error.message || 'Bilinmeyen hata'), 'error');
                                }
                            }}
                            title="Excel Olarak İndir"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                                color: '#28a745',
                                border: '1px solid rgba(40, 167, 69, 0.3)',
                                padding: '12px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(40, 167, 69, 0.2)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
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

                                    // Hata kontrolü
                                    if (response.headers['content-type'] && response.headers['content-type'].includes('application/json')) {
                                        const text = await response.data.text();
                                        const err = JSON.parse(text);
                                        throw new Error(err.error || 'PDF oluşturulamadı.');
                                    }

                                    downloadFile(response.data, 'kartvizitler.pdf', 'application/pdf');
                                    showNotification('PDF dosyası indirildi.', 'success');
                                } catch (error) {
                                    showNotification('İndirme başarısız: ' + (error.message || 'Bilinmeyen hata'), 'error');
                                }
                            }}
                            title="PDF Olarak İndir"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                                color: '#dc3545',
                                border: '1px solid rgba(220, 53, 69, 0.3)',
                                padding: '12px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(220, 53, 69, 0.2)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <FaFilePdf size={20} />
                        </button>
                    </div>

                    <button
                        onClick={openNewCardModal}
                        style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                        }}
                    >
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>+</span> Yeni Kart Ekle
                    </button>
                </div>
            </div>

            {/* Arama ve Filtreleme */}
            <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortOption={sortOption}
                onSortChange={setSortOption}
            />

            {/* Kart Listesi */}
            <div style={{ marginTop: '30px', display: 'grid', gap: '20px' }}>
                {filteredCards.length > 0 ? (
                    filteredCards.map(card => (
                        <div key={card.id} style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            padding: '20px',
                            borderRadius: '16px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.3s ease',
                            position: 'relative'
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
                            }}>


                            {/* Kart İçerik Container (Flex) - Adjacent JSX Hatasını Önlemek İçin Tek Parent */}
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                {/* Kartvizit Görseli - Büyütülmüş */}
                                {card.frontImageUrl ? (
                                    <div
                                        onClick={() => setSelectedImageCard(card)}
                                        style={{
                                            width: '240px',
                                            height: '140px',
                                            backgroundColor: '#000',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            border: '1px solid #444',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        title="Büyütmek için tıklayın"
                                    >
                                        <img
                                            src={`${API_URL}${card.frontImageUrl}`}
                                            alt={card.firstName}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain'
                                            }}
                                        />
                                        {/* Version Watermark */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '8px',
                                            left: '8px',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                                            pointerEvents: 'none',
                                            zIndex: 2,
                                            letterSpacing: '0.5px'
                                        }}>
                                            v{card.version || 1}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '240px',
                                        height: '140px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#2a2a2a',
                                        color: '#444',
                                        borderRadius: '8px',
                                        border: '1px solid #333',
                                        position: 'relative'
                                    }}>
                                        <FaIdCard size={64} />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '8px',
                                            left: '8px',
                                            color: 'rgba(255, 255, 255, 0.3)',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            pointerEvents: 'none'
                                        }}>
                                            v{card.version || 1}
                                        </div>
                                    </div>
                                )}

                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <h3 style={{
                                        margin: '0 0 8px 0',
                                        fontSize: '1.4em',
                                        color: 'white',
                                        fontWeight: '600'
                                    }}>{card.firstName} {card.lastName}</h3>
                                    <p style={{
                                        margin: '0 0 15px 0',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        fontStyle: 'italic',
                                        fontSize: '1.05em',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        {card.logoUrl && (
                                            <img
                                                src={`${API_URL}${card.logoUrl}`}
                                                alt="Logo"
                                                style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px', background: 'white', padding: '2px' }}
                                            />
                                        )}
                                        {card.company} {card.title && `- ${card.title}`}
                                    </p>

                                    {/* Tags Display */}
                                    {card.tags && card.tags.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '15px' }}>
                                            {card.tags.map(tag => (
                                                <span key={tag.id} style={{
                                                    padding: '2px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    background: tag.color || '#3b82f6',
                                                    color: 'white',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}>
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '0.9em' }}>
                                        {card.reminderDate && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '6px 10px',
                                                background: 'rgba(251, 191, 36, 0.1)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(251, 191, 36, 0.2)',
                                                marginBottom: '5px'
                                            }}>
                                                <FaCalendarCheck color="#fbbf24" />
                                                <strong style={{ color: '#fbbf24' }}>Hatırlatıcı:</strong>
                                                <span style={{ color: '#fbbf24' }}>{new Date(card.reminderDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        )}
                                        {card.email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaEnvelope color="#ffc107" /> <strong style={{ color: '#bbb' }}>E-Posta:</strong> <span style={{ color: '#ddd' }}>{card.email}</span>
                                            </div>
                                        )}
                                        {card.phone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaPhone color="#28a745" /> <strong style={{ color: '#bbb' }}>Telefon:</strong> <span style={{ color: '#ddd' }}>{card.phone}</span>
                                            </div>
                                        )}
                                        {card.website && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaGlobe color="#17a2b8" /> <strong style={{ color: '#bbb' }}>Web:</strong> <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noreferrer" style={{ color: '#646cff' }}>{card.website}</a>
                                            </div>
                                        )}
                                        {(card.city || card.country) && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaCity color="#e83e8c" /> <strong style={{ color: '#bbb' }}>Konum:</strong> <span style={{ color: '#ddd' }}>{card.city}{card.city && card.country && ', '}{card.country}</span>
                                            </div>
                                        )}
                                        {card.address && (
                                            <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                                                <FaMapMarkerAlt color="#dc3545" style={{ marginTop: '3px' }} /> <strong style={{ color: '#bbb' }}>Adres:</strong> <span style={{ color: '#ddd' }}>{card.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Aksiyon Butonları - Action Center */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    minWidth: '160px',
                                    padding: '10px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                    {/* Grup 1: İletişim & Notlar (Primary) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <button
                                            onClick={() => toggleNotes(card.id)}
                                            style={{
                                                padding: '10px 14px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                                backdropFilter: 'blur(10px)',
                                                color: '#ffc107',
                                                border: '1px solid rgba(255, 193, 7, 0.2)',
                                                borderRadius: '10px',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                fontWeight: '600',
                                                fontSize: '0.9rem'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaStickyNote /> Notlar
                                            </span>
                                            {expandedNotesId === card.id ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                        </button>

                                        <button
                                            onClick={() => toggleDetails(card.id)}
                                            style={{
                                                padding: '10px 14px',
                                                cursor: 'pointer',
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                backdropFilter: 'blur(10px)',
                                                color: '#60a5fa',
                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                borderRadius: '10px',
                                                transition: 'all 0.3s ease',
                                                fontWeight: '600',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <FaClock /> {expandedCardId === card.id ? 'Görüşmeler' : 'Görüşmeler'}
                                        </button>
                                    </div>

                                    {/* Ayırıcı Çizgi */}
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }}></div>

                                    {/* Grup 2: Paylaşım & İndirme */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => setQrModalCard(card)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                cursor: 'pointer',
                                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                backdropFilter: 'blur(10px)',
                                                color: '#a78bfa',
                                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                                borderRadius: '10px',
                                                transition: 'all 0.3s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="QR / vCard"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.2)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <FaQrcode size={18} />
                                        </button>

                                        <button
                                            onClick={() => handleDownloadVCard(card)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                cursor: 'pointer',
                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                backdropFilter: 'blur(10px)',
                                                color: '#34d399',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                borderRadius: '10px',
                                                transition: 'all 0.3s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="vCard İndir"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <FaDownload size={18} />
                                        </button>

                                        <button
                                            onClick={() => setHistoryCard(card)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                cursor: 'pointer',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                backdropFilter: 'blur(10px)',
                                                color: 'white',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '10px',
                                                transition: 'all 0.3s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Geçmiş"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <FaClock size={16} />
                                        </button>
                                    </div>

                                    {/* Grup 3: Düzenleme & Silme */}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button
                                            onClick={() => handleEdit(card)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                e.currentTarget.style.color = 'white';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                                            }}
                                        >
                                            Düzenle
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(card)}
                                            style={{
                                                padding: '8px',
                                                width: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                color: '#f87171',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                            title="Sil"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                                                e.currentTarget.style.color = 'white';
                                                e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                                e.currentTarget.style.color = '#f87171';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* Notlar Dropdown - Premium Glassmorphism */}
                            {expandedNotesId === card.id && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '20px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    backdropFilter: 'blur(15px)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {/* Glassmorphic Background Accent */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '4px',
                                        height: '100%',
                                        background: 'linear-gradient(to bottom, #ffc107, #ff6b6b)',
                                        boxShadow: '0 0 10px rgba(255, 193, 7, 0.5)'
                                    }}></div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FaStickyNote color="#ffc107" size={18} />
                                            <strong style={{ color: 'white', fontSize: '1.1rem', letterSpacing: '0.03em' }}>Kart Notları</strong>
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {!editingNoteId ? (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(card.notes || '');
                                                            showNotification('Not panoya kopyalandı.', 'success');
                                                        }}
                                                        style={{
                                                            background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                                                        }}
                                                        title="Kopyala"
                                                    >
                                                        <FaCopy /> Kopyala
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingNoteId(card.id);
                                                            setEditingNoteText(card.notes || '');
                                                        }}
                                                        style={{
                                                            background: 'rgba(255, 193, 7, 0.1)',
                                                            color: '#ffc107',
                                                            border: '1px solid rgba(255, 193, 7, 0.3)',
                                                            padding: '5px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        <FaEdit /> Düzenle
                                                    </button>
                                                </>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <button
                                                        onClick={() => setEditingNoteId(null)}
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer'
                                                        }}
                                                    >
                                                        İptal
                                                    </button>
                                                    <button
                                                        onClick={() => handleQuickNoteUpdate(card.id)}
                                                        style={{
                                                            background: '#28a745', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                                                        }}
                                                    >
                                                        <FaSave /> Kaydet
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {editingNoteId === card.id ? (
                                        <textarea
                                            value={editingNoteText}
                                            onChange={(e) => setEditingNoteText(e.target.value)}
                                            style={{
                                                width: '100%',
                                                minHeight: '120px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                padding: '12px',
                                                fontSize: '0.95rem',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                                outline: 'none'
                                            }}
                                            autoFocus
                                        />
                                    ) : (
                                        <p style={{
                                            margin: 0,
                                            whiteSpace: 'pre-wrap',
                                            color: 'rgba(255, 255, 255, 0.85)',
                                            fontSize: '1rem',
                                            lineHeight: '1.6',
                                            padding: '5px'
                                        }}>
                                            {card.notes || <span style={{ color: '#666', fontStyle: 'italic' }}>Not eklenmemiş. "Düzenle" diyerek hemen ekleyebilirsiniz.</span>}
                                        </p>
                                    )}

                                    {/* Background Watermark Icon */}
                                    <FaStickyNote style={{
                                        position: 'absolute',
                                        right: '-10px',
                                        bottom: '-10px',
                                        fontSize: '80px',
                                        color: 'rgba(255, 255, 255, 0.03)',
                                        transform: 'rotate(-15deg)',
                                        pointerEvents: 'none'
                                    }} />
                                </div>
                            )}

                            {/* Genişletilmiş Alan: CRM Logları */}
                            {expandedCardId === card.id && (
                                <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                                    <InteractionLog cardId={card.id} />
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Eşleşen kartvizit bulunamadı.</p>
                )}
            </div>

            {/* Kart Ekleme/Düzenleme Modalı */}
            <Modal
                title={editingCard ? "Kartviziti Düzenle" : "Yeni Kartvizit Ekle"}
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingCard(null); }}
            >
                <AddCard onCardAdded={handleCardAddedOrUpdated} activeCard={editingCard} />
            </Modal>

            {/* QR Modal */}
            {qrModalCard && (
                <QRCodeOverlay
                    title={`${qrModalCard.firstName} ${qrModalCard.lastName}`}
                    url={`${window.location.origin}/contact-profile/${qrModalCard.id}`}
                    vCardData={generateVCardString(qrModalCard)}
                    onClose={() => setQrModalCard(null)}
                    onDownloadVCard={() => handleDownloadVCard(qrModalCard)}
                />
            )}

            {/* Kart Resim Görüntüleme Modalı */}
            <Modal
                title="Kartvizit Görüntüleri"
                isOpen={!!selectedImageCard}
                onClose={() => setSelectedImageCard(null)}
            >
                {selectedImageCard && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                        <div>
                            <h4 style={{ color: '#ffc107', textAlign: 'center', marginBottom: '10px' }}>Ön Yüz</h4>
                            {selectedImageCard.frontImageUrl ? (
                                <img
                                    src={`${API_URL}${selectedImageCard.frontImageUrl}`}
                                    alt="Ön Yüz"
                                    style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', border: '1px solid #444' }}
                                />
                            ) : (
                                <div style={{ padding: '20px', color: '#888', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>Görsel Yok</div>
                            )}
                        </div>

                        {selectedImageCard.backImageUrl && (
                            <div>
                                <h4 style={{ color: '#ffc107', textAlign: 'center', marginBottom: '10px' }}>Arka Yüz</h4>
                                <img
                                    src={`${API_URL}${selectedImageCard.backImageUrl}`}
                                    alt="Arka Yüz"
                                    style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', border: '1px solid #444' }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Geçmiş / History Modalı */}
            <Modal
                title="Kartvizit Geçmişi"
                isOpen={!!historyCard}
                onClose={() => setHistoryCard(null)}
            >
                {historyCard && <HistoryTimeline cardId={historyCard.id} />}
            </Modal>

            {/* Silme Onay Modalı */}
            <ConfirmModal
                isOpen={!!deleteConfirmCard}
                onClose={() => setDeleteConfirmCard(null)}
                onConfirm={handleDeleteConfirm}
                title="Kartviziti Sil"
                message={deleteConfirmCard ? `${deleteConfirmCard.firstName} ${deleteConfirmCard.lastName} adlı kartviziti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.` : ''}
            />
        </div>
    );
};

// AppContent bileşeni - useAuth hook'unu kullanmak için AuthProvider içinde olması gerek
const AppContent = () => {
    const { isAuthenticated, user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);

    const syncQueuedCards = async () => {
        const pending = await getPendingSync();
        if (pending.length === 0) return;

        showNotification(`${pending.length} bekleyen kayıt senkronize ediliyor...`, 'info');

        for (const item of pending) {
            if (item.type === 'CREATE_CARD') {
                const { data } = item;
                const formDataToSync = new FormData();

                // Reconstruction of FormData
                Object.keys(data).forEach(key => {
                    if (!['frontBlob', 'backBlob', 'logoBlob'].includes(key)) {
                        formDataToSync.append(key, data[key]);
                    }
                });

                if (data.frontBlob) formDataToSync.append('frontImage', data.frontBlob, 'front.jpg');
                if (data.backBlob) formDataToSync.append('backImage', data.backBlob, 'back.jpg');
                if (data.logoBlob) formDataToSync.append('logoImage', data.logoBlob, 'logo.jpg');

                // Additional CRM Fields
                if (data.tags) formDataToSync.append('tags', JSON.stringify(data.tags));
                if (data.reminderDate) formDataToSync.append('reminderDate', data.reminderDate);

                try {
                    await api.post('/api/cards', formDataToSync, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    await clearSyncItem(item.id);
                } catch (err) {
                    console.error('Sync Error for item', item.id, err);
                }
            }
        }
        showNotification('Senkronizasyon tamamlandı.', 'success');
    };

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncQueuedCards();
        };
        const handleOffline = () => setIsOnline(false);
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Initial check if we are online and have pending items
        if (navigator.onLine) {
            syncQueuedCards();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallBanner(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            paddingTop: !isOnline || showInstallBanner ? '50px' : '0'
        }}>
            {/* Offline Banner */}
            {!isOnline && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: '#ef4444',
                    color: 'white',
                    padding: '10px',
                    textAlign: 'center',
                    zIndex: 2000,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                }}>
                    <FaPlane /> Çevrimdışı Mod - Bazı özellikler kısıtlanmış olabilir.
                </div>
            )}

            {/* PWA Install Banner */}
            {showInstallBanner && isOnline && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(59, 130, 246, 0.95)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    padding: '12px 20px',
                    zIndex: 1999,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaWifi /> <span>Uygulamayı ana ekrana ekleyerek daha hızlı erişebilirsiniz.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleInstallClick}
                            style={{
                                background: 'white',
                                color: '#3b82f6',
                                border: 'none',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Yükle
                        </button>
                        <button
                            onClick={() => setShowInstallBanner(false)}
                            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}
            {/* Premium Glassmorphism Navbar */}
            <nav style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link
                        to="/"
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: 'white',
                            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            letterSpacing: '-0.02em'
                        }}
                    >
                        CRM
                    </Link>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <Link
                            to="/"
                            style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: '500'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                            }}
                        >
                            Dashboard
                        </Link>
                        <Link
                            to="/contacts"
                            style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: '500'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                            }}
                        >
                            Kartvizitler
                        </Link>
                        <Link
                            to="/my-card"
                            style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: '500'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                            }}
                        >
                            Kartım
                        </Link>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Link
                        to="/trash"
                        style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            fontSize: '1.2rem',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = 'rgba(255, 255, 255, 0.7)';
                        }}
                        title="Çöp Kutusu"
                    >
                        <FaTrash />
                    </Link>
                    {isAuthenticated ? <UserMenu /> : (
                        <Link
                            to="/login"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: '#2a2a2a',
                                color: 'white',
                                border: '1px solid #444',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease',
                                textDecoration: 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#333'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#2a2a2a'}
                        >
                            <FaSignInAlt size={16} />
                            <span>Oturum Aç</span>
                        </Link>
                    )}
                </div>
            </nav>

            {/* Main Content Area */}
            <main style={{
                padding: '2rem',
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/contacts"
                        element={
                            <ProtectedRoute>
                                <Contacts />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/logs"
                        element={
                            <ProtectedRoute>
                                <ActivityLogs />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/trash"
                        element={
                            <ProtectedRoute>
                                <TrashBin />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute>
                                <UserManagement />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/my-card"
                        element={
                            <ProtectedRoute>
                                <MyCard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/import"
                        element={
                            <ProtectedRoute>
                                <ImportCards />
                            </ProtectedRoute>
                        }
                    />
                    {/* Public Route for Business Card Sharing */}
                    <Route path="/contact-profile/:id" element={<ContactProfile />} />
                </Routes>
            </main>
            <NotificationBanner />
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <NotificationProvider>
                <Router>
                    <AppContent />
                </Router>
            </NotificationProvider>
        </AuthProvider>
    );
}

export default App;
