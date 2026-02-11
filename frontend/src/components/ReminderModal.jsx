import React from 'react';
import { FaCalendarCheck, FaTimes, FaExternalLinkAlt, FaTrashAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';

const ReminderModal = ({ reminders, onClose, onRefresh }) => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    if (!reminders || reminders.length === 0) return null;

    const handleDismiss = async (id, e) => {
        e.stopPropagation();
        try {
            await api.put(`/api/cards/${id}`, { reminderDate: null });
            showNotification('Hatırlatıcı temizlendi.', 'success');
            onRefresh();
        } catch (error) {
            showNotification('Hata oluştu: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handleView = (id) => {
        onClose();
        // Here we could navigate to contacts and highlight the card
        // For now, let's just go to contacts or handle it specifically if needed
        navigate('/contacts');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '24px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '80vh',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                color: 'white'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            padding: '10px',
                            background: 'rgba(251, 191, 36, 0.2)',
                            borderRadius: '12px',
                            color: '#fbbf24'
                        }}>
                            <FaCalendarCheck size={24} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>Hatırlatıcılar</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* List Container */}
                <div style={{
                    padding: '12px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {reminders.map(card => (
                            <div
                                key={card.id}
                                onClick={() => handleView(card.id)}
                                style={{
                                    padding: '16px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '4px' }}>
                                        {card.firstName} {card.lastName}
                                    </div>
                                    <div style={{
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>{card.company}</span>
                                        <span style={{
                                            padding: '2px 8px',
                                            background: 'rgba(251, 191, 36, 0.2)',
                                            color: '#fbbf24',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: '600'
                                        }}>
                                            {new Date(card.reminderDate).toLocaleDateString('tr-TR')}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={(e) => handleDismiss(card.id, e)}
                                        title="Hatırlatıcıyı Temizle"
                                        style={{
                                            padding: '8px',
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            border: 'none',
                                            color: '#f87171',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                    >
                                        <FaTrashAlt size={16} />
                                    </button>
                                    <button
                                        style={{
                                            padding: '8px',
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            border: 'none',
                                            color: '#60a5fa',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <FaExternalLinkAlt size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    background: 'rgba(255, 255, 255, 0.05)'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        Kapat
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ReminderModal;
