import React, { useState, useEffect } from 'react';
import { FaHistory, FaUser, FaClock, FaPen, FaPlus, FaTrash, FaUndo } from 'react-icons/fa';
import api from '../api/axios';

const HistoryTimeline = ({ cardId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get(`/api/cards/${cardId}/history`);
                setHistory(res.data);
            } catch (err) {
                console.error("History fetch error:", err);
                setError("Geçmiş yüklenirken bir sorun oluştu.");
            } finally {
                setLoading(false);
            }
        };

        if (cardId) fetchHistory();
    }, [cardId]);

    if (loading) return <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Yükleniyor...</div>;
    if (error) return <div style={{ textAlign: 'center', color: '#ff6b6b', padding: '20px' }}>{error}</div>;
    if (history.length === 0) return <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Henüz geçmiş kaydı yok.</div>;

    const getIcon = (type) => {
        switch (type) {
            case 'CREATE': return <FaPlus />;
            case 'UPDATE': return <FaPen />;
            case 'SOFT_DELETE': return <FaTrash />;
            case 'RESTORE': return <FaUndo />;
            default: return <FaClock />;
        }
    };

    const getLabel = (type) => {
        switch (type) {
            case 'CREATE': return 'Oluşturuldu';
            case 'UPDATE': return 'Güncellendi';
            case 'SOFT_DELETE': return 'Çöp Kutusuna Gönderildi';
            case 'RESTORE': return 'Geri Yüklendi';
            default: return 'İşlem Yapıldı';
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'CREATE': return '#28a745';
            case 'UPDATE': return '#ffc107';
            case 'SOFT_DELETE': return '#dc3545';
            case 'RESTORE': return '#17a2b8';
            default: return '#6c757d';
        }
    };

    // Değişiklikleri tespit etmek için helper
    const getChanges = (currentSnapshot, prevSnapshot) => {
        if (!prevSnapshot) return null;
        const changes = [];
        const ignoreFields = ['updatedAt', 'createdAt', 'version', 'deletedAt', 'deletedBy'];

        Object.keys(currentSnapshot).forEach(key => {
            if (ignoreFields.includes(key)) return;
            // Basit karşılaştırma (Object/Array derin karşılaştırma yok ama bu proje için yeterli)
            if (currentSnapshot[key] !== prevSnapshot[key]) {
                changes.push({
                    field: key,
                    from: prevSnapshot[key],
                    to: currentSnapshot[key]
                });
            }
        });
        return changes;
    };

    return (
        <div className="timeline-container" style={{ position: 'relative', padding: '10px 0' }}>
            {history.map((record, index) => {
                const nextRecord = history[index + 1]; // Bir önceki versiyon (tarihsel olarak daha eski)
                const changes = record.changeType === 'UPDATE' ? getChanges(record.snapshot, nextRecord?.snapshot) : null;

                return (
                    <div key={record.id} style={{
                        display: 'flex',
                        gap: '20px',
                        marginBottom: '30px',
                        position: 'relative'
                    }}>
                        {/* Çizgi */}
                        {index !== history.length - 1 && (
                            <div style={{
                                position: 'absolute',
                                left: '19px',
                                top: '40px',
                                bottom: '-30px',
                                width: '2px',
                                background: 'rgba(255, 255, 255, 0.1)'
                            }} />
                        )}

                        {/* İkon */}
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: `rgba(255, 255, 255, 0.05)`,
                            border: `2px solid ${getColor(record.changeType)}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: getColor(record.changeType),
                            fontSize: '16px',
                            zIndex: 2,
                            flexShrink: 0
                        }}>
                            {getIcon(record.changeType)}
                        </div>

                        {/* İçerik */}
                        <div style={{
                            flex: 1,
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '15px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ margin: 0, color: 'white', fontWeight: 'bold' }}>
                                        {getLabel(record.changeType)} <span style={{ fontSize: '0.8em', opacity: 0.6, fontWeight: 'normal' }}>(v{record.version})</span>
                                    </h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc', marginTop: '4px' }}>
                                        <FaUser size={12} /> {record.editor ? (record.editor.displayName || record.editor.username) : 'Sistem'}
                                        <span>•</span>
                                        <FaClock size={12} /> {new Date(record.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Değişiklik Detayları */}
                            {changes && changes.length > 0 && (
                                <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                                    {changes.map((change, i) => (
                                        <div key={i} style={{ fontSize: '13px', marginBottom: '4px', color: '#ccc' }}>
                                            <strong style={{ color: '#aaa' }}>{change.field}:</strong>{' '}
                                            <span style={{ color: '#ff6b6b', textDecoration: 'line-through' }}>{change.from || '(boş)'}</span>
                                            {' -> '}
                                            <span style={{ color: '#28a745' }}>{change.to || '(boş)'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Create Snapshot Özeti (Opsiyonel) */}
                            {record.changeType === 'CREATE' && (
                                <div style={{ marginTop: '10px', fontSize: '13px', color: '#888', fontStyle: 'italic' }}>
                                    İlk oluşturulma. {record.snapshot.firstName} {record.snapshot.lastName} - {record.snapshot.company}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default HistoryTimeline;
