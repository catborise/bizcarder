import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.put(`/api/users/${userId}/role`, { role: newRole });
            // Listeyi güncelle
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error('Role update failed:', err);
            alert('Rol güncellenirken hata oluştu.');
        }
    };

    if (loading) return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Yükleniyor...</div>;

    return (
        <div className="fade-in" style={{ padding: '2rem' }}>
            <h2 style={{
                marginBottom: '30px',
                fontWeight: '700',
                fontSize: '2.5rem',
                color: 'white',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                <span style={{ fontSize: '2rem' }}>👥</span> Kullanıcı Yönetimi
            </h2>

            <div style={{ display: 'grid', gap: '15px' }}>
                {users.map(u => (
                    <div key={u.id} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '15px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between', // Alanı yay
                        gap: '20px',
                        transition: 'all 0.2s ease'
                    }}>
                        {/* Sol Taraf: Bilgiler */}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>
                                {u.displayName}
                                {u.id === currentUser.id && <span style={{ fontSize: '0.8rem', marginLeft: '10px', color: '#aaa' }}>(Siz)</span>}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                ✉️ {u.email} | 🆔 {u.username}
                            </div>
                        </div>

                        {/* Orta: Rol Badge */}
                        <div style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            background: u.role === 'admin' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: u.role === 'admin' ? '#ffc107' : '#ddd',
                            border: `1px solid ${u.role === 'admin' ? 'rgba(255, 193, 7, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`
                        }}>
                            {u.role === 'admin' ? '👑 Admin' : '👤 Kullanıcı'}
                        </div>

                        {/* Sağ: Aksiyonlar */}
                        <div>
                            {u.id !== currentUser.id && ( // Kendisinin yetkisini alamasın
                                <button
                                    onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                                    style={{
                                        background: u.role === 'admin' ? 'rgba(220, 53, 69, 0.2)' : 'rgba(40, 167, 69, 0.2)',
                                        color: u.role === 'admin' ? '#ff6b6b' : '#2ecc71',
                                        border: `1px solid ${u.role === 'admin' ? 'rgba(220, 53, 69, 0.4)' : 'rgba(40, 167, 69, 0.4)'}`,
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                        e.currentTarget.style.background = u.role === 'admin' ? 'rgba(220, 53, 69, 0.3)' : 'rgba(40, 167, 69, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.background = u.role === 'admin' ? 'rgba(220, 53, 69, 0.2)' : 'rgba(40, 167, 69, 0.2)';
                                    }}
                                >
                                    {u.role === 'admin' ? 'Admin Yetkisini Al' : 'Admin Yap'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserManagement;
