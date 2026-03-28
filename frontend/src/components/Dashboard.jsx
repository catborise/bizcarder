import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icons from 'react-icons/fa';
import api, { API_URL as BASE_API_URL } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import ReminderModal from './ReminderModal';
import ConfirmModal from './ConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

const hexToRgba = (hex, alpha = 0.3) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const rgbaToHex = (rgba) => {
    if (!rgba || !rgba.startsWith('rgba')) return 'var(--accent-primary)';
    const parts = rgba.match(/(\d+)/g);
    if (!parts || parts.length < 3) return 'var(--accent-primary)';
    const r = parseInt(parts[0]).toString(16).padStart(2, '0');
    const g = parseInt(parts[1]).toString(16).padStart(2, '0');
    const b = parseInt(parts[2]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
};


const DynamicIcon = ({ name, size = 36 }) => {
    const IconComponent = Icons[name] || Icons.FaLink;
    return <IconComponent size={size} />;
};

const QuickSearch = ({ isAuthenticated }) => {
    const { t } = useTranslation('dashboard');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);
    const navigate = useNavigate();

    const search = useCallback(async (term) => {
        if (!term || term.length < 2) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await api.get('/api/cards', { params: { search: term, limit: 6 } });
            setResults(res.data?.cards || res.data || []);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 400);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.trim()) {
            navigate(`/contacts?search=${encodeURIComponent(query.trim())}`);
            setIsFocused(false);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!isAuthenticated) return null;

    const showDropdown = isFocused && (results.length > 0 || isSearching || query.length >= 2);

    return (
        <div ref={containerRef} style={{ position: 'relative', marginBottom: '30px' }}>
            <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
            }}>
                <div style={{
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <Icons.FaSearch style={{
                        position: 'absolute',
                        left: '16px',
                        color: isFocused ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                        transition: 'color 0.2s',
                        fontSize: '16px',
                        pointerEvents: 'none'
                    }} />
                    <input
                        type="text"
                        placeholder={t('search.placeholder')}
                        value={query}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        style={{
                            width: '100%',
                            padding: '14px 16px 14px 44px',
                            borderRadius: '14px',
                            border: isFocused ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(10px)',
                            color: 'var(--text-primary)',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxShadow: isFocused ? '0 0 0 3px rgba(var(--accent-primary-rgb), 0.15)' : 'var(--glass-shadow)'
                        }}
                    />
                    {isSearching && (
                        <div className="spinner" style={{
                            position: 'absolute',
                            right: '14px',
                            width: '18px',
                            height: '18px',
                            border: '2px solid var(--glass-border)',
                            borderTopColor: 'var(--accent-primary)',
                            borderRadius: '50%',
                            animation: 'spin 0.6s linear infinite'
                        }} />
                    )}
                </div>
                <button
                    onClick={() => navigate('/contacts')}
                    style={{
                        padding: '14px',
                        borderRadius: '14px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(10px)',
                        flexShrink: 0
                    }}
                    title={t('search.allContacts')}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-bg-hover)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                >
                    <Icons.FaAddressBook size={18} />
                </button>
            </div>

            {/* Dropdown Results */}
            {showDropdown && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '6px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '14px',
                    boxShadow: 'var(--glass-shadow-hover)',
                    zIndex: 50,
                    overflow: 'hidden',
                    backdropFilter: 'blur(20px)'
                }}>
                    {isSearching && results.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                            {t('search.searching')}
                        </div>
                    ) : results.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                            {t('search.noResults')}
                        </div>
                    ) : (
                        <>
                            {results.map((card) => (
                                <div
                                    key={card.id}
                                    onClick={() => {
                                        navigate(`/contacts?search=${encodeURIComponent(card.firstName + ' ' + card.lastName)}`);
                                        setIsFocused(false);
                                        setQuery('');
                                        setResults([]);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        borderBottom: '1px solid var(--glass-border)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Avatar / Logo */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        overflow: 'hidden'
                                    }}>
                                        {card.logoUrl ? (
                                            <img src={`${BASE_API_URL}${card.logoUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Icons.FaUser size={16} style={{ color: 'var(--text-tertiary)' }} />
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            color: 'var(--text-primary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {card.firstName} {card.lastName}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--text-tertiary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {[card.title, card.company].filter(Boolean).join(' - ') || card.email || card.phone || ''}
                                        </div>
                                    </div>
                                    {/* Lead status badge */}
                                    {card.leadStatus && card.leadStatus !== 'Cold' && (
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            flexShrink: 0,
                                            background: card.leadStatus === 'Hot' ? 'rgba(239,68,68,0.15)' :
                                                card.leadStatus === 'Warm' ? 'rgba(245,158,11,0.15)' :
                                                card.leadStatus === 'Converted' ? 'rgba(16,185,129,0.15)' :
                                                'rgba(59,130,246,0.15)',
                                            color: card.leadStatus === 'Hot' ? 'var(--accent-error)' :
                                                card.leadStatus === 'Warm' ? 'var(--accent-warning)' :
                                                card.leadStatus === 'Converted' ? 'var(--accent-success)' :
                                                'var(--accent-primary)'
                                        }}>
                                            {card.leadStatus}
                                        </span>
                                    )}
                                    <Icons.FaChevronRight size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                </div>
                            ))}
                            {results.length >= 6 && (
                                <div
                                    onClick={() => {
                                        navigate(`/contacts?search=${encodeURIComponent(query)}`);
                                        setIsFocused(false);
                                    }}
                                    style={{
                                        padding: '12px',
                                        textAlign: 'center',
                                        color: 'var(--accent-primary)',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {t('search.viewAll')}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const tileStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '25px',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    height: '160px',
    position: 'relative',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    overflow: 'hidden',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    boxShadow: 'var(--glass-shadow)'
};

const Dashboard = () => {
    const { t } = useTranslation(['dashboard', 'common']);
    const { theme } = useTheme();
    const [stats, setStats] = useState({ totalCards: 0 });
    const [tagStats, setTagStats] = useState([]);
    const [tiles, setTiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteConfirmTileId, setDeleteConfirmTileId] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [currentTile, setCurrentTile] = useState(null);
    const [settings, setSettings] = useState(null);
    const [dueReminders, setDueReminders] = useState([]);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        url: '',
        icon: 'FaLink',
        backgroundColor: 'rgba(96, 60, 186, 0.3)',
        order: 0,
        isInternal: true
    });

    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { showNotification } = useNotification();
    const isAdmin = user?.role === 'admin';

    const fetchData = async () => {
        setLoading(true);
        try {
            const urls = ['/api/cards/stats', '/api/db-tiles', '/api/settings'];
            if (isAuthenticated) {
                urls.push('/api/tags/stats');
                urls.push('/api/cards/due-reminders');
            }

            const responses = await Promise.all(
                urls.map(url => api.get(url).catch(err => {
                    console.warn(`${url} endpointinden veri alınamadı:`, err.message);
                    if (url === '/api/cards/stats') return { data: { totalCards: 0 } };
                    if (url === '/api/tags/stats') return { data: [] };
                    if (url === '/api/cards/due-reminders') return { data: [] };
                    if (url === '/api/db-tiles') return { data: [] };
                    return { data: null };
                }))
            );

            setStats(responses[0]?.data || { totalCards: 0 });
            setTiles(responses[1]?.data || []);
            setSettings(responses[2]?.data || null);

            if (isAuthenticated) {
                setTagStats(responses[3]?.data || []);
                if (responses[4]?.data) {
                    setDueReminders(responses[4].data);
                    if (responses[4].data.length > 0) {
                        setShowReminderModal(true);
                    }
                } else {
                    setDueReminders([]);
                }
            } else {
                setTagStats([]);
                setDueReminders([]);
            }
        } catch (error) {
            console.error("Data fetching error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isAuthenticated]);

    const handleSaveTile = async (e) => {
        e.preventDefault();
        try {
            if (currentTile) {
                await api.put(`/api/db-tiles/${currentTile.id}`, formData);
            } else {
                await api.post('/api/db-tiles', formData);
            }
            fetchData();
            showNotification(t('dashboard:tile.saved'), 'success');
        } catch (error) {
            showNotification(t('dashboard:tile.saveError', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    const handleDeleteTile = async () => {
        if (!deleteConfirmTileId) return;
        try {
            await api.delete(`/api/db-tiles/${deleteConfirmTileId}`);
            setDeleteConfirmTileId(null);
            fetchData();
            showNotification(t('dashboard:tile.deleted'), 'success');
        } catch (error) {
            showNotification(t('dashboard:tile.deleteError', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    const openModal = (tile = null) => {
        if (tile) {
            setCurrentTile(tile);
            setFormData({
                title: tile.title,
                subtitle: tile.subtitle || '',
                url: tile.url,
                icon: tile.icon,
                backgroundColor: tile.backgroundColor,
                order: tile.order,
                isInternal: tile.isInternal
            });
        } else {
            setCurrentTile(null);
            setFormData({
                title: '',
                subtitle: '',
                url: '',
                icon: 'FaLink',
                backgroundColor: 'rgba(96, 60, 186, 0.3)',
                order: tiles.length + 1,
                isInternal: true
            });
        }
        setShowModal(true);
    };


    const handleMouseEnter = (e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = 'var(--glass-shadow-hover)';
        e.currentTarget.style.background = 'var(--glass-bg-hover)';
        e.currentTarget.style.borderColor = 'var(--accent-primary)';
    };


    const handleMouseLeave = (e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
        e.currentTarget.style.background = 'var(--glass-bg)';
        e.currentTarget.style.borderColor = 'var(--glass-border)';
    };

    return (
        <div className="fade-in">
            {settings?.appBanner && (
                <div className="dashboard-banner" style={{
                    borderRadius: '24px',
                    overflow: 'hidden',
                    marginBottom: '40px',
                    position: 'relative',
                    boxShadow: 'var(--glass-shadow)',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: 'var(--bg-card)'
                }}>
                    <img
                        src={`${BASE_API_URL}${settings.appBanner}`}
                        alt="Banner"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: theme === 'dark' ? 'brightness(1.2) contrast(1.1) saturate(1.1)' : 'none',
                            opacity: theme === 'dark' ? 0.9 : 1,
                            transition: 'all 0.4s ease'
                        }}
                    />
                    <div className="dashboard-banner-content" style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '40px',
                        background: theme === 'dark'
                            ? 'linear-gradient(to top, rgba(2, 6, 23, 0.95) 0%, rgba(2, 6, 23, 0.4) 60%, transparent 100%)'
                            : 'linear-gradient(to top, var(--bg-card), transparent)',
                        color: theme === 'dark' ? '#f8fafc' : 'var(--text-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        zIndex: 2
                    }}>
                        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800' }}>
                            {settings.companyName || 'BizCarder'}
                        </h1>
                        <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                            {t('dashboard:banner.subtitle')}
                        </p>
                    </div>
                </div>
            )}
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h2 style={{
                    margin: 0,
                    fontWeight: '700',
                    fontSize: '2.5rem',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em'
                }}>
                    {t('dashboard:title')}
                </h2>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button
                            onClick={() => setEditMode(!editMode)}
                            style={{
                                padding: '10px 20px',
                                background: editMode
                                    ? 'var(--accent-primary)'
                                    : 'var(--glass-bg)',
                                color: editMode ? 'var(--bg-card)' : 'var(--text-primary)',
                                border: editMode ? 'none' : '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600',
                                transition: 'all 0.3s ease',
                                backdropFilter: 'blur(10px)',
                                boxShadow: editMode
                                    ? 'var(--glass-shadow-hover)'
                                    : 'var(--glass-shadow)'
                            }}
                            title={editMode ? t('dashboard:editMode.close') : t('dashboard:editMode.open')}
                        >
                            <Icons.FaTools size={16} />
                        </button>
                        <button
                            onClick={() => openModal()}
                            style={{
                                padding: '10px 20px',
                                background: 'var(--accent-primary)',
                                color: 'var(--bg-card)',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600',
                                boxShadow: 'var(--glass-shadow)',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Icons.FaPlus size={16} />
                            {t('dashboard:tile.add')}
                        </button>
                    </div>
                )}

            </div>

            {/* Quick Actions */}
            {isAuthenticated && (
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-6)',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={() => navigate('/contacts', { state: { openAddCard: true } })}
                        className="glass-button"
                        style={{
                            background: 'var(--gradient-primary)',
                            border: '1px solid var(--gradient-primary-border)',
                            color: '#e0e7ff',
                            fontWeight: 600,
                        }}
                    >
                        <Icons.FaPlus size={14} /> {t('dashboard:quickAddCard', 'Kart Ekle')}
                    </button>
                    <button
                        onClick={() => navigate('/contacts?filter=reminders')}
                        className="glass-button"
                        style={{
                            background: 'var(--gradient-warning)',
                            border: '1px solid var(--gradient-warning-border)',
                            color: 'var(--accent-warning)',
                            fontWeight: 600,
                        }}
                    >
                        <Icons.FaBell size={14} /> {t('dashboard:quickReminders', 'Hatırlatmalar')}
                    </button>
                    <button
                        onClick={() => navigate('/contacts?sort=newest')}
                        className="glass-button"
                        style={{
                            background: 'var(--gradient-blue)',
                            border: '1px solid var(--gradient-blue-border)',
                            color: 'var(--accent-primary)',
                            fontWeight: 600,
                        }}
                    >
                        <Icons.FaClock size={14} /> {t('dashboard:quickRecent', 'Son Eklenenler')}
                    </button>
                </div>
            )}

            {/* Hizli Arama */}
            <QuickSearch isAuthenticated={isAuthenticated} />

            {/* İstatistikler (Glass Container) */}
            <div className="dashboard-stats-grid stagger-enter" style={{ animationDelay: '0.1s' }}>
                {/* Total Cards */}
                <div style={{
                    background: 'var(--gradient-primary)',
                    border: '1px solid var(--gradient-primary-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--glass-shadow)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow)'; }}>
                    <div>
                        <p style={{
                            margin: '0 0 6px 0',
                            color: 'var(--accent-secondary)',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                        }}>
                            {t('dashboard:stats.registeredCards')}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {t('dashboard:stats.totalNetwork')}
                        </p>
                    </div>
                    <div style={{
                        fontSize: '4rem',
                        fontWeight: '800',
                        color: 'var(--accent-primary)',
                        lineHeight: '1',
                        letterSpacing: '-0.03em'
                    }}>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: '70px', height: '64px', borderRadius: '12px' }}></div>
                        ) : (
                            stats.totalCards
                        )}
                    </div>
                </div>

                {/* This Week */}
                <div style={{
                    background: 'var(--gradient-blue)',
                    border: '1px solid var(--gradient-blue-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--glass-shadow)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow)'; }}>
                    <div>
                        <p style={{
                            margin: '0 0 6px 0',
                            color: 'var(--accent-primary)',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                        }}>
                            {t('dashboard:stats.thisWeek', 'Bu Hafta')}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {t('dashboard:stats.newCards', 'Yeni Kartlar')}
                        </p>
                    </div>
                    <div style={{
                        fontSize: '4rem',
                        fontWeight: '800',
                        color: 'var(--accent-primary)',
                        lineHeight: '1',
                        letterSpacing: '-0.03em'
                    }}>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: '60px', height: '64px', borderRadius: '12px' }}></div>
                        ) : (
                            stats.thisWeek ?? 0
                        )}
                    </div>
                </div>

                {/* Reminders */}
                <div style={{
                    background: 'var(--gradient-warning)',
                    border: '1px solid var(--gradient-warning-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--glass-shadow)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: 'pointer',
                }}
                onClick={() => navigate('/contacts?filter=reminders')}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow)'; }}>
                    <div>
                        <p style={{
                            margin: '0 0 6px 0',
                            color: 'var(--accent-warning)',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                        }}>
                            {t('dashboard:stats.reminders', 'Hatırlatmalar')}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {t('dashboard:stats.dueToday', 'Bugün Vadesi Dolan')}
                        </p>
                    </div>
                    <div style={{
                        fontSize: '4rem',
                        fontWeight: '800',
                        color: 'var(--accent-warning)',
                        lineHeight: '1',
                        letterSpacing: '-0.03em'
                    }}>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: '50px', height: '64px', borderRadius: '12px' }}></div>
                        ) : (
                            dueReminders.length
                        )}
                    </div>
                </div>

                {/* Follow-ups */}
                <div style={{
                    background: 'var(--gradient-success)',
                    border: '1px solid var(--gradient-success-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--glass-shadow)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow)'; }}>
                    <div>
                        <p style={{
                            margin: '0 0 6px 0',
                            color: 'var(--accent-success)',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                        }}>
                            {t('dashboard:stats.followUps', 'Takipler')}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {t('dashboard:stats.activeFollowUps', 'Aktif Takipler')}
                        </p>
                    </div>
                    <div style={{
                        fontSize: '4rem',
                        fontWeight: '800',
                        color: 'var(--accent-success)',
                        lineHeight: '1',
                        letterSpacing: '-0.03em'
                    }}>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: '50px', height: '64px', borderRadius: '12px' }}></div>
                        ) : (
                            stats.followUps ?? 0
                        )}
                    </div>
                </div>

                <div style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    padding: '25px',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--glass-shadow)',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', letterSpacing: '-0.01em' }}>{t('dashboard:stats.frequentTags')}</h3>
                        <Link to="/contacts" style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--accent-primary)', textDecoration: 'none' }}>{t('dashboard:stats.viewAll')}</Link>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="skeleton-box" style={{ width: '80px', height: '34px', borderRadius: '12px' }}></div>
                            ))
                        ) : (
                            tagStats.length > 0 ? (
                                tagStats.map((tag, index) => (
                                    <Link 
                                        key={tag.id} 
                                        to={`/contacts?tagId=${tag.id}`}
                                        className="stagger-enter"
                                        style={{ 
                                            padding: '8px 16px', 
                                            borderRadius: '12px', 
                                            background: tag.color + '1A', // %10 alpha for background
                                            border: `1px solid ${tag.color}40`,
                                            color: 'var(--text-primary)',
                                            textDecoration: 'none',
                                            fontSize: '0.95rem',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s ease',
                                            animationDelay: `${index * 0.05}s`
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = tag.color + '33';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = tag.color + '1A';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.color }}></span>
                                        {tag.name}
                                        <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: '600' }}>({tag.getDataValue ? tag.getDataValue('cardCount') : tag.cardCount})</span>
                                    </Link>
                                ))
                            ) : (
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.95rem' }}>{t('dashboard:stats.noTags')}</p>
                            )
                        )}
                    </div>
                </div>
            </div>


            {/* Core Application Tiles - Always at top, under stats */}
            <div className="dashboard-tiles-grid-3col stagger-enter" style={{
                marginBottom: '40px',
                animationDelay: '0.2s'
            }}>
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={`skel-c-${i}`} className="skeleton-box" style={{ height: '160px', borderRadius: '16px' }}></div>
                    ))
                ) : (
                    tiles
                        .filter(t => ['/contacts', '/logs', '/import'].includes(t.url))
                        .map((tile, i) => (
                            <div key={tile.id} className="stagger-enter" style={{ position: 'relative', animationDelay: `${i * 0.1}s` }}>
                                <Link
                                    to={tile.url}
                                    style={{ ...tileStyle, background: tile.backgroundColor }}
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <div style={{
                                        display: 'inline-flex',
                                        padding: '12px',
                                        background: 'var(--glass-bg)',
                                        borderRadius: '12px',
                                        width: 'fit-content',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <DynamicIcon name={tile.icon} />
                                    </div>
                                    <div>
                                        <span style={{
                                            fontSize: '1.6rem',
                                            display: 'block',
                                            fontWeight: '700',
                                            marginBottom: '6px',
                                            letterSpacing: '-0.02em'
                                        }}>
                                            {tile.title}
                                        </span>
                                        <span style={{
                                            fontSize: '0.95rem',
                                            color: 'var(--text-secondary)',
                                            fontWeight: '500'
                                        }}>
                                            {tile.subtitle}
                                        </span>
                                    </div>
                                </Link>
                            </div>
                        ))
                )}
            </div>

            {/* Custom/Other Tiles Grid */}
            <div className="dashboard-tiles-grid stagger-enter" style={{ animationDelay: '0.3s' }}>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                         <div key={`skel-o-${i}`} className="skeleton-box" style={{ height: '160px', borderRadius: '16px' }}></div>
                    ))
                ) : (
                    tiles
                        .filter(t => !['/contacts', '/logs', '/import'].includes(t.url))
                        .map((tile, i) => {
                            const TileWrapper = tile.isInternal ? Link : 'a';
                            const wrapperProps = tile.isInternal ? { to: tile.url } : { href: tile.url, target: tile.url.startsWith('http') ? '_blank' : '_self' };

                            return (
                                <div key={tile.id} className="stagger-enter" style={{ position: 'relative', animationDelay: `${i * 0.08}s` }}>
                                    <TileWrapper
                                        {...wrapperProps}
                                        style={{ ...tileStyle, background: tile.backgroundColor }}
                                        onMouseEnter={handleMouseEnter}
                                        onMouseLeave={handleMouseLeave}
                                        onClick={(e) => {
                                            if (tile.url === '#') e.preventDefault();
                                        }}
                                    >
                                        <div style={{
                                            display: 'inline-flex',
                                            padding: '12px',
                                            background: 'var(--glass-bg)',
                                            borderRadius: '12px',
                                            width: 'fit-content',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <DynamicIcon name={tile.icon} />
                                        </div>
                                        <div>
                                            <span style={{
                                                fontSize: '1.4rem',
                                                display: 'block',
                                                fontWeight: '700',
                                                marginBottom: '6px',
                                                letterSpacing: '-0.02em'
                                            }}>
                                                {tile.title}
                                            </span>
                                            <span style={{
                                                fontSize: '0.9rem',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                {tile.subtitle}
                                            </span>
                                        </div>
                                    </TileWrapper>
                                {isAdmin && editMode && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        display: 'flex',
                                        gap: '5px',
                                        zIndex: 5
                                    }}>
                                        <button
                                            onClick={() => openModal(tile)}
                                            style={{
                                                background: 'var(--glass-bg)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'var(--text-primary)',
                                                padding: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                backdropFilter: 'blur(5px)'
                                            }}
                                            title={t('dashboard:tile.edit')}
                                        >
                                            <Icons.FaEdit size={14} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmTileId(tile.id)}
                                            style={{
                                                background: 'var(--accent-error)',
                                                opacity: 0.8,
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'white',
                                                padding: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                backdropFilter: 'blur(5px)'
                                            }}
                                            title={t('dashboard:tile.delete')}
                                        >
                                            <Icons.FaTrash size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Yönetim Modalı */}
            {showModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setShowModal(false)}
                    title={currentTile ? t('dashboard:tile.editTitle') : t('dashboard:tile.addTitle')}
                >
                    <form onSubmit={handleSaveTile} style={{ color: 'var(--text-primary)' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.title')}</label>
                            <input
                                type="text"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)'
                                }}
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.subtitle')}</label>
                            <input
                                type="text"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)'
                                }}
                                value={formData.subtitle}
                                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.url')}</label>
                            <input
                                type="text"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)'
                                }}
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                placeholder={t('dashboard:tile.form.urlPlaceholder')}
                                required
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.icon')}</label>
                                <input
                                    type="text"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)'
                                    }}
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.color')}</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            padding: '0',
                                            border: 'none',
                                            borderRadius: '8px',
                                            background: 'transparent',
                                            cursor: 'pointer'
                                        }}
                                        value={rgbaToHex(formData.backgroundColor)}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            backgroundColor: hexToRgba(e.target.value)
                                        })}
                                    />
                                    <input
                                        type="text"
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.85rem'
                                        }}
                                        value={formData.backgroundColor}
                                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.order')}</label>
                                <input
                                    type="number"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)'
                                    }}
                                    value={formData.order}
                                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '25px' }}>
                                <input
                                    type="checkbox"
                                    id="isInternal"
                                    checked={formData.isInternal}
                                    onChange={(e) => setFormData({ ...formData, isInternal: e.target.checked })}
                                    style={{ marginRight: '10px' }}
                                />
                                <label htmlFor="isInternal">{t('dashboard:tile.form.isInternal')}</label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: '10px 20px',
                                    background: 'transparent',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {t('common:cancel')}
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '10px 20px',
                                    background: 'var(--accent-primary)',
                                    color: 'var(--bg-card)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                {currentTile ? t('common:update') : t('common:add')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}


            {/* Reminder Modal */}
            {showReminderModal && (
                <ReminderModal
                    reminders={dueReminders}
                    onClose={() => setShowReminderModal(false)}
                    onRefresh={fetchData}
                />
            )}

            <ConfirmModal 
                isOpen={!!deleteConfirmTileId}
                onClose={() => setDeleteConfirmTileId(null)}
                onConfirm={handleDeleteTile}
                title={t('dashboard:tile.deleteConfirmTitle')}
                message={t('dashboard:tile.deleteConfirmMessage')}
            />
        </div>
    );
};

export default Dashboard;
