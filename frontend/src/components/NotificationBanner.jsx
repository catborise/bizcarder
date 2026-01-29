import React from 'react';
import { useNotification } from '../context/NotificationContext';

const NotificationBanner = () => {
    const { notification, closeNotification } = useNotification();

    if (!notification) return null;

    const styles = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        padding: '15px 25px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        animation: 'slideIn 0.3s ease-out',
        minWidth: '300px'
    };

    const typeStyles = {
        success: { backgroundColor: '#2ecc71' }, // Yeşil
        error: { backgroundColor: '#e74c3c' },   // Kırmızı
        info: { backgroundColor: '#3498db' }     // Mavi
    }[notification.type] || { backgroundColor: '#34495e' };

    return (
        <div style={{ ...styles, ...typeStyles }}>
            <span>
                {notification.type === 'success' && '✅'}
                {notification.type === 'error' && '⚠️'}
                {notification.type === 'info' && 'ℹ️'}
            </span>
            <span style={{ flex: 1 }}>{notification.message}</span>
            <button
                onClick={closeNotification}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '18px',
                    opacity: 0.8
                }}
            >
                ✕
            </button>
            <style>
                {`
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
};

export default NotificationBanner;
