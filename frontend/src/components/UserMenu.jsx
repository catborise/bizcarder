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
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
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
                        backgroundColor: '#1f1f1f',
                        border: '1px solid #444',
                        borderRadius: '12px',
                        minWidth: '220px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        zIndex: 999,
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease'
                    }}>
                        <div style={{
                            padding: '16px',
                            borderBottom: '1px solid #333',
                            background: 'rgba(255,255,255,0.03)'
                        }}>
                            <div style={{ fontSize: '15px', color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>
                                {user.displayName || user.username}
                            </div>
                            <div style={{ fontSize: '12px', color: '#888' }}>
                                {user.email}
                            </div>
                            {user.role && (
                                <div style={{
                                    fontSize: '11px',
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: user.role === 'admin' ? 'rgba(100, 108, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                    color: user.role === 'admin' ? '#8888ff' : '#aaa',
                                    marginTop: '8px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    border: `1px solid ${user.role === 'admin' ? 'rgba(100, 108, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                                }}>
                                    {user.role === 'admin' ? '👑 Admin' : '👤 Kullanıcı'}
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '8px' }}>
                            {/* İşlem Kayıtları (Herkes görebilir) */}
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    navigate('/logs');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'transparent',
                                    color: '#eee',
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
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <FaClipboardList size={16} color="#aaa" />
                                <span>İşlem Kayıtları</span>
                            </button>

                            {/* Admin Linkleri */}
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
                                        color: '#eee',
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
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <FaUsers size={16} color="#aaa" />
                                    <span>Kullanıcı Yönetimi</span>
                                </button>
                            )}

                            {/* Ayarlar (Herkes görebilir) */}
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    navigate('/settings');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'transparent',
                                    color: '#eee',
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
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <FaCog size={16} color="#aaa" />
                                <span>Ayarlar</span>
                            </button>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }}></div>

                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'transparent',
                                    color: '#ff6b6b',
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
                                    e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
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
