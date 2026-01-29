import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaIdCard, FaHistory, FaBuilding, FaUsers, FaGlobe, FaLifeRing } from 'react-icons/fa';
import api from '../api/axios';

const Dashboard = () => {
    const [stats, setStats] = useState({ totalCards: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/api/cards/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Stats fetching error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

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
            <h2 style={{
                marginBottom: '40px',
                fontWeight: '700',
                fontSize: '2.5rem',
                color: 'white',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                letterSpacing: '-0.02em'
            }}>
                Dashboard
            </h2>

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

            {/* Tiles Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
            }}>
                {/* Kartvizitler Tile */}
                <Link to="/contacts"
                    style={tileStyle}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div style={{
                        display: 'inline-flex',
                        padding: '12px',
                        background: 'rgba(96, 60, 186, 0.3)',
                        borderRadius: '12px',
                        width: 'fit-content'
                    }}>
                        <FaIdCard size={36} />
                    </div>
                    <div>
                        <span style={{
                            fontSize: '1.5rem',
                            display: 'block',
                            fontWeight: '600',
                            marginBottom: '5px'
                        }}>
                            Kartvizitler
                        </span>
                        <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                            Kişi listesini yönet
                        </span>
                    </div>
                </Link>

                {/* İşlem Kayıtları Tile */}
                <Link to="/logs"
                    style={tileStyle}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div style={{
                        display: 'inline-flex',
                        padding: '12px',
                        background: 'rgba(218, 83, 44, 0.3)',
                        borderRadius: '12px',
                        width: 'fit-content'
                    }}>
                        <FaHistory size={36} />
                    </div>
                    <div>
                        <span style={{
                            fontSize: '1.5rem',
                            display: 'block',
                            fontWeight: '600',
                            marginBottom: '5px'
                        }}>
                            İşlem Kayıtları
                        </span>
                        <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                            Sistem loglarını incele
                        </span>
                    </div>
                </Link>

                {/* İK Portalı Tile */}
                <a href="#"
                    style={tileStyle}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => e.preventDefault()}
                >
                    <div style={{
                        display: 'inline-flex',
                        padding: '12px',
                        background: 'rgba(0, 163, 0, 0.3)',
                        borderRadius: '12px',
                        width: 'fit-content'
                    }}>
                        <FaBuilding size={36} />
                    </div>
                    <div>
                        <span style={{
                            fontSize: '1.5rem',
                            display: 'block',
                            fontWeight: '600',
                            marginBottom: '5px'
                        }}>
                            İK Portalı
                        </span>
                        <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                            İzin ve bordro işlemleri
                        </span>
                    </div>
                </a>

                {/* Personel Listesi Tile */}
                <a href="#"
                    style={tileStyle}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => e.preventDefault()}
                >
                    <div style={{
                        display: 'inline-flex',
                        padding: '12px',
                        background: 'rgba(43, 87, 151, 0.3)',
                        borderRadius: '12px',
                        width: 'fit-content'
                    }}>
                        <FaUsers size={36} />
                    </div>
                    <div>
                        <span style={{
                            fontSize: '1.5rem',
                            display: 'block',
                            fontWeight: '600',
                            marginBottom: '5px'
                        }}>
                            Personel Listesi
                        </span>
                        <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                            Dahili rehber
                        </span>
                    </div>
                </a>

                {/* Intranet Tile */}
                <a href="#"
                    style={tileStyle}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => e.preventDefault()}
                >
                    <div style={{
                        display: 'inline-flex',
                        padding: '12px',
                        background: 'rgba(227, 162, 26, 0.3)',
                        borderRadius: '12px',
                        width: 'fit-content'
                    }}>
                        <FaGlobe size={36} />
                    </div>
                    <div>
                        <span style={{
                            fontSize: '1.5rem',
                            display: 'block',
                            fontWeight: '600',
                            marginBottom: '5px'
                        }}>
                            Intranet
                        </span>
                        <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                            Kurumsal duyurular
                        </span>
                    </div>
                </a>

                {/* IT Destek Tile */}
                <a href="#"
                    style={tileStyle}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => e.preventDefault()}
                >
                    <div style={{
                        display: 'inline-flex',
                        padding: '12px',
                        background: 'rgba(159, 0, 167, 0.3)',
                        borderRadius: '12px',
                        width: 'fit-content'
                    }}>
                        <FaLifeRing size={36} />
                    </div>
                    <div>
                        <span style={{
                            fontSize: '1.5rem',
                            display: 'block',
                            fontWeight: '600',
                            marginBottom: '5px'
                        }}>
                            IT Destek
                        </span>
                        <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                            Talep oluştur
                        </span>
                    </div>
                </a>
            </div>
        </div>
    );
};

export default Dashboard;
