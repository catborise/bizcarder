import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
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
    FaCheck
} from 'react-icons/fa';

const InteractionLog = ({ cardId }) => {
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const [interactions, setInteractions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
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
            case 'Arama': return <FaPhone style={{ color: '#22c55e' }} />;
            case 'Toplantı': return <FaHandshake style={{ color: '#6366f1' }} />;
            case 'E-posta': return <FaEnvelope style={{ color: '#3b82f6' }} />;
            case 'Sipariş': return <FaShoppingCart style={{ color: '#f59e0b' }} />;
            default: return <FaComment style={{ color: '#94a3b8' }} />;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Arama': return '#22c55e';
            case 'Toplantı': return '#6366f1';
            case 'E-posta': return '#3b82f6';
            case 'Sipariş': return '#f59e0b';
            default: return '#94a3b8';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/interactions/${cardId}`, formData);
            setFormData(prev => ({ ...prev, notes: '' }));
            showNotification('Görüşme kaydedildi.', 'success');
            fetchInteractions();
        } catch (err) {
            showNotification('Hata oluştu.', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/api/interactions/${id}`);
            showNotification('Kayıt silindi.', 'success');
            fetchInteractions();
        } catch (err) {
            showNotification('Silme işlemi başarısız.', 'error');
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
            showNotification('Kayıt güncellendi.', 'success');
            fetchInteractions();
        } catch (err) {
            showNotification('Güncelleme başarısız.', 'error');
        }
    };

    const cardContainerStyle = {
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginTop: '25px'
    };

    const timelineItemStyle = {
        position: 'relative',
        paddingLeft: '45px',
        paddingBottom: '30px',
        borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
        marginLeft: '15px'
    };

    const iconBoxStyle = (type) => ({
        position: 'absolute',
        left: '-18px',
        top: '0',
        width: '34px',
        height: '34px',
        background: 'rgba(0,0,0,0.8)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${getTypeColor(type)}`,
        boxShadow: `0 0 15px ${getTypeColor(type)}44`,
        zIndex: 2,
        fontSize: '14px'
    });

    const itemCardStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '15px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'transform 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const formInputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: 'white',
        padding: '10px',
        fontSize: '0.9rem',
        outline: 'none'
    };

    return (
        <div style={cardContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaHistory style={{ color: '#818cf8', fontSize: '1.2rem' }} /> Görüşme Akışı
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>{interactions.length} Kayıt</span>
            </div>

            {/* Yeni Kayıt Formu */}
            <form onSubmit={handleSubmit} style={{
                marginBottom: '35px',
                background: 'rgba(99, 102, 241, 0.05)',
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.15)',
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
                        <option value="Toplantı" style={{ background: '#1a1a1a' }}>Toplantı</option>
                        <option value="Arama" style={{ background: '#1a1a1a' }}>Arama</option>
                        <option value="E-posta" style={{ background: '#1a1a1a' }}>E-posta</option>
                        <option value="Sipariş" style={{ background: '#1a1a1a' }}>Sipariş</option>
                        <option value="Not" style={{ background: '#1a1a1a' }}>Diğer / Not</option>
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
                        placeholder="Görüşme detaylarını girin..."
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        required
                        style={{ ...formInputStyle, flex: 1, minHeight: '60px', resize: 'none' }}
                    />
                    <button type="submit" style={{
                        background: '#6366f1',
                        color: 'white',
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
                        <FaPlus /> Ekle
                    </button>
                </div>
            </form>

            {/* Timeline Akışı */}
            <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                {interactions.length === 0 && !isLoading && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                        <FaComment style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.5 }} />
                        <p>Henüz bir görüşme kaydı bulunmuyor.</p>
                    </div>
                )}

                {interactions.map((log, index) => (
                    <div key={log.id} style={{
                        ...timelineItemStyle,
                        borderLeft: index === interactions.length - 1 ? 'none' : timelineItemStyle.borderLeft
                    }}>
                        <div style={iconBoxStyle(log.type)}>
                            {getIcon(log.type)}
                        </div>

                        <div style={itemCardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {editingId === log.id ? (
                                        <select
                                            value={editForm.type}
                                            onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                            style={{ ...formInputStyle, padding: '4px 8px', fontSize: '0.8rem' }}
                                        >
                                            <option value="Toplantı" style={{ background: '#1a1a1a' }}>Toplantı</option>
                                            <option value="Arama" style={{ background: '#1a1a1a' }}>Arama</option>
                                            <option value="E-posta" style={{ background: '#1a1a1a' }}>E-posta</option>
                                            <option value="Sipariş" style={{ background: '#1a1a1a' }}>Sipariş</option>
                                            <option value="Not" style={{ background: '#1a1a1a' }}>Not</option>
                                        </select>
                                    ) : (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            background: `${getTypeColor(log.type)}22`,
                                            color: getTypeColor(log.type),
                                            padding: '3px 8px',
                                            borderRadius: '20px',
                                            fontWeight: '700',
                                            textTransform: 'uppercase'
                                        }}>{log.type}</span>
                                    )}
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                        {editingId === log.id ? (
                                            <input
                                                type="date"
                                                value={editForm.date}
                                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                                style={{ ...formInputStyle, padding: '4px 8px', fontSize: '0.8rem' }}
                                            />
                                        ) : new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(user?.role === 'admin' || log.authorId === user?.id) && (
                                        <>
                                            {editingId === log.id ? (
                                                <>
                                                    <button onClick={() => handleUpdate(log.id)} style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer' }} title="Kaydet"><FaCheck /></button>
                                                    <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="İptal"><FaTimes /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(log)} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', transition: '0.2s' }} title="Düzenle"><FaEdit /></button>
                                                    <button onClick={() => handleDelete(log.id)} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', transition: '0.2s' }} title="Sil"><FaTrash /></button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {editingId === log.id ? (
                                <textarea
                                    value={editForm.notes}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    style={{ ...formInputStyle, marginTop: '5px', minHeight: '60px' }}
                                />
                            ) : (
                                <p style={{ margin: '5px 0', color: '#eee', lineHeight: '1.5', fontSize: '0.95rem' }}>{log.notes}</p>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '5px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic' }}>
                                    {log.author?.displayName || 'Sistem'} tarafından kaydedildi
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InteractionLog;
