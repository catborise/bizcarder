import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTrash, FaUndo, FaTrashRestore, FaClock } from 'react-icons/fa';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../shared/ConfirmModal';

const TrashBin = () => {
    const { t, i18n } = useTranslation(['pages', 'common']);
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
            showNotification(t('pages:trash.loadError'), 'error');
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
            showNotification(t('pages:trash.restored', { firstName: card.firstName, lastName: card.lastName }), 'success');
            fetchTrashedCards();
        } catch (error) {
            showNotification(t('pages:trash.restoreError', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    const handlePermanentDelete = async (card) => {
        try {
            await api.delete(`/api/cards/${card.id}/permanent`);
            showNotification(t('pages:trash.permanentlyDeleted', { firstName: card.firstName, lastName: card.lastName }), 'success');
            fetchTrashedCards();
        } catch (error) {
            showNotification(t('pages:trash.deleteError', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    const handleEmptyTrash = async () => {
        try {
            const res = await api.delete('/api/cards/trash/empty');
            showNotification(res.data.message, 'success');
            fetchTrashedCards();
        } catch (error) {
            showNotification(t('pages:trash.emptyError', { error: error.response?.data?.error || error.message }), 'error');
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

    if (loading) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>{t('common:loading')}</div>;


    return (
        <div className="fade-in trash-page">
            {/* Header */}
            <div className="trash-header">
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaTrash size={20} /> {t('pages:trash.title')}
                </h2>
                {trashedCards.length > 0 && (
                    <button onClick={() => setConfirmAction({ type: 'empty' })} className="glass-button"
                        style={{ background: 'var(--accent-error)', color: '#fff', border: 'none', fontWeight: 600, gap: '8px' }}>
                        <FaTrashRestore size={14} /> {t('pages:trash.emptyTrash')}
                    </button>
                )}
            </div>

            {trashedCards.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: 'var(--space-12) var(--space-6)',
                    background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)',
                }}>
                    <FaTrash size={48} color="var(--text-tertiary)" />
                    <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-tertiary)', fontSize: '0.95rem' }}>
                        {t('pages:trash.empty')}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {trashedCards.map(card => {
                        const daysLeft = getDaysRemaining(card.deletedAt);
                        return (
                            <div key={card.id} className="trash-card">
                                <div className="trash-card-info">
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700 }}>
                                        {card.firstName} {card.lastName}
                                    </h3>
                                    <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {card.company}{card.title && ` — ${card.title}`}
                                    </p>
                                    <div className="trash-card-meta">
                                        <span>{t('pages:trash.deletedOn')}{new Date(card.deletedAt).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: daysLeft < 7 ? 'var(--accent-error)' : 'var(--accent-warning)' }}>
                                            <FaClock size={11} /> {t('pages:trash.daysRemaining', { days: daysLeft })}
                                        </span>
                                    </div>
                                </div>
                                <div className="trash-card-actions">
                                    <button onClick={() => setConfirmAction({ type: 'restore', card })} className="glass-button-small" style={{ color: 'var(--accent-success)', gap: '6px' }}>
                                        <FaUndo size={12} /> {t('pages:trash.restore')}
                                    </button>
                                    <button onClick={() => setConfirmAction({ type: 'delete', card })} className="glass-button-small" style={{ color: 'var(--accent-error)', gap: '6px' }}>
                                        <FaTrash size={12} /> {t('pages:trash.permanentDelete')}
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
                title={t('pages:trash.restoreConfirmTitle')}
                message={confirmAction?.card ? t('pages:trash.restoreConfirmMessage', { firstName: confirmAction.card.firstName, lastName: confirmAction.card.lastName }) : ''}
            />

            <ConfirmModal
                isOpen={!!confirmAction && confirmAction.type === 'delete'}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => {
                    handlePermanentDelete(confirmAction.card);
                    setConfirmAction(null);
                }}
                title={t('pages:trash.permanentDeleteConfirmTitle')}
                message={confirmAction?.card ? t('pages:trash.permanentDeleteConfirmMessage', { firstName: confirmAction.card.firstName, lastName: confirmAction.card.lastName }) : ''}
            />

            <ConfirmModal
                isOpen={!!confirmAction && confirmAction.type === 'empty'}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => {
                    handleEmptyTrash();
                    setConfirmAction(null);
                }}
                title={t('pages:trash.emptyTrash')}
                message={t('pages:trash.emptyConfirmMessage')}
            />
        </div>
    );
};

export default TrashBin;
