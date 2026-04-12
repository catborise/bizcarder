import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/Modal';
import {
    FaSearch,
    FaUsers,
    FaUserShield,
    FaUser,
    FaCheck,
    FaKey,
    FaTimesCircle,
    FaLock,
    FaSave,
    FaTimes,
    FaTrash,
    FaExchangeAlt,
} from 'react-icons/fa';

const UserManagement = () => {
    const { t, i18n } = useTranslation(['users', 'common']);
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
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

        try {
            await api.put(`/api/users/${userId}/role`, { role: newRole });
        } catch (err) {
            console.error('Role update failed:', err);
            setUsers(originalUsers); // Revert on failure
            showNotification(t('users:roleUpdateError'), 'error');
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
            showNotification(t('users:passwordMinLength'), 'warning');
            return;
        }

        setPasswordLoading(true);
        try {
            await api.put(`/api/users/${selectedUser.id}/password`, { newPassword });
            showNotification(t('users:passwordUpdated'), 'success');
            setIsPasswordModalOpen(false);
            setSelectedUser(null);
            setNewPassword('');
        } catch (err) {
            console.error('Password reset failed:', err);
            showNotification(
                t('users:passwordResetError', { error: err.response?.data?.error || err.message }),
                'error',
            );
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleApprove = async (userId, currentStatus) => {
        // Optimistic UI update
        const originalUsers = [...users];
        setUsers(users.map((u) => (u.id === userId ? { ...u, isApproved: !currentStatus } : u)));

        try {
            await api.put(`/api/users/${userId}/approve`, { isApproved: !currentStatus });
        } catch (err) {
            console.error('Approval failed:', err);
            setUsers(originalUsers); // Revert
            showNotification(t('users:approvalError', { error: err.response?.data?.error || err.message }), 'error');
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
                data: { transferCards }, // axios delete body needs 'data' key
            });

            showNotification(t('users:userDeleted'), 'success');
            setUsers(users.filter((u) => u.id !== userToDelete.id)); // Remove from list
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } catch (err) {
            console.error('User deletion failed:', err);
            showNotification(t('users:userDeleteError', { error: err.response?.data?.error || err.message }), 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'approved' && user.isApproved) ||
            (statusFilter === 'pending' && !user.isApproved);

        return matchesSearch && matchesRole && matchesStatus;
    });

    if (loading)
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <div className="spinner"></div>
            </div>
        );

    return (
        <div className="fade-in usermgmt-page">
            {/* Header */}
            <div className="usermgmt-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <FaUsers size={24} color="var(--accent-primary)" /> {t('users:title')}
                </h2>
                <div
                    style={{
                        background: 'var(--accent-primary-transparent)',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                    }}
                >
                    <span style={{ fontWeight: 'bold' }}>{filteredUsers.length}</span>
                    <span style={{ opacity: 0.8 }}>{t('users:listing')}</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-container usermgmt-filters">
                <div className="usermgmt-search">
                    <FaSearch
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            opacity: 0.5,
                            color: 'var(--text-primary)',
                        }}
                    />
                    <input
                        type="text"
                        placeholder={t('users:searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            paddingLeft: '36px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--glass-border)',
                            height: '40px',
                            fontSize: '0.9rem',
                            color: 'var(--text-primary)',
                            borderRadius: '8px',
                        }}
                    />
                </div>
                <div className="usermgmt-filter-selects">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            height: '40px',
                            cursor: 'pointer',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '0 10px',
                            fontSize: '0.85rem',
                        }}
                    >
                        <option value="all">{t('users:filter.roleAll')}</option>
                        <option value="admin">{t('users:filter.admin')}</option>
                        <option value="user">{t('users:filter.user')}</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            height: '40px',
                            cursor: 'pointer',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '0 10px',
                            fontSize: '0.85rem',
                        }}
                    >
                        <option value="all">{t('users:filter.statusAll')}</option>
                        <option value="approved">{t('users:filter.approved')}</option>
                        <option value="pending">{t('users:filter.pending')}</option>
                    </select>
                </div>
            </div>

            {/* List Header - Desktop Only */}
            <div className="usermgmt-list-header">
                <div>{t('users:table.userInfo')}</div>
                <div>{t('users:table.memberDate')}</div>
                <div style={{ textAlign: 'center' }}>{t('users:table.accountApproval')}</div>
                <div style={{ textAlign: 'center' }}>{t('users:table.adminAuthority')}</div>
                <div style={{ textAlign: 'right' }}>{t('users:table.actions')}</div>
            </div>

            {/* Users List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                        <div
                            key={u.id}
                            className="glass-container usermgmt-card"
                            style={{
                                borderLeft:
                                    u.role === 'admin' ? '3px solid var(--accent-warning)' : '3px solid transparent',
                            }}
                        >
                            {/* User Info */}
                            <div className="usermgmt-user-info">
                                <div
                                    style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        background:
                                            u.role === 'admin'
                                                ? 'linear-gradient(135deg, rgba(245,158,11,0.8), rgba(217,119,6,0.8))'
                                                : 'linear-gradient(135deg, rgba(59,130,246,0.8), rgba(37,99,235,0.8))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        color: 'var(--bg-card)',
                                        fontSize: '1rem',
                                    }}
                                >
                                    {u.displayName?.substring(0, 1).toUpperCase() ||
                                        u.username?.substring(0, 1).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        {u.displayName}
                                        {u.id === currentUser.id && (
                                            <span
                                                style={{
                                                    fontSize: '0.65rem',
                                                    marginLeft: '6px',
                                                    background: 'var(--glass-bg)',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    color: 'var(--text-tertiary)',
                                                    border: '1px solid var(--glass-border)',
                                                }}
                                            >
                                                {t('users:youBadge')}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {u.email}
                                    </div>
                                </div>
                            </div>

                            {/* Date Info */}
                            <div className="usermgmt-date">
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    @{u.username}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                    {new Date(u.createdAt).toLocaleDateString(
                                        i18n.language === 'tr' ? 'tr-TR' : 'en-US',
                                        { year: 'numeric', month: 'short', day: 'numeric' },
                                    )}
                                </span>
                            </div>

                            {/* Switches Row (mobile: inline) */}
                            <div className="usermgmt-switches">
                                <div className="usermgmt-switch-item">
                                    <label
                                        className="switch"
                                        title={u.isApproved ? t('users:suspendAccount') : t('users:approveAccount')}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={u.isApproved}
                                            onChange={() =>
                                                currentUser.id !== u.id && handleApprove(u.id, u.isApproved)
                                            }
                                            disabled={currentUser.id === u.id}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                    <span
                                        style={{
                                            fontSize: '0.7rem',
                                            color: u.isApproved ? 'var(--accent-success)' : 'var(--accent-error)',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                        }}
                                    >
                                        {u.isApproved ? (
                                            <>
                                                <FaCheck size={9} /> {t('users:status.approved')}
                                            </>
                                        ) : (
                                            <>
                                                <FaTimesCircle size={9} /> {t('users:status.pending')}
                                            </>
                                        )}
                                    </span>
                                </div>
                                <div className="usermgmt-switch-item">
                                    <label
                                        className="switch"
                                        title={u.role === 'admin' ? t('users:revokeAdmin') : t('users:makeAdmin')}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={u.role === 'admin'}
                                            onChange={() => currentUser.id !== u.id && handleRoleChange(u.id, u.role)}
                                            disabled={currentUser.id === u.id}
                                        />
                                        <span className="slider role-switch"></span>
                                    </label>
                                    <span
                                        style={{
                                            fontSize: '0.7rem',
                                            color:
                                                u.role === 'admin' ? 'var(--accent-warning)' : 'var(--text-tertiary)',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                        }}
                                    >
                                        {u.role === 'admin' ? (
                                            <>
                                                <FaUserShield size={9} /> {t('users:role.admin')}
                                            </>
                                        ) : (
                                            <>
                                                <FaUser size={9} /> {t('users:role.user')}
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="usermgmt-actions">
                                {u.id !== currentUser.id && (
                                    <>
                                        <button
                                            onClick={() => openPasswordModal(u)}
                                            title={t('users:resetPassword')}
                                            className="glass-button-square"
                                        >
                                            <FaKey size={13} />
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(u)}
                                            title={t('users:deleteUser')}
                                            className="glass-button-square"
                                            style={{ color: 'var(--accent-error)' }}
                                        >
                                            <FaTrash size={13} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div
                        className="glass-container"
                        style={{
                            textAlign: 'center',
                            padding: 'var(--space-12)',
                            color: 'var(--text-tertiary)',
                            flexDirection: 'column',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <FaSearch size={40} style={{ marginBottom: 'var(--space-4)', opacity: 0.3 }} />
                        <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                            {t('users:noResults')}
                        </h3>
                        <p style={{ fontSize: '0.9rem' }}>{t('users:noResultsDescription')}</p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setRoleFilter('all');
                                setStatusFilter('all');
                            }}
                            style={{
                                marginTop: 'var(--space-4)',
                                color: 'var(--accent-primary)',
                                background: 'transparent',
                                border: 'none',
                                textDecoration: 'underline',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                            }}
                        >
                            {t('users:clearFilters')}
                        </button>
                    </div>
                )}
            </div>

            {/* Password Reset Modal */}
            <Modal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                title={t('users:resetPassword')}
            >
                <form
                    onSubmit={handlePasswordSave}
                    style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}
                >
                    <div
                        style={{
                            padding: '15px',
                            background: 'var(--accent-primary-transparent)',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: 'var(--bg-card)',
                            }}
                        >
                            {selectedUser?.displayName?.substring(0, 1).toUpperCase() ||
                                selectedUser?.username?.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {selectedUser?.displayName}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                @{selectedUser?.username}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '8px',
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                            }}
                        >
                            {t('users:newPasswordLabel')}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <FaLock
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-tertiary)',
                                }}
                            />
                            <input
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t('users:newPasswordPlaceholder')}
                                style={{
                                    width: '100%',
                                    paddingLeft: '36px',
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--glass-border)',
                                    height: '45px',
                                    color: 'var(--text-primary)',
                                    borderRadius: '8px',
                                }}
                                autoFocus
                            />
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '5px' }}>
                            {t('users:passwordHint')}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setIsPasswordModalOpen(false)}
                            style={{
                                padding: '10px 20px',
                                background: 'transparent',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => (e.target.style.background = 'var(--glass-bg-hover)')}
                            onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                        >
                            <FaTimes /> {t('common:cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!newPassword || passwordLoading}
                            style={{
                                padding: '10px 20px',
                                background: 'var(--accent-primary)',
                                border: 'none',
                                color: 'var(--bg-card)',
                                borderRadius: '8px',
                                cursor: !newPassword || passwordLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !newPassword || passwordLoading ? 0.7 : 1,
                                transition: 'all 0.2s',
                                fontWeight: 'bold',
                                boxShadow: 'var(--glass-shadow)',
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
                            {passwordLoading ? (
                                <div
                                    className="spinner"
                                    style={{ width: '16px', height: '16px', borderWidth: '2px' }}
                                ></div>
                            ) : (
                                <FaSave />
                            )}
                            {passwordLoading ? t('common:saving') : t('users:updatePassword')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t('users:deleteUser')}>
                <div style={{ padding: '10px', width: '100%' }}>
                    <div
                        style={{
                            padding: '15px',
                            background: 'var(--accent-error-transparent)',
                            border: '1px solid var(--accent-error)',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                        }}
                    >
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--accent-error)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <FaTrash color="var(--bg-card)" size={18} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>
                                {t('users:deleteConfirmTitle')}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {t('users:deleteConfirmMessage', {
                                    displayName: userToDelete?.displayName,
                                    username: userToDelete?.username,
                                })}
                            </p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                            {t('users:deleteCardQuestion')}
                        </p>

                        <div style={{ display: 'grid', gap: '10px' }}>
                            <button
                                onClick={() => handleDeleteUser(true)}
                                disabled={deleteLoading}
                                style={{
                                    padding: '12px',
                                    background: 'var(--accent-primary-transparent)',
                                    border: '1px solid var(--accent-primary)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    opacity: deleteLoading ? 0.7 : 1,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--accent-primary)';
                                    e.currentTarget.style.color = 'var(--bg-card)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--accent-primary-transparent)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }}
                            >
                                <div
                                    style={{
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                    }}
                                >
                                    <FaExchangeAlt size={16} color="var(--accent-primary)" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                        {t('users:transferAndDelete')}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                        {t('users:transferDescription')}
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleDeleteUser(false)}
                                disabled={deleteLoading}
                                style={{
                                    padding: '12px',
                                    background: 'var(--accent-error-transparent)',
                                    border: '1px solid var(--accent-error)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    opacity: deleteLoading ? 0.7 : 1,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--accent-error)';
                                    e.currentTarget.style.color = 'var(--bg-card)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--accent-error-transparent)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }}
                            >
                                <div
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                    }}
                                >
                                    <FaTrash size={16} color="var(--accent-error)" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                        {t('users:deleteWithCards')}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                        {t('users:deleteWithCardsDescription')}
                                    </div>
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
                                border: '1px solid var(--glass-border)',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                            }}
                        >
                            {t('common:cancel')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;
