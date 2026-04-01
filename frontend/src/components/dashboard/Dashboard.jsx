import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icons from 'react-icons/fa';
import api, { API_URL as BASE_API_URL } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import ReminderModal from '../shared/ReminderModal';
import ConfirmModal from '../shared/ConfirmModal';
import { useTheme } from '../../context/ThemeContext';
import QuickSearch from './QuickSearch';
import TileFormModal from './TileFormModal';
import useTiles from '../../hooks/useTiles';

const DynamicIcon = ({ name, size = 36 }) => {
    const IconComponent = Icons[name] || Icons.FaLink;
    return <IconComponent size={size} />;
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
    background: 'var(--glass-bg-solid)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    boxShadow: 'var(--glass-shadow)'
};

const Dashboard = () => {
    const { t } = useTranslation(['dashboard', 'common']);
    const { theme } = useTheme();
    const [stats, setStats] = useState({ totalCards: 0 });
    const [tagStats, setTagStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [settings, setSettings] = useState(null);
    const [dueReminders, setDueReminders] = useState([]);
    const [showReminderModal, setShowReminderModal] = useState(false);

    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const isAdmin = user?.role === 'admin';

    const {
        tiles,
        setTiles,
        showModal,
        setShowModal,
        currentTile,
        formData,
        setFormData,
        deleteConfirmId,
        setDeleteConfirmId,
        openModal,
        handleSaveTile,
        handleDeleteTile,
    } = useTiles();

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
                            color: 'var(--accent-secondary)',
                            fontWeight: 600,
                        }}
                    >
                        <Icons.FaPlus size={14} /> {t('dashboard:quickAddCard')}
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
                        <Icons.FaBell size={14} /> {t('dashboard:quickReminders')}
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
                        <Icons.FaClock size={14} /> {t('dashboard:quickRecent')}
                    </button>
                </div>
            )}

            {/* Quick Search */}
            <QuickSearch isAuthenticated={isAuthenticated} />

            {/* Stats Grid */}
            <div className="dashboard-stats-grid stagger-enter" style={{ animationDelay: '0.1s' }}>
                {/* Total Cards */}
                <div className="hover-lift" style={{
                    background: 'var(--gradient-primary)',
                    border: '1px solid var(--gradient-primary-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--glass-shadow)',
                }}>
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
                <div className="hover-lift" style={{
                    background: 'var(--gradient-blue)',
                    border: '1px solid var(--gradient-blue-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--glass-shadow)',
                }}>
                    <div>
                        <p style={{
                            margin: '0 0 6px 0',
                            color: 'var(--accent-primary)',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                        }}>
                            {t('dashboard:stats.thisWeek')}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {t('dashboard:stats.newCards')}
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
                <div className="hover-lift" style={{
                    background: 'var(--gradient-warning)',
                    border: '1px solid var(--gradient-warning-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--glass-shadow)',
                    cursor: 'pointer',
                }}
                onClick={() => navigate('/contacts?filter=reminders')}>
                    <div>
                        <p style={{
                            margin: '0 0 6px 0',
                            color: 'var(--accent-warning)',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                        }}>
                            {t('dashboard:stats.reminders')}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {t('dashboard:stats.dueToday')}
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
                <div className="hover-lift" style={{
                    background: 'var(--gradient-success)',
                    border: '1px solid var(--gradient-success-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--glass-shadow)',
                }}>
                    <div>
                        <p style={{
                            margin: '0 0 6px 0',
                            color: 'var(--accent-success)',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                        }}>
                            {t('dashboard:stats.followUps')}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {t('dashboard:stats.activeFollowUps')}
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
            </div>

            {/* Frequent Tags - compact row below stats */}
            {!loading && tagStats.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    flexWrap: 'wrap',
                    marginBottom: 'var(--space-6)',
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                    }}>
                        {t('dashboard:stats.frequentTags')}
                    </span>
                    {tagStats.slice(0, 8).map((tag) => (
                        <Link
                            key={tag.id}
                            to={`/contacts?tagId=${tag.id}`}
                            className="hover-lift"
                            style={{
                                padding: '4px 12px',
                                borderRadius: '6px',
                                background: tag.color + '1A',
                                border: `1px solid ${tag.color}40`,
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = tag.color + '33'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = tag.color + '1A'; }}
                        >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tag.color }} />
                            {tag.name}
                            <span style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>
                                {tag.getDataValue ? tag.getDataValue('cardCount') : tag.cardCount}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            {/* Core Application Tiles - compact nav shortcuts */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-6)',
            }} className="stagger-enter dashboard-core-tiles">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={`skel-c-${i}`} className="skeleton-box" style={{ height: '70px', borderRadius: '12px' }}></div>
                    ))
                ) : (
                    tiles
                        .filter(t => ['/contacts', '/logs', '/import'].includes(t.url))
                        .map((tile, i) => (
                            <Link
                                key={tile.id}
                                to={tile.url}
                                className="stagger-enter hover-lift"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-4)',
                                    background: 'var(--glass-bg-solid)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    color: 'var(--text-primary)',
                                    boxShadow: 'var(--glass-shadow)',
                                    animationDelay: `${i * 0.08}s`,
                                }}
                            >
                                <div style={{
                                    width: '40px', height: '40px',
                                    background: tile.backgroundColor || 'var(--gradient-primary)',
                                    borderRadius: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, color: '#fff',
                                }}>
                                    <DynamicIcon name={tile.icon} size={18} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2 }}>{tile.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>{tile.subtitle}</div>
                                </div>
                            </Link>
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
                        .filter(t => !['/contacts', '/logs', '/import', '/about'].includes(t.url))
                        .map((tile, i) => {
                            const TileWrapper = tile.isInternal ? Link : 'a';
                            const wrapperProps = tile.isInternal ? { to: tile.url } : { href: tile.url, target: tile.url.startsWith('http') ? '_blank' : '_self' };

                            return (
                                <div key={tile.id} className="stagger-enter" style={{ position: 'relative', animationDelay: `${i * 0.08}s` }}>
                                    <TileWrapper
                                        {...wrapperProps}
                                        className="hover-lift"
                                        style={{ ...tileStyle, background: tile.backgroundColor }}
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
                                            border: '1px solid var(--glass-border)'
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
                                                onClick={() => setDeleteConfirmId(tile.id)}
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

            {/* Tile Form Modal */}
            <TileFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                currentTile={currentTile}
                formData={formData}
                setFormData={setFormData}
                onSave={handleSaveTile}
            />

            {/* Reminder Modal */}
            {showReminderModal && (
                <ReminderModal
                    reminders={dueReminders}
                    onClose={() => setShowReminderModal(false)}
                    onRefresh={fetchData}
                />
            )}

            {/* Delete Confirm Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDeleteTile}
                title={t('dashboard:tile.deleteConfirmTitle')}
                message={t('dashboard:tile.deleteConfirmMessage')}
            />
        </div>
    );
};

export default Dashboard;
