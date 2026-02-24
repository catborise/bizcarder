import React, { useState, useEffect } from 'react';
import api, { API_URL } from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { saveCardsToOffline, getOfflineCards } from '../utils/offlineStore';
import { downloadFile } from '../utils/downloadHelper';
import { FaIdCard, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCity, FaGlobe, FaStickyNote, FaChevronDown, FaChevronUp, FaTrash, FaClock, FaFileExcel, FaFilePdf, FaDownload, FaCalendarCheck, FaEdit, FaSave, FaCopy, FaQrcode } from 'react-icons/fa';
import SearchBar from './SearchBar';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import QRCodeOverlay from './QRCodeOverlay';
import HistoryTimeline from './HistoryTimeline';
import AddCard from './AddCard';
import InteractionLog from './InteractionLog';
import { generateVCardString } from '../utils/vcardHelper';

const Contacts = () => {
    const [cards, setCards] = useState([]);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [expandedNotesId, setExpandedNotesId] = useState(null);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    const [advancedFilters, setAdvancedFilters] = useState({
        tagId: '',
        city: '',
        hasReminder: false
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [historyCard, setHistoryCard] = useState(null);
    const [selectedImageCard, setSelectedImageCard] = useState(null);
    const [qrModalCard, setQrModalCard] = useState(null);
    const [deleteConfirmCard, setDeleteConfirmCard] = useState(null);
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
            await api.delete(`/api/cards/${deleteConfirmCard.id}`);
            showNotification('Kartvizit silindi.', 'success');
            fetchCards();
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

    const allTags = Array.from(new Set(cards.flatMap(c => c.tags || []).map(t => JSON.stringify(t)))).map(t => JSON.parse(t));
    const allCities = Array.from(new Set(cards.map(c => c.city).filter(Boolean).map(c => c.trim().toUpperCase()))).sort();

    const filteredCards = cards.filter(card => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' || (
            (card.firstName && card.firstName.toLowerCase().includes(searchLower)) ||
            (card.lastName && card.lastName.toLowerCase().includes(searchLower)) ||
            (card.company && card.company.toLowerCase().includes(searchLower)) ||
            (card.email && card.email.toLowerCase().includes(searchLower)) ||
            (card.title && card.title.toLowerCase().includes(searchLower)) ||
            (card.city && card.city.toLowerCase().includes(searchLower))
        );

        const matchesTag = advancedFilters.tagId === '' || (card.tags && card.tags.some(t => String(t.id) === String(advancedFilters.tagId)));
        const matchesCity = advancedFilters.city === '' || (card.city && card.city.trim().toUpperCase() === advancedFilters.city);
        const matchesReminder = !advancedFilters.hasReminder || (card.reminderDate !== null);

        return matchesSearch && matchesTag && matchesCity && matchesReminder;
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
            fetchCards();
        } catch (error) {
            showNotification('Not güncellenemedi: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)', fontSize: '18px' }}>Yükleniyor...</div>;
    if (error) return (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--accent-error)' }}>
            <h3>Bir Hata Oluştu</h3>
            <p>{error}</p>
            <button onClick={fetchCards} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
                Tekrar Dene
            </button>
        </div>
    );

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    textShadow: '0 2px 8px var(--glass-shadow)',
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

                    <button
                        onClick={openNewCardModal}
                        style={{
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: '1px solid var(--glass-border)',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 16px var(--glass-shadow)'
                        }}
                    >
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>+</span> Yeni Kart Ekle
                    </button>
                </div>
            </div>

            <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortOption={sortOption}
                onSortChange={setSortOption}
                advancedFilters={advancedFilters}
                onAdvancedFilterChange={setAdvancedFilters}
                allTags={allTags}
                allCities={allCities}
            />

            <div style={{ marginTop: '30px', display: 'grid', gap: '20px' }}>
                {filteredCards.length > 0 ? (
                    filteredCards.map(card => (
                        <div key={card.id} className="glass-container" style={{ padding: '20px', borderRadius: '16px', position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                {card.frontImageUrl ? (
                                    <div
                                        onClick={() => setSelectedImageCard(card)}
                                        style={{ width: '240px', height: '140px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                                    >
                                        <img src={`${API_URL}${card.frontImageUrl}`} alt={card.firstName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 'bold', opacity: 0.8 }}>v{card.version || 1}</div>
                                    </div>
                                ) : (
                                    <div style={{ width: '240px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-input)', color: 'var(--text-tertiary)', borderRadius: '8px', border: '1px solid var(--glass-border)', position: 'relative' }}>
                                        <FaIdCard size={64} />
                                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 'bold', opacity: 0.5 }}>v{card.version || 1}</div>
                                    </div>
                                )}

                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4em', color: 'var(--text-primary)', fontWeight: '600' }}>{card.firstName} {card.lastName}</h3>
                                    <p style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {card.logoUrl && <img src={`${API_URL}${card.logoUrl}`} alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px', background: 'white', padding: '2px' }} />}
                                        {card.company} {card.title && `- ${card.title}`}
                                    </p>

                                    {card.tags && card.tags.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '15px' }}>
                                            {card.tags.map(tag => (
                                                <span key={tag.id} style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', background: tag.color || '#3b82f6', color: 'white' }}>{tag.name}</span>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '0.9em' }}>
                                        {card.reminderDate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--glass-bg)', borderRadius: '8px', border: '1px solid var(--accent-warning)', marginBottom: '5px' }}>
                                                <FaCalendarCheck color="var(--accent-warning)" />
                                                <strong style={{ color: 'var(--text-primary)' }}>Hatırlatıcı:</strong>
                                                <span style={{ color: 'var(--text-secondary)' }}>{new Date(card.reminderDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        )}
                                        {card.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaEnvelope color="var(--accent-warning)" /> <strong style={{ color: 'var(--text-tertiary)' }}>E-Posta:</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.email}</span></div>}
                                        {card.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaPhone color="var(--accent-success)" /> <strong style={{ color: 'var(--text-tertiary)' }}>Telefon:</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.phone}</span></div>}
                                        {card.website && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaGlobe color="var(--accent-primary)" /> <strong style={{ color: 'var(--text-tertiary)' }}>Web:</strong> <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)' }}>{card.website}</a></div>}
                                        {(card.city || card.country) && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaCity color="var(--accent-error)" /> <strong style={{ color: 'var(--text-tertiary)' }}>Konum:</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.city}{card.city && card.country && ', '}{card.country}</span></div>}
                                        {card.address && <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}><FaMapMarkerAlt color="var(--accent-error)" style={{ marginTop: '3px' }} /><strong style={{ color: 'var(--text-tertiary)' }}>Adres:</strong> <span style={{ color: 'var(--text-secondary)' }}>{card.address}</span></div>}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '160px', padding: '10px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <button onClick={() => toggleNotes(card.id)} className="glass-button-block" style={{ color: 'var(--accent-warning)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaStickyNote /> Notlar</span>
                                        {expandedNotesId === card.id ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                    </button>
                                    <button onClick={() => toggleDetails(card.id)} className="glass-button-block" style={{ color: 'var(--accent-primary)' }}><FaClock /> Görüşmeler</button>

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

                            {expandedNotesId === card.id && (
                                <div style={{ marginTop: '20px', padding: '20px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, var(--accent-warning), var(--accent-error))' }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaStickyNote color="var(--accent-warning)" size={18} /><strong>Kart Notları</strong></div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {!editingNoteId ? (
                                                <>
                                                    <button onClick={() => { navigator.clipboard.writeText(card.notes || ''); showNotification('Kopyalandı', 'success'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><FaCopy /> Kopyala</button>
                                                    <button onClick={() => { setEditingNoteId(card.id); setEditingNoteText(card.notes || ''); }} style={{ background: 'var(--glass-bg-hover)', color: 'var(--accent-warning)', border: '1px solid var(--accent-warning)', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' }}><FaEdit /> Düzenle</button>
                                                </>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <button onClick={() => setEditingNoteId(null)} style={{ background: 'var(--glass-bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' }}>İptal</button>
                                                    <button onClick={() => handleQuickNoteUpdate(card.id)} style={{ background: 'var(--accent-success)', color: 'var(--bg-card)', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' }}><FaSave /> Kaydet</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {editingNoteId === card.id ? (
                                        <textarea value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)} style={{ width: '100%', minHeight: '120px', background: 'var(--bg-input)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', padding: '12px' }} autoFocus />
                                    ) : (
                                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{card.notes || 'Not eklenmemiş.'}</p>
                                    )}
                                </div>
                            )}

                            {expandedCardId === card.id && (
                                <div style={{ marginTop: '15px', padding: '20px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: 'var(--accent-primary)' }}>Son Etkileşimler</h4>
                                    <InteractionLog cardId={card.id} />
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '50px', textAlign: 'center', opacity: 0.3 }}><FaIdCard size={64} style={{ marginBottom: '20px' }} /><h3>Kayıt bulunamadı</h3></div>
                )}
            </div>

            <Modal title={selectedImageCard ? `${selectedImageCard.firstName} ${selectedImageCard.lastName}` : 'Görsel'} isOpen={!!selectedImageCard} onClose={() => setSelectedImageCard(null)}>
                {selectedImageCard && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div><h4 style={{ color: 'var(--accent-primary)', textAlign: 'center', marginBottom: '10px' }}>Ön Yüz</h4><img src={`${API_URL}${selectedImageCard.frontImageUrl}`} alt="Ön Yüz" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', border: '1px solid var(--glass-border)' }} /></div>
                        {selectedImageCard.backImageUrl && (<div><h4 style={{ color: '#ffc107', textAlign: 'center', marginBottom: '10px' }}>Arka Yüz</h4><img src={`${API_URL}${selectedImageCard.backImageUrl}`} alt="Arka Yüz" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', border: '1px solid #444' }} /></div>)}
                    </div>
                )}
            </Modal>

            <Modal title="Kartvizit Geçmişi" isOpen={!!historyCard} onClose={() => setHistoryCard(null)}>{historyCard && <HistoryTimeline cardId={historyCard.id} />}</Modal>

            <ConfirmModal isOpen={!!deleteConfirmCard} onClose={() => setDeleteConfirmCard(null)} onConfirm={handleDeleteConfirm} title="Kartviziti Sil" message={deleteConfirmCard ? `${deleteConfirmCard.firstName} ${deleteConfirmCard.lastName} adlı kartvizitini silmek istediğinizden emin misiniz?` : ''} />

            {qrModalCard && (
                <QRCodeOverlay title={`${qrModalCard.firstName} ${qrModalCard.lastName}`} url={`${window.location.origin}/contact-profile/${qrModalCard.id}`} vCardData={generateVCardString(qrModalCard)} onClose={() => setQrModalCard(null)} onDownloadVCard={() => handleDownloadVCard(qrModalCard)} />
            )}
        </div>
    );
};

export default Contacts;
