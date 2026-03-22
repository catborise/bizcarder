import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Icons from 'react-icons/fa';
import api from '../api/axios';
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
            const urls = ['/api/cards/stats', '/api/db-tiles', '/api/settings', '/api/tags/stats'];
            if (isAuthenticated) {
                urls.push('/api/cards/due-reminders');
            }

            const responses = await Promise.all(urls.map(url => api.get(url)));

            setStats(responses[0].data);
            setTiles(responses[1].data);
            setSettings(responses[2].data);
            setTagStats(responses[3].data);

            if (isAuthenticated && responses[4]) {
                setDueReminders(responses[4].data);
                if (responses[4].data.length > 0) {
                    setShowReminderModal(true);
                }
            } else {
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
            showNotification('Kutucuk başarıyla kaydedildi.', 'success');
        } catch (error) {
            showNotification('Kaydedilirken hata oluştu: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handleDeleteTile = async () => {
        if (!deleteConfirmTileId) return;
        try {
            await api.delete(`/api/db-tiles/${deleteConfirmTileId}`);
            setDeleteConfirmTileId(null);
            fetchData();
            showNotification('Kutucuk silindi.', 'success');
        } catch (error) {
            showNotification('Silinirken hata oluştu: ' + (error.response?.data?.error || error.message), 'error');
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

    const API_URL = api.defaults.baseURL || 'http://localhost:5000';

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
                        src={`${API_URL}${settings.appBanner}`}
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
                            Kurumsal Kartvizit Yönetim Sistemi
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
                    Dashboard
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
                            title={editMode ? 'Düzenlemeyi Kapat' : 'Düzenleme Modu'}
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
                            Kutucuk Ekle
                        </button>
                    </div>
                )}

            </div>

            {/* İstatistikler (Glass Container) */}
            <div className="dashboard-stats-grid">
                <div style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '20px',
                    padding: '30px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--glass-shadow)'
                }}>
                    <div>
                        <h3 style={{
                            margin: 0,
                            fontSize: '1.3rem',
                            fontWeight: '600',
                            marginBottom: '5px',
                            color: 'var(--text-primary)'
                        }}>
                            Kayıtlı Kartlar
                        </h3>
                        <p style={{
                            margin: 0,
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary)'
                        }}>
                            Toplam kartvizit
                        </p>
                    </div>
                    <div style={{
                        fontSize: '3.5rem',
                        fontWeight: '700',
                        color: 'var(--accent-primary)'
                    }}>
                        {loading ? '...' : stats.totalCards}
                    </div>
                </div>

                <div style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '20px',
                    padding: '25px',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--glass-shadow)',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>En Çok Kullanılan Etiketler</h3>
                        <Link to="/contacts" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>Tümünü Gör</Link>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {loading ? 'Yükleniyor...' : (
                            tagStats.length > 0 ? (
                                tagStats.map(tag => (
                                    <Link 
                                        key={tag.id} 
                                        to={`/contacts?tagId=${tag.id}`}
                                        style={{ 
                                            padding: '8px 15px', 
                                            borderRadius: '12px', 
                                            background: tag.color + '1A', // %10 alpha for background
                                            border: `1px solid ${tag.color}40`,
                                            color: 'var(--text-primary)',
                                            textDecoration: 'none',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s ease'
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
                                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({tag.getDataValue ? tag.getDataValue('cardCount') : tag.cardCount})</span>
                                    </Link>
                                ))
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Henüz etiket bulunmuyor.</p>
                            )
                        )}
                    </div>
                </div>
            </div>


            {/* Core Application Tiles - Always at top, under stats */}
            <div className="dashboard-tiles-grid-3col" style={{
                marginBottom: '40px'
            }}>
                {tiles
                    .filter(t => ['/contacts', '/logs', '/import'].includes(t.url))
                    .map((tile) => (
                        <div key={tile.id} style={{ position: 'relative' }}>
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
                                    width: 'fit-content'
                                }}>
                                    <DynamicIcon name={tile.icon} />
                                </div>
                                <div>
                                    <span style={{
                                        fontSize: '1.5rem',
                                        display: 'block',
                                        fontWeight: '600',
                                        marginBottom: '5px'
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
                            </Link>
                        </div>
                    ))}
            </div>

            {/* Custom/Other Tiles Grid */}
            <div className="dashboard-tiles-grid">
                {tiles
                    .filter(t => !['/contacts', '/logs', '/import'].includes(t.url))
                    .map((tile) => {
                        const TileWrapper = tile.isInternal ? Link : 'a';
                        const wrapperProps = tile.isInternal ? { to: tile.url } : { href: tile.url, target: tile.url.startsWith('http') ? '_blank' : '_self' };

                        return (
                            <div key={tile.id} style={{ position: 'relative' }}>
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
                                        width: 'fit-content'
                                    }}>
                                        <DynamicIcon name={tile.icon} />
                                    </div>
                                    <div>
                                        <span style={{
                                            fontSize: '1.5rem',
                                            display: 'block',
                                            fontWeight: '600',
                                            marginBottom: '5px'
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
                                            title="Düzenle"
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
                                            title="Sil"
                                        >
                                            <Icons.FaTrash size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>

            {/* Yönetim Modalı */}
            {showModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setShowModal(false)}
                    title={currentTile ? "Kutucuk Düzenle" : "Yeni Kutucuk Ekle"}
                >
                    <form onSubmit={handleSaveTile} style={{ color: 'var(--text-primary)' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Başlık</label>
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
                            <label style={{ display: 'block', marginBottom: '5px' }}>Alt Başlık</label>
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
                            <label style={{ display: 'block', marginBottom: '5px' }}>Link (URL)</label>
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
                                placeholder="/contacts veya https://google.com"
                                required
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>İkon (FaName)</label>
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
                                <label style={{ display: 'block', marginBottom: '5px' }}>Renk Seçimi</label>
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
                                <label style={{ display: 'block', marginBottom: '5px' }}>Sıralama</label>
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
                                <label htmlFor="isInternal">Dahili Sayfa mı?</label>
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
                                İptal
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
                                {currentTile ? 'Güncelle' : 'Ekle'}
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
                title="Kutucuğu Sil"
                message="Bu kutucuğu silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
            />
        </div>
    );
};

export default Dashboard;
