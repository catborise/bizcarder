import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaUser, FaSignOutAlt, FaChevronDown, FaUsers, FaCog, FaClipboardList, FaTrash, FaMoon, FaSun, FaGlobe } from 'react-icons/fa';

const UserMenu = () => {
    const { t, i18n } = useTranslation('pages');
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
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
                    padding: '8px 12px',
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
                <span className="user-name-text" style={{ fontWeight: 500 }}>{user.displayName || user.username}</span>
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
                                    {user.role === 'admin' ? t('userMenu.roleBadge.admin') : t('userMenu.roleBadge.user')}
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
                                <span>{t('userMenu.activityLogs')}</span>
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
                                    <span>{t('userMenu.userManagement')}</span>
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
                                <span>{t('userMenu.settings')}</span>
                            </button>

                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    navigate('/trash');
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
                                <FaTrash size={16} />
                                <span>{t('userMenu.trashBin', 'Çöp Kutusu')}</span>
                            </button>

                            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '8px 0' }}></div>

                            <div style={{ display: 'flex', gap: '8px', padding: '4px 12px 8px' }}>
                                <button
                                    onClick={() => i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        backgroundColor: 'var(--glass-bg)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--glass-border)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                        borderRadius: '8px',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg)'}
                                >
                                    <FaGlobe size={14} />
                                    {i18n.language === 'tr' ? 'EN' : 'TR'}
                                </button>
                                <button
                                    onClick={toggleTheme}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        backgroundColor: 'var(--glass-bg)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--glass-border)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                        borderRadius: '8px',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg)'}
                                >
                                    {theme === 'dark' ? <FaSun size={14} /> : <FaMoon size={14} />}
                                    {theme === 'dark' ? 'Light' : 'Dark'}
                                </button>
                            </div>

                            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 0 8px' }}></div>

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
                                <span>{t('userMenu.logout')}</span>
                            </button>

                        </div>
                    </div>
                </>
            )}

        </div>
    );
};

export default UserMenu;
