import { useState, useEffect } from 'react';
import { FaTrash, FaUndo, FaTrashRestore, FaClock } from 'react-icons/fa';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';

const TrashBin = () => {
    const [trashedCards, setTrashedCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'restore'|'delete'|'empty', card }
    const { showNotification } = useNotification();
    const { user } = useAuth();

    const fetchTrashedCards = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/cards/trash');
            setTrashedCards(res.data);
        } catch (error) {
            console.error('Fetch trash error:', error);
            showNotification('Çöp kutusu yüklenirken hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrashedCards();
    }, []);

    const handleRestore = async (card) => {
        try {
            await api.post(`/api/cards/${card.id}/restore`);
            showNotification(`${card.firstName} ${card.lastName} geri yüklendi.`, 'success');
            fetchTrashedCards();
        } catch (error) {
            showNotification('Geri yükleme başarısız: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handlePermanentDelete = async (card) => {
        try {
            await api.delete(`/api/cards/${card.id}/permanent`);
            showNotification(`${card.firstName} ${card.lastName} kalıcı olarak silindi.`, 'success');
            fetchTrashedCards();
        } catch (error) {
            showNotification('Silme başarısız: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handleEmptyTrash = async () => {
        try {
            const res = await api.delete('/api/cards/trash/empty');
            showNotification(res.data.message, 'success');
            fetchTrashedCards();
        } catch (error) {
            showNotification('Çöp kutusu boşaltılamadı: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const getDaysRemaining = (deletedAt) => {
        const retentionDays = user?.trashRetentionDays || 30;
        const deleteDate = new Date(deletedAt);
        const expiryDate = new Date(deleteDate);
        expiryDate.setDate(expiryDate.getDate() + retentionDays);

        const now = new Date();
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 ? daysLeft : 0;
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: '#aaa' }}>Yükleniyor...</div>;

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: 'white',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    <FaTrash /> Çöp Kutusu
                </h2>
                {trashedCards.length > 0 && (
                    <button
                        onClick={() => setConfirmAction({ type: 'empty' })}
                        style={{
                            background: 'rgba(220, 53, 69, 0.8)',
                            backdropFilter: 'blur(10px)',
                            color: 'white',
                            border: '1px solid rgba(220, 53, 69, 0.4)',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(220, 53, 69, 1)';
                            e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(220, 53, 69, 0.8)';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        <FaTrashRestore /> Çöp Kutusunu Boşalt
                    </button>
                )}
            </div>

            {trashedCards.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <FaTrash size={64} color="rgba(255, 255, 255, 0.2)" />
                    <p style={{ marginTop: '20px', color: '#888', fontSize: '1.1rem' }}>
                        Çöp kutusu boş
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {trashedCards.map(card => {
                        const daysLeft = getDaysRemaining(card.deletedAt);
                        return (
                            <div key={card.id} style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                padding: '20px',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s ease'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                            >
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '1.3em' }}>
                                        {card.firstName} {card.lastName}
                                    </h3>
                                    <p style={{ margin: '0 0 8px 0', color: 'rgba(255, 255, 255, 0.6)' }}>
                                        {card.company} {card.title && `- ${card.title}`}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.9em', color: 'rgba(255, 255, 255, 0.5)' }}>
                                        <span>Silinme: {new Date(card.deletedAt).toLocaleDateString('tr-TR')}</span>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            color: daysLeft < 7 ? '#ff6b6b' : '#ffc107'
                                        }}>
                                            <FaClock /> {daysLeft} gün kaldı
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setConfirmAction({ type: 'restore', card })}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'rgba(40, 167, 69, 0.2)',
                                            color: '#2ecc71',
                                            border: '1px solid rgba(40, 167, 69, 0.4)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(40, 167, 69, 0.3)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(40, 167, 69, 0.2)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <FaUndo /> Geri Yükle
                                    </button>
                                    <button
                                        onClick={() => setConfirmAction({ type: 'delete', card })}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'rgba(220, 53, 69, 0.2)',
                                            color: '#ff6b6b',
                                            border: '1px solid rgba(220, 53, 69, 0.4)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(220, 53, 69, 0.3)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(220, 53, 69, 0.2)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <FaTrash /> Kalıcı Sil
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Onay Modalları */}
            <ConfirmModal
                isOpen={!!confirmAction && confirmAction.type === 'restore'}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => {
                    handleRestore(confirmAction.card);
                    setConfirmAction(null);
                }}
                title="Kartı Geri Yükle"
                message={confirmAction?.card ? `${confirmAction.card.firstName} ${confirmAction.card.lastName} adlı kartviziti geri yüklemek istediğinizden emin misiniz?` : ''}
            />

            <ConfirmModal
                isOpen={!!confirmAction && confirmAction.type === 'delete'}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => {
                    handlePermanentDelete(confirmAction.card);
                    setConfirmAction(null);
                }}
                title="Kalıcı Olarak Sil"
                message={confirmAction?.card ? `${confirmAction.card.firstName} ${confirmAction.card.lastName} adlı kartviziti KALICI OLARAK silmek istediğinizden emin misiniz? Bu işlem GERİ ALINAMAZ!` : ''}
            />

            <ConfirmModal
                isOpen={!!confirmAction && confirmAction.type === 'empty'}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => {
                    handleEmptyTrash();
                    setConfirmAction(null);
                }}
                title="Çöp Kutusunu Boşalt"
                message="Tüm çöp kutusunu boşaltmak istediğinizden emin misiniz? Bu işlem GERİ ALINAMAZ!"
            />
        </div>
    );
};

export default TrashBin;
