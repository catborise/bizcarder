import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../shared/ConfirmModal';
import {
    FaPhone,
    FaHandshake,
    FaEnvelope,
    FaShoppingCart,
    FaComment,
    FaTrash,
    FaEdit,
    FaPlus,
    FaHistory,
    FaTimes,
    FaCheck,
    FaThumbtack,
    FaStickyNote
} from 'react-icons/fa';

const InteractionLog = ({ cardId }) => {
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const { t, i18n } = useTranslation('pages');
    const [interactions, setInteractions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [editForm, setEditForm] = useState({ type: '', notes: '', date: '' });

    const [formData, setFormData] = useState({
        type: 'Toplantı',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchInteractions = async () => {
        try {
            const res = await api.get(`/api/interactions/${cardId}`);
            setInteractions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (cardId) fetchInteractions();
    }, [cardId]);

    const getIcon = (type) => {
        switch (type) {
            case 'Arama': return <FaPhone style={{ color: 'var(--accent-success)' }} />;
            case 'Toplantı': return <FaHandshake style={{ color: 'var(--accent-primary)' }} />;
            case 'E-posta': return <FaEnvelope style={{ color: 'var(--accent-primary)' }} />;
            case 'Sipariş': return <FaShoppingCart style={{ color: 'var(--accent-warning)' }} />;
            case 'Not': return <FaStickyNote style={{ color: 'var(--accent-warning)' }} />;
            default: return <FaComment style={{ color: 'var(--text-tertiary)' }} />;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Arama': return 'var(--accent-success)';
            case 'Toplantı': return 'var(--accent-primary)';
            case 'E-posta': return 'var(--accent-primary)';
            case 'Sipariş': return 'var(--accent-warning)';
            case 'Not': return 'var(--accent-warning)';
            default: return 'var(--text-tertiary)';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/interactions/${cardId}`, formData);
            setFormData(prev => ({ ...prev, notes: '' }));
            showNotification(t('interaction.saved'), 'success');
            fetchInteractions();
        } catch (err) {
            showNotification(t('interaction.error'), 'error');
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await api.delete(`/api/interactions/${deleteConfirmId}`);
            setDeleteConfirmId(null);
            showNotification(t('interaction.deleted'), 'success');
            fetchInteractions();
        } catch (err) {
            showNotification(t('interaction.deleteFailed'), 'error');
        }
    };

    const startEdit = (log) => {
        setEditingId(log.id);
        setEditForm({
            type: log.type,
            notes: log.notes,
            date: new Date(log.date).toISOString().split('T')[0]
        });
    };

    const handleUpdate = async (id) => {
        try {
            await api.put(`/api/interactions/${id}`, editForm);
            setEditingId(null);
            showNotification(t('interaction.updated'), 'success');
            fetchInteractions();
        } catch (err) {
            showNotification(t('interaction.updateFailed'), 'error');
        }
    };

    const handleTogglePin = async (id) => {
        try {
            await api.put(`/api/interactions/${id}/pin`);
            fetchInteractions();
        } catch (err) {
            showNotification(t('interaction.operationFailed'), 'error');
        }
    };

    const cardContainerStyle = {
        background: 'var(--glass-bg)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--glass-border)',
        marginTop: '25px'
    };

    const timelineItemStyle = {
        position: 'relative',
        paddingLeft: '45px',
        paddingBottom: '30px',
        borderLeft: '2px solid var(--glass-border)',
        marginLeft: '15px'
    };

    const iconBoxStyle = (type) => ({
        position: 'absolute',
        left: '-18px',
        top: '0',
        width: '34px',
        height: '34px',
        background: 'var(--bg-card)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${getTypeColor(type)}`,
        boxShadow: `0 0 10px ${getTypeColor(type)}44`,
        zIndex: 2,
        fontSize: '14px'
    });

    const itemCardStyle = (log) => ({
        background: log.isPinned ? 'rgba(241, 196, 15, 0.05)' : 'var(--bg-card)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '15px',
        border: log.isPinned ? '1px solid var(--accent-warning)' : '1px solid var(--glass-border)',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: log.isPinned ? '0 0 15px rgba(241, 196, 15, 0.2)' : 'var(--glass-shadow)',
        position: 'relative',
        overflow: 'hidden'
    });

    const formInputStyle = {
        background: 'var(--bg-input)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        padding: '10px',
        fontSize: '0.9rem',
        outline: 'none'
    };

    return (
        <div style={cardContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaHistory style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }} /> {t('interaction.title')}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{t('interaction.recordCount', { count: interactions.length })}</span>
            </div>

            {/* Yeni Kayıt Formu */}
            <form onSubmit={handleSubmit} style={{
                marginBottom: '35px',
                background: 'var(--glass-bg)',
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid var(--accent-primary)',
                opacity: 0.9,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                        style={{ ...formInputStyle, width: '130px', cursor: 'pointer' }}
                    >
                        <option value="Toplantı">{t('interaction.type.meeting')}</option>
                        <option value="Arama">{t('interaction.type.call')}</option>
                        <option value="E-posta">{t('interaction.type.email')}</option>
                        <option value="Sipariş">{t('interaction.type.order')}</option>
                        <option value="Not">{t('interaction.type.noteInfo')}</option>
                    </select>
                    <input
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        style={{ ...formInputStyle, width: '160px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <textarea
                        placeholder={t('interaction.notesPlaceholder')}
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        required
                        style={{ ...formInputStyle, flex: 1, minHeight: '60px', resize: 'none' }}
                    />
                    <button type="submit" style={{
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-card)',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: '0.2s',
                        height: 'fit-content'
                    }}>
                        <FaPlus /> {t('interaction.addButton')}
                    </button>
                </div>
            </form>

            <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                {interactions.length === 0 && !isLoading && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                        <FaComment style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.5 }} />
                        <p>{t('interaction.noRecords')}</p>
                    </div>
                )}

                {interactions.map((log, index) => (
                    <div key={log.id} className="timeline-item" style={{
                        ...timelineItemStyle,
                        borderLeft: index === interactions.length - 1 ? 'none' : timelineItemStyle.borderLeft
                    }}>
                        <div style={iconBoxStyle(log.type)}>
                            {getIcon(log.type)}
                        </div>

                        <div className="interaction-card" style={itemCardStyle(log)}>
                            {log.isPinned && (
                                <div style={{
                                    position: 'absolute',
                                    top: '0',
                                    right: '0',
                                    width: '30px',
                                    height: '30px',
                                    background: 'var(--accent-warning)',
                                    color: 'black',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                                    paddingLeft: '8px',
                                    paddingBottom: '8px'
                                }}>
                                    <FaThumbtack size={10} />
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {editingId === log.id ? (
                                        <select
                                            value={editForm.type}
                                            onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                            style={{ ...formInputStyle, padding: '4px 8px', fontSize: '0.8rem' }}
                                        >
                                            <option value="Toplantı">{t('interaction.type.meeting')}</option>
                                            <option value="Arama">{t('interaction.type.call')}</option>
                                            <option value="E-posta">{t('interaction.type.email')}</option>
                                            <option value="Sipariş">{t('interaction.type.order')}</option>
                                            <option value="Not">{t('interaction.type.note')}</option>
                                        </select>
                                    ) : (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            background: `rgba(255,255,255,0.05)`,
                                            color: getTypeColor(log.type),
                                            padding: '3px 8px',
                                            borderRadius: '20px',
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            border: `1px solid ${getTypeColor(log.type)}`
                                        }}>{log.type}</span>
                                    )}

                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                        {editingId === log.id ? (
                                            <input
                                                type="date"
                                                value={editForm.date}
                                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                                style={{ ...formInputStyle, padding: '4px 8px', fontSize: '0.8rem' }}
                                            />
                                        ) : new Date(log.date).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {user?.role === 'admin' || log.authorId === user?.id ? (
                                        <>
                                            {editingId === log.id ? (
                                                <>
                                                    <button onClick={() => handleUpdate(log.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-success)', cursor: 'pointer' }}><FaCheck /></button>
                                                    <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-error)', cursor: 'pointer' }}><FaTimes /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => handleTogglePin(log.id)} 
                                                        style={{ background: 'transparent', border: 'none', color: log.isPinned ? 'var(--accent-warning)' : 'var(--text-tertiary)', cursor: 'pointer' }}
                                                        title={log.isPinned ? t('interaction.unpin') : t('interaction.pin')}
                                                    >
                                                        <FaThumbtack />
                                                    </button>
                                                    <button onClick={() => startEdit(log)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><FaEdit /></button>
                                                    <button onClick={() => setDeleteConfirmId(log.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><FaTrash /></button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        log.isPinned && <FaThumbtack style={{ color: 'var(--accent-warning)' }} />
                                    )}
                                </div>
                            </div>

                            {editingId === log.id ? (
                                <textarea
                                    value={editForm.notes}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    style={{ ...formInputStyle, marginTop: '10px', minHeight: '80px', width: '100%', resize: 'vertical' }}
                                />
                            ) : (
                                <p style={{ margin: '8px 0', color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>{log.notes}</p>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '5px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                    {t('interaction.recordedBy', { author: log.author?.displayName || t('interaction.system') })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal 
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDelete}
                title={t('interaction.deleteConfirmTitle')}
                message={t('interaction.deleteConfirmMessage')}
            />
        </div>
    );
};

export default InteractionLog;
