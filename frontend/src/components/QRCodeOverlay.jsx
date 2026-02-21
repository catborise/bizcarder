import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaTimes, FaDownload, FaUserPlus, FaQrcode } from 'react-icons/fa';

const QRCodeOverlay = ({ url, onClose, title = "Dijital Kartvizit", vCardData = null, onDownloadVCard = null }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(15px)',
            zIndex: 5000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'rgba(30, 30, 35, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '420px',
                padding: '40px 30px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                textAlign: 'center',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <FaTimes />
                </button>

                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    marginBottom: '20px',
                    boxShadow: '0 8px 20px rgba(118, 75, 162, 0.3)'
                }}>
                    <FaQrcode size={30} color="white" />
                </div>

                <h3 style={{ color: 'white', marginBottom: '10px', fontSize: '1.6rem', fontWeight: '700' }}>{title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '30px' }}>
                    Dijital kartvizit bilgileri
                </p>

                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    marginBottom: '30px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    border: '8px solid white'
                }}>
                    <QRCodeSVG
                        value={vCardData || url}
                        size={240}
                        level="M"
                        includeMargin={false}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {onDownloadVCard && (
                        <button
                            onClick={onDownloadVCard}
                            style={{
                                padding: '14px 20px',
                                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '14px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                                fontSize: '1rem'
                            }}
                        >
                            <FaUserPlus /> Rehbere Ekle (vCard)
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (url.startsWith('http')) {
                                window.open(url, '_blank');
                            } else {
                                // If it's just vCard data, maybe copy to clipboard as fallback or just notify
                                navigator.clipboard.writeText(vCardData || url);
                                alert('Bilgiler panoya kopyalandı.');
                            }
                        }}
                        style={{
                            padding: '12px 20px',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            width: '100%',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        Profil Bağlantısını Aç
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QRCodeOverlay;
