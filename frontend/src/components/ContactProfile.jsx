import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api, { API_URL } from '../api/axios';
import { downloadFile } from '../utils/downloadHelper';
import { useNotification } from '../context/NotificationContext';
import { FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaDownload, FaBuilding, FaUserCircle, FaQrcode } from 'react-icons/fa';
import QRCodeOverlay from './QRCodeOverlay';
import { generateVCardString } from '../utils/vcardHelper';

const ContactProfile = () => {
    const { id } = useParams();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const { showNotification } = useNotification();

    useEffect(() => {
        const fetchPublicCard = async () => {
            try {
                // Public endpoint'i kullan
                const res = await api.get(`/api/cards/public/${id}`);
                setCard(res.data);
            } catch (err) {
                console.error('Error fetching public card:', err);
                setError(err.response?.data?.error || 'Kartvizit yüklenemedi.');
            } finally {
                setLoading(false);
            }
        };

        fetchPublicCard();
    }, [id]);

    const handleDownloadVCard = async () => {
        if (!card) return;
        try {
            showNotification('vCard dosyası hazırlanıyor...', 'info');
            // Public vCF endpoint'ini kullan
            const response = await api.get(`/api/cards/public/${card.id}/vcf`, {
                responseType: 'blob'
            });
            downloadFile(response.data, `${card.firstName}_${card.lastName}.vcf`, 'text/vcard');
            showNotification('vCard indirildi.', 'success');
        } catch (err) {
            showNotification('İndirme başarısız.', 'error');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: 'white' }}>
                <div className="loader">Yükleniyor...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'white' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>Olamaz! 😕</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem' }}>{error}</p>
            </div>
        );
    }

    const shareUrl = window.location.href;

    return (
        <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(30px)',
                borderRadius: '32px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                overflow: 'hidden',
                boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                position: 'relative'
            }}>
                {/* Header Gradient */}
                <div style={{
                    height: '160px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    position: 'relative'
                }}>
                    {card.logoUrl && (
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '25px',
                            width: '70px',
                            height: '70px',
                            background: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            <img src={`${API_URL}${card.logoUrl}`} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                    )}
                </div>

                <div style={{ padding: '0 40px 40px', marginTop: '-80px', position: 'relative', textAlign: 'center' }}>
                    {/* Profile Picture / Avatar */}
                    <div style={{
                        width: '160px',
                        height: '160px',
                        background: '#1a1a1a',
                        borderRadius: '40px',
                        border: '6px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '4rem',
                        color: 'white',
                        margin: '0 auto 25px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }}>
                        {card.frontImageUrl ? (
                            <img src={`${API_URL}${card.frontImageUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <FaUserCircle size={100} opacity={0.3} />
                        )}
                    </div>

                    <h1 style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 10px 0', fontWeight: '800' }}>
                        {card.firstName} {card.lastName}
                    </h1>
                    <p style={{ color: '#a78bfa', fontSize: '1.25rem', margin: '0 0 10px 0', fontWeight: '600' }}>{card.title}</p>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', marginBottom: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <FaBuilding opacity={0.5} /> {card.company}
                    </div>

                    <div style={{ display: 'grid', gap: '20px', textAlign: 'left', marginBottom: '40px' }}>
                        {card.email && (
                            <a href={`mailto:${card.email}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(102, 126, 234, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaEnvelope color="#667eea" />
                                </div>
                                <span>{card.email}</span>
                            </a>
                        )}
                        {card.phone && (
                            <a href={`tel:${card.phone}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(118, 75, 162, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaPhone color="#764ba2" />
                                </div>
                                <span>{card.phone}</span>
                            </a>
                        )}
                        {card.website && (
                            <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(74, 222, 128, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaGlobe color="#4ade80" />
                                </div>
                                <span>{card.website}</span>
                            </a>
                        )}
                        {(card.city || card.country) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(244, 114, 182, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaMapMarkerAlt color="#f472b6" />
                                </div>
                                <span>{[card.city, card.country].filter(Boolean).join(', ')}</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button
                            onClick={handleDownloadVCard}
                            style={{
                                flex: 2,
                                padding: '16px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '18px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                fontSize: '1.1rem',
                                boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)'
                            }}
                        >
                            <FaDownload /> Rehbere Ekle (vCard)
                        </button>
                        <button
                            onClick={() => setIsQrModalOpen(true)}
                            style={{
                                flex: 1,
                                padding: '16px',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '18px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="QR Kod Göster"
                        >
                            <FaQrcode size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: '40px', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                CRM Bizcard App ile oluşturuldu
            </p>

            {isQrModalOpen && (
                <QRCodeOverlay
                    title={`${card.firstName} ${card.lastName}`}
                    url={shareUrl}
                    vCardData={generateVCardString(card)}
                    onClose={() => setIsQrModalOpen(false)}
                    onDownloadVCard={handleDownloadVCard}
                />
            )}
        </div>
    );
};

export default ContactProfile;
