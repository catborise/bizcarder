import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from './Modal';
import { FaSearch, FaUsers, FaUserShield, FaUser, FaCheck, FaClock, FaKey, FaFilter, FaTimesCircle, FaLock, FaSave, FaTimes, FaTrash, FaExchangeAlt } from 'react-icons/fa';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Password Reset Modal State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Delete User Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

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

    const handleRoleChange = async (userId, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        // Optimistic UI update
        const originalUsers = [...users];
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

        try {
            await api.put(`/api/users/${userId}/role`, { role: newRole });
        } catch (err) {
            console.error('Role update failed:', err);
            setUsers(originalUsers); // Revert on failure
            showNotification('Rol güncellenirken hata oluştu.', 'error');
        }
    };

    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setIsPasswordModalOpen(true);
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            showNotification('Şifre en az 6 karakter olmalıdır.', 'warning');
            return;
        }

        setPasswordLoading(true);
        try {
            await api.put(`/api/users/${selectedUser.id}/password`, { newPassword });
            showNotification('Şifre başarıyla güncellendi.', 'success');
            setIsPasswordModalOpen(false);
            setSelectedUser(null);
            setNewPassword('');
        } catch (err) {
            console.error('Password reset failed:', err);
            showNotification('Şifre sıfırlanırken hata oluştu: ' + (err.response?.data?.error || err.message), 'error');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleApprove = async (userId, currentStatus) => {
        // Optimistic UI update
        const originalUsers = [...users];
        setUsers(users.map(u => u.id === userId ? { ...u, isApproved: !currentStatus } : u));

        try {
            await api.put(`/api/users/${userId}/approve`, { isApproved: !currentStatus });
        } catch (err) {
            console.error('Approval failed:', err);
            setUsers(originalUsers); // Revert
            showNotification('Onay işlemi sırasında hata oluştu: ' + (err.response?.data?.error || err.message), 'error');
        }
    };

    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteUser = async (transferCards) => {
        if (!userToDelete) return;

        setDeleteLoading(true);
        // Optimistic UI update could be complex here due to card transfer logic, so we'll wait for API response
        try {
            await api.delete(`/api/users/${userToDelete.id}`, {
                data: { transferCards } // axios delete body needs 'data' key
            });

            showNotification('Kullanıcı başarıyla silindi.', 'success');
            setUsers(users.filter(u => u.id !== userToDelete.id)); // Remove from list
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } catch (err) {
            console.error('User deletion failed:', err);
            showNotification('Kullanıcı silinirken hata oluştu: ' + (err.response?.data?.error || err.message), 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'approved' && user.isApproved) ||
            (statusFilter === 'pending' && !user.isApproved);

        return matchesSearch && matchesRole && matchesStatus;
    });

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <div className="spinner"></div>
        </div>
    );

    return (
        <div className="fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{
                    fontWeight: '700',
                    fontSize: '2rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    margin: 0
                }}>
                    <FaUsers size={32} color="var(--accent-primary)" /> Kullanıcı Yönetimi
                </h2>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{filteredUsers.length}</span>
                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Kullanıcı Listeleniyor</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-container" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ position: 'relative' }}>
                        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1rem' }} />
                        <input
                            type="text"
                            placeholder="İsim, e-posta veya kullanıcı adı ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                paddingLeft: '40px',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                height: '42px',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <FaFilter style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, zIndex: 1 }} />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                minWidth: '160px',
                                height: '42px',
                                paddingLeft: '35px',
                                cursor: 'pointer',
                                appearance: 'none'
                            }}
                        >
                            <option value="all">Rol: Tümü</option>
                            <option value="admin">Admin</option>
                            <option value="user">Kullanıcı</option>
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <FaFilter style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, zIndex: 1 }} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                minWidth: '160px',
                                height: '42px',
                                paddingLeft: '35px',
                                cursor: 'pointer',
                                appearance: 'none'
                            }}
                        >
                            <option value="all">Durum: Tümü</option>
                            <option value="approved">Onaylı</option>
                            <option value="pending">Beklemede</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List Header - Desktop Only */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.5fr',
                padding: '0 1.5rem 0.8rem 1.5rem',
                color: 'var(--text-tertiary)',
                fontSize: '0.85rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                alignItems: 'center'
            }} className="desktop-header">
                <div>Kullanıcı Bilgileri</div>
                <div>Üyelik Tarihi</div>
                <div style={{ textAlign: 'center' }}>Hesap Onayı</div>
                <div style={{ textAlign: 'center' }}>Yönetici Yetkisi</div>
                <div style={{ textAlign: 'right' }}>İşlemler</div>
            </div>

            {/* Users List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(u => (
                        <div key={u.id} className="glass-container" style={{
                            padding: '1rem 1.5rem',
                            display: 'grid',
                            gridTemplateColumns: 'minmax(250px, 1.5fr) 1fr 1fr 1fr 0.5fr',
                            alignItems: 'center',
                            gap: '15px',
                            transition: 'all 0.2s ease',
                            borderLeft: u.role === 'admin' ? '4px solid var(--accent-warning)' : '4px solid transparent'
                        }}>
                            {/* User Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', overflow: 'hidden' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    background: u.role === 'admin'
                                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.8))'
                                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.8))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    flexShrink: 0,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                }}>
                                    {u.displayName?.substring(0, 1).toUpperCase() || u.username?.substring(0, 1).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {u.displayName}
                                        {u.id === currentUser.id && <span style={{
                                            fontSize: '0.7rem',
                                            marginLeft: '8px',
                                            background: 'rgba(255,255,255,0.1)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            color: 'var(--text-tertiary)'
                                        }}>SİZ</span>}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {u.email}
                                    </div>
                                </div>
                            </div>

                            {/* Date Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>@{u.username}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {new Date(u.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>

                            {/* Status Switch */}
                            <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <label className="switch" title={u.isApproved ? 'Hesabı Askıya Al' : 'Hesabı Onayla'}>
                                    <input
                                        type="checkbox"
                                        checked={u.isApproved}
                                        onChange={() => currentUser.id !== u.id && handleApprove(u.id, u.isApproved)}
                                        disabled={currentUser.id === u.id}
                                    />
                                    <span className="slider"></span>
                                </label>
                                <span style={{ fontSize: '0.75rem', color: u.isApproved ? 'var(--accent-success)' : 'var(--accent-error)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {u.isApproved ? <><FaCheck size={10} /> Onaylı</> : <><FaTimesCircle size={10} /> Beklemede</>}
                                </span>
                            </div>

                            {/* Role Switch */}
                            <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <label className="switch" title={u.role === 'admin' ? 'Admin Yetkisini Al' : 'Admin Yap'}>
                                    <input
                                        type="checkbox"
                                        checked={u.role === 'admin'}
                                        onChange={() => currentUser.id !== u.id && handleRoleChange(u.id, u.role)}
                                        disabled={currentUser.id === u.id}
                                    />
                                    <span className="slider role-switch"></span>
                                </label>
                                <span style={{ fontSize: '0.75rem', color: u.role === 'admin' ? 'var(--accent-warning)' : 'var(--text-tertiary)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {u.role === 'admin' ? <><FaUserShield size={10} /> Admin</> : <><FaUser size={10} /> Kullanıcı</>}
                                </span>
                            </div>

                            {/* Functions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                {u.id !== currentUser.id && (
                                    <button
                                        onClick={() => openPasswordModal(u)}
                                        title="Şifre Sıfırla"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: 'var(--text-secondary)',
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            cursor: 'pointer',
                                            marginRight: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                            e.currentTarget.style.color = '#60a5fa';
                                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                        }}
                                    >
                                        <FaKey size={14} />
                                    </button>
                                )}
                                {u.id !== currentUser.id && (
                                    <button
                                        onClick={() => openDeleteModal(u)}
                                        title="Kullanıcıyı Sil"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: 'var(--text-secondary)',
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                            e.currentTarget.style.color = '#f87171';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                        }}
                                    >
                                        <FaTrash size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass-container" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)', flexDirection: 'column', display: 'flex', alignItems: 'center' }}>
                        <FaSearch size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Sonuç Bulunamadı</h3>
                        <p>Aradığınız kriterlere uygun kullanıcı yok.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setRoleFilter('all'); setStatusFilter('all'); }}
                            style={{
                                marginTop: '1.5rem',
                                color: 'var(--accent-primary)',
                                background: 'transparent',
                                border: 'none',
                                textDecoration: 'underline',
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            Filtreleri Temizle
                        </button>
                    </div>
                )}
            </div>

            {/* Password Reset Modal */}
            <Modal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                title="Şifre Sıfırla"
            >
                <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '350px' }}>

                    <div style={{
                        padding: '15px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            color: 'white'
                        }}>
                            {selectedUser?.displayName?.substring(0, 1).toUpperCase() || selectedUser?.username?.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold', color: 'white' }}>{selectedUser?.displayName}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>@{selectedUser?.username}</div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Yeni Şifre</label>
                        <div style={{ position: 'relative' }}>
                            <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Yeni şifreyi girin..."
                                style={{
                                    width: '100%',
                                    paddingLeft: '36px',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    height: '45px'
                                }}
                                autoFocus
                            />
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '5px' }}>
                            En az 6 karakter uzunluğunda olmalıdır.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setIsPasswordModalOpen(false)}
                            style={{
                                padding: '10px 20px',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            <FaTimes /> İptal
                        </button>
                        <button
                            type="submit"
                            disabled={!newPassword || passwordLoading}
                            style={{
                                padding: '10px 20px',
                                background: 'var(--accent-primary)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '8px',
                                cursor: !newPassword || passwordLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !newPassword || passwordLoading ? 0.7 : 1,
                                transition: 'all 0.2s',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                if (newPassword && !passwordLoading) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (newPassword && !passwordLoading) {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                }
                            }}
                        >
                            {passwordLoading ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : <FaSave />}
                            {passwordLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Kullanıcıyı Sil"
            >
                <div style={{ padding: '10px', minWidth: '350px' }}>
                    <div style={{
                        padding: '15px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--accent-error)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <FaTrash color="white" size={18} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 5px 0', color: 'white' }}>Bu kullanıcıyı silmek istediğinize emin misiniz?</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                                <strong>{userToDelete?.displayName}</strong> (@{userToDelete?.username}) kullanıcısı kalıcı olarak silinecektir.
                            </p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                            Kullanıcının kartvizitleri ile ne yapmak istersiniz?
                        </p>

                        <div style={{ display: 'grid', gap: '10px' }}>
                            <button
                                onClick={() => handleDeleteUser(true)}
                                disabled={deleteLoading}
                                style={{
                                    padding: '12px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    opacity: deleteLoading ? 0.7 : 1
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                            >
                                <div style={{
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    display: 'flex'
                                }}>
                                    <FaExchangeAlt size={16} color="#60a5fa" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Kartvizitleri Bana Aktar ve Sil</div>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Kartvizitler sizin hesabınıza aktarılır.</div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleDeleteUser(false)}
                                disabled={deleteLoading}
                                style={{
                                    padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    opacity: deleteLoading ? 0.7 : 1
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            >
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    display: 'flex'
                                }}>
                                    <FaTrash size={16} color="#f87171" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Kartvizitlerle Birlikte Sil</div>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Kartvizitler çöp kutusuna taşınır.</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={deleteLoading}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            İptal
                        </button>
                    </div>
                </div>
            </Modal>

            <style>{`
                @media (max-width: 900px) {
                    .desktop-header {
                        display: none !important;
                    }
                    /* Card View for Mobile */
                     .glass-container {
                        grid-template-columns: 1fr !important;
                        grid-template-rows: auto;
                        gap: 15px !important;
                        text-align: center;
                    }
                    
                    /* Re-arrange items for mobile */
                    /* User Info */
                    .glass-container > div:nth-child(1) {
                         flex-direction: column;
                         text-align: center;
                    }
                    
                    /* Date */
                    .glass-container > div:nth-child(2) {
                        display: none !important; /* Hide date on mobile to save space */
                    }
                    
                    /* Switches */
                    .glass-container > div:nth-child(3),
                    .glass-container > div:nth-child(4) {
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        width: 100%;
                        background: rgba(255,255,255,0.03);
                        padding: 10px;
                        border-radius: 8px;
                    }

                     .glass-container > div:nth-child(5) {
                        justify-content: center !important;
                        width: 100%;
                     }
                     
                     .glass-container > div:nth-child(5) button {
                        width: 100% !important;
                        justify-content: center;
                     }
                }
            `}</style>
        </div >
    );
};

export default UserManagement;
