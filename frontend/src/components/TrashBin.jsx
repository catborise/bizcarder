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

    if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>Yükleniyor...</div>;


    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
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
                            background: 'var(--accent-error)',
                            color: 'var(--bg-card)',
                            border: '1px solid var(--glass-border)',
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
                            e.target.style.opacity = '0.9';
                            e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.opacity = '1';
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
                    background: 'var(--glass-bg)',
                    borderRadius: '16px',
                    border: '1px solid var(--glass-border)'
                }}>
                    <FaTrash size={64} color="var(--text-tertiary)" />
                    <p style={{ marginTop: '20px', color: 'var(--text-tertiary)', fontSize: '1.1rem' }}>
                        Çöp kutusu boş
                    </p>
                </div>

            ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {trashedCards.map(card => {
                        const daysLeft = getDaysRemaining(card.deletedAt);
                        return (
                            <div key={card.id} style={{
                                background: 'var(--bg-card)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid var(--glass-border)',
                                padding: '20px',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s ease'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                            >
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.3em' }}>
                                        {card.firstName} {card.lastName}
                                    </h3>
                                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>
                                        {card.company} {card.title && `- ${card.title}`}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.9em', color: 'var(--text-tertiary)' }}>
                                        <span>Silinme: {new Date(card.deletedAt).toLocaleDateString('tr-TR')}</span>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            color: daysLeft < 7 ? 'var(--accent-error)' : 'var(--accent-warning)'
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
                                            background: 'var(--glass-bg)',
                                            color: 'var(--accent-success)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--glass-bg-hover)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'var(--glass-bg)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <FaUndo /> Geri Yükle
                                    </button>

                                    <button
                                        onClick={() => setConfirmAction({ type: 'delete', card })}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'var(--glass-bg)',
                                            color: 'var(--accent-error)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--glass-bg-hover)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'var(--glass-bg)';
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
