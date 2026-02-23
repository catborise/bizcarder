import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaSignOutAlt, FaChevronDown, FaUsers, FaCog, FaClipboardList } from 'react-icons/fa';

const UserMenu = () => {
    const { user, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    if (!user) return null;

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: 'var(--glass-bg)',
                    backdropFilter: 'blur(10px)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--glass-shadow)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--glass-bg-hover)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--glass-bg)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <FaUser size={16} />
                <span style={{ fontWeight: 500 }}>{user.displayName || user.username}</span>
                <FaChevronDown size={12} style={{
                    transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    opacity: 0.7
                }} />
            </button>

            {showDropdown && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 998
                        }}
                        onClick={() => setShowDropdown(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '10px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        minWidth: '220px',
                        boxShadow: 'var(--glass-shadow)',
                        zIndex: 999,
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease'
                    }}>
                        <div style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--glass-border)',
                            background: 'var(--glass-bg)'
                        }}>

                            <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}>
                                {user.displayName || user.username}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {user.email}
                            </div>
                            {user.role && (
                                <div style={{
                                    fontSize: '11px',
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: user.role === 'admin' ? 'var(--accent-primary-transparent)' : 'var(--glass-bg)',
                                    color: user.role === 'admin' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    marginTop: '8px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    border: `1px solid ${user.role === 'admin' ? 'var(--accent-primary)' : 'var(--glass-border)'}`
                                }}>
                                    {user.role === 'admin' ? '👑 Admin' : '👤 Kullanıcı'}
                                </div>
                            )}

                        </div>

                        <div style={{ padding: '8px' }}>
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    navigate('/logs');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s ease',
                                    borderRadius: '8px',
                                    textAlign: 'left'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <FaClipboardList size={16} />
                                <span>İşlem Kayıtları</span>
                            </button>

                            {user.role === 'admin' && (
                                <button
                                    onClick={() => {
                                        setShowDropdown(false);
                                        navigate('/users');
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-primary)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        transition: 'all 0.2s ease',
                                        borderRadius: '8px',
                                        textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <FaUsers size={16} />
                                    <span>Kullanıcı Yönetimi</span>
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    navigate('/settings');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s ease',
                                    borderRadius: '8px',
                                    textAlign: 'left'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <FaCog size={16} />
                                <span>Ayarlar</span>
                            </button>

                            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '8px 0' }}></div>

                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--accent-error)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s ease',
                                    borderRadius: '8px',
                                    textAlign: 'left'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--accent-error-transparent)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <FaSignOutAlt size={16} />
                                <span>Oturumu Kapat</span>
                            </button>

                        </div>
                    </div>
                </>
            )}

        </div>
    );
};

export default UserMenu;
