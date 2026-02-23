import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const ActivityLogs = () => {
    const [allLogs, setAllLogs] = useState([]); // Tüm ham veri
    const [filteredLogs, setFilteredLogs] = useState([]); // Filtrelenmiş veri
    const [loading, setLoading] = useState(true);

    // Filtreleme State'leri
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');

    // 1. Verileri Çek
    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                // Backend'den son 500 kaydı çekiyoruz
                const res = await api.get('/api/logs');
                setAllLogs(res.data);
                setFilteredLogs(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    // 2. Filtreleme ve Sıralama Logic
    useEffect(() => {
        let result = [...allLogs];

        // Arama (Search)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(log =>
                (log.action && log.action.toLowerCase().includes(term)) ||
                (log.details && log.details.toLowerCase().includes(term)) ||
                (log.user && (log.user.username || '').toLowerCase().includes(term)) ||
                (log.user && (log.user.displayName || '').toLowerCase().includes(term))
            );
        }

        // Tarih Aralığı (Date Range)
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter(log => new Date(log.createdAt) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter(log => new Date(log.createdAt) <= end);
        }

        // Sıralama (Sort)
        result.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        setFilteredLogs(result);

    }, [searchTerm, startDate, endDate, sortOrder, allLogs]);


    const getActionStyle = (action) => {
        const actionUpper = action ? action.toUpperCase() : '';
        if (actionUpper.includes('DELETE') || actionUpper.includes('SIL')) {
            return {
                background: 'var(--glass-bg)',
                border: '1px solid var(--accent-error)',
                color: 'var(--accent-error)',
                icon: '🗑️'
            };
        } else if (actionUpper.includes('UPDATE') || actionUpper.includes('EDIT') || actionUpper.includes('DÜZENLE')) {
            return {
                background: 'var(--glass-bg)',
                border: '1px solid var(--accent-warning)',
                color: 'var(--accent-warning)',
                icon: '✏️'
            };
        } else if (actionUpper.includes('CREATE') || actionUpper.includes('ADD') || actionUpper.includes('EKLE')) {
            return {
                background: 'var(--glass-bg)',
                border: '1px solid var(--accent-success)',
                color: 'var(--accent-success)',
                icon: '✨'
            };
        } else if (actionUpper.includes('LOGIN') || actionUpper.includes('AUTH') || actionUpper.includes('GİRİŞ')) {
            return {
                background: 'var(--glass-bg)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                icon: '🔐'
            };
        } else if (actionUpper.includes('ERROR') || actionUpper.includes('HATA')) {
            return {
                background: 'var(--glass-bg)',
                border: '1px solid var(--accent-error)',
                color: 'var(--accent-error)',
                icon: '⚠️'
            };
        }
        return {
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-tertiary)',
            icon: '📝'
        };
    };


    if (loading) return <div style={{ color: 'var(--text-primary)', padding: '2rem', textAlign: 'center' }}>Yükleniyor...</div>;


    return (
        <div className="fade-in">
            <h2 style={{
                marginBottom: '30px',
                fontWeight: '700',
                fontSize: '2.5rem',
                color: 'var(--text-primary)',
                textShadow: '0 2px 8px rgba(0,0,0,0.1)',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                <span style={{ fontSize: '2rem' }}>📜</span> Sistem İşlem Geçmişi
            </h2>


            {/* Filtreleme ve Kontrol Paneli */}
            <div style={{
                marginBottom: '25px',
                padding: '20px',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                alignItems: 'center',
                boxShadow: 'var(--glass-shadow)'
            }}>

                {/* Arama */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Ara (İşlem veya Detay)</label>
                    <input
                        type="text"
                        placeholder="Örn: Login, Ekle, Hata..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: '10px 15px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            fontSize: '0.95rem'
                        }}
                    />
                </div>


                {/* Tarih Aralığı */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Başlangıç</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                padding: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Bitiş</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                padding: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                </div>

                {/* Sıralama */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Sıralama</label>
                    <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', padding: '2px' }}>
                        <button
                            onClick={() => setSortOrder('desc')}
                            style={{
                                padding: '8px 12px',
                                border: 'none',
                                background: sortOrder === 'desc' ? 'var(--glass-bg-hover)' : 'transparent',
                                color: sortOrder === 'desc' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            En Yeni
                        </button>
                        <button
                            onClick={() => setSortOrder('asc')}
                            style={{
                                padding: '8px 12px',
                                border: 'none',
                                background: sortOrder === 'asc' ? 'var(--glass-bg-hover)' : 'transparent',
                                color: sortOrder === 'asc' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            En Eski
                        </button>
                    </div>
                </div>


                {/* Reset Butonu */}
                <div style={{ alignSelf: 'flex-end' }}>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setStartDate('');
                            setEndDate('');
                            setSortOrder('desc');
                        }}
                        style={{
                            padding: '10px 15px',
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-tertiary)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Temizle
                    </button>

                </div>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
                {filteredLogs.length > 0 ? (
                    filteredLogs.map(log => {
                        const style = getActionStyle(log.action);
                        return (
                            <div key={log.id} style={{
                                background: 'var(--bg-card)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--glass-shadow)',
                                height: '48px',
                                overflow: 'hidden'
                            }}

                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--glass-bg-hover)';
                                    e.currentTarget.style.transform = 'translateX(5px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-card)';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }}

                            >
                                {/* İkon */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    background: style.background,
                                    border: style.border,
                                    fontSize: '16px',
                                    flexShrink: 0
                                }} title={log.action}>
                                    {style.icon}
                                </div>

                                {/* Kullanıcı */}
                                <div style={{
                                    width: '120px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {log.user ? (log.user.displayName || log.user.username || log.user.email) : 'Anonim'}
                                </div>


                                {/* Detaylar (Esnek Alan) */}
                                <div style={{
                                    flex: 1,
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }} title={log.details}>
                                    {log.details}
                                </div>


                                {/* Tarih */}
                                <div style={{
                                    width: '120px',
                                    textAlign: 'right',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-tertiary)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {new Date(log.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>

                            </div>
                        );
                    })
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: 'var(--glass-bg)',
                        borderRadius: '8px',
                        color: 'var(--text-tertiary)',
                        border: '1px dashed var(--glass-border)'
                    }}>
                        Kriterlere uygun kayıt bulunamadı.
                    </div>

                )}
            </div>
        </div>
    );
};

export default ActivityLogs;
