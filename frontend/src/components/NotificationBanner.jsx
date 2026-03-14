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
        borderRadius: '12px',
        color: 'var(--bg-card)',
        fontWeight: '600',
        boxShadow: 'var(--glass-shadow)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        animation: 'slideIn 0.3s ease-out',
        minWidth: '300px'
    };

    const typeStyles = {
        success: { backgroundColor: 'var(--accent-success)' },
        error: { backgroundColor: 'var(--accent-error)' },
        info: { backgroundColor: 'var(--accent-primary)' }
    }[notification.type] || { backgroundColor: 'var(--bg-card)' };

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
                    color: 'var(--bg-card)',
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
