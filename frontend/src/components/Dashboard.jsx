import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Icons from 'react-icons/fa';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import ReminderModal from './ReminderModal';

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
    if (!rgba || !rgba.startsWith('rgba')) return '#603cba';
    const parts = rgba.match(/(\d+)/g);
    if (!parts || parts.length < 3) return '#603cba';
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
    color: 'white',
    textDecoration: 'none',
    height: '160px',
    position: 'relative',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
};

const Dashboard = () => {
    const [stats, setStats] = useState({ totalCards: 0 });
    const [tiles, setTiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentTile, setCurrentTile] = useState(null);
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
    const isAdmin = user?.role === 'admin';

    const fetchData = async () => {
        setLoading(true);
        try {
            const urls = ['/api/cards/stats', '/api/db-tiles'];
            if (isAuthenticated) {
                urls.push('/api/cards/due-reminders');
            }

            const responses = await Promise.all(urls.map(url => api.get(url)));

            setStats(responses[0].data);
            setTiles(responses[1].data);

            if (isAuthenticated && responses[2]) {
                setDueReminders(responses[2].data);
                if (responses[2].data.length > 0) {
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
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert('Kaydedilirken hata oluştu: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDeleteTile = async (id) => {
        if (!window.confirm('Bu kutucuğu silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/api/db-tiles/${id}`);
            fetchData();
        } catch (error) {
            alert('Silinirken hata oluştu: ' + (error.response?.data?.error || error.message));
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
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    };

    const handleMouseLeave = (e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h2 style={{
                    margin: 0,
                    fontWeight: '700',
                    fontSize: '2.5rem',
                    color: 'white',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
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
                                    ? 'linear-gradient(135deg, #603cba 0%, #3b82f6 100%)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                border: editMode ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600',
                                transition: 'all 0.3s ease',
                                backdropFilter: 'blur(10px)',
                                boxShadow: editMode
                                    ? '0 4px 15px rgba(96, 60, 186, 0.4)'
                                    : '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            title={editMode ? 'Düzenlemeyi Kapat' : 'Düzenleme Modu'}
                        >
                            <Icons.FaTools size={16} />
                        </button>
                        <button
                            onClick={() => openModal()}
                            style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #603cba 0%, #3b82f6 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600',
                                boxShadow: '0 4px 15px rgba(96, 60, 186, 0.3)',
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
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                padding: '30px',
                marginBottom: '40px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}>
                <div>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.3rem',
                        fontWeight: '600',
                        marginBottom: '5px'
                    }}>
                        Kayıtlı Kartvizitler
                    </h3>
                    <p style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                        Kayıtlı kartvizit sayısı
                    </p>
                </div>
                <div style={{
                    fontSize: '4rem',
                    fontWeight: '700',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                    {loading ? '...' : stats.totalCards}
                </div>
            </div>

            {/* Core Application Tiles - Always at top, under stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
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
                                    background: 'rgba(255, 255, 255, 0.1)',
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
                                        color: 'rgba(255, 255, 255, 0.7)'
                                    }}>
                                        {tile.subtitle}
                                    </span>
                                </div>
                            </Link>
                        </div>
                    ))}
            </div>

            {/* Custom/Other Tiles Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
            }}>
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
                                        background: 'rgba(255, 255, 255, 0.1)',
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
                                            color: 'rgba(255, 255, 255, 0.7)'
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
                                                background: 'rgba(255, 255, 255, 0.2)',
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
                                            title="Düzenle"
                                        >
                                            <Icons.FaEdit size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTile(tile.id)}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.4)',
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
                    <form onSubmit={handleSaveTile} style={{ color: 'white' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Başlık</label>
                            <input
                                type="text"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white'
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
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white'
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
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white'
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
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        color: 'white'
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
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '8px',
                                            color: 'white',
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
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        color: 'white'
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
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.2)',
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
                                    background: 'rgba(59, 130, 246, 0.5)',
                                    color: 'white',
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

            {/* Modal removed as it's now a standalone page */}
        </div>
    );
};

export default Dashboard;
