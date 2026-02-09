import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as Icons from 'react-icons/fa';

const QRCodeOverlay = ({ url, onClose, title = "Dijital Kartvizit" }) => {
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
                maxWidth: '400px',
                padding: '30px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                textAlign: 'center',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '1.2rem',
                        cursor: 'pointer'
                    }}
                >
                    <Icons.FaTimes />
                </button>

                <h3 style={{ color: 'white', marginBottom: '25px', fontSize: '1.5rem' }}>{title}</h3>

                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    display: 'inline-block',
                    marginBottom: '25px'
                }}>
                    <QRCodeSVG
                        value={url}
                        size={250}
                        level="H"
                        includeMargin={true}
                    />
                </div>

                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                    Bu QR kodu telefon kamerasıyla okutarak dijital kartvizite hızlıca erişebilirsiniz.
                </p>

                <button
                    onClick={() => {
                        window.open(url, '_blank');
                    }}
                    style={{
                        padding: '12px 20px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        width: '100%'
                    }}
                >
                    Bağlantıyı Aç
                </button>
            </div>
        </div>
    );
};

export default QRCodeOverlay;
