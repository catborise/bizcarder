import { useNotification } from '../../context/NotificationContext';

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
        color: '#ffffff',
        fontWeight: '600',
        boxShadow: 'var(--glass-shadow)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        animation: 'slideIn 0.3s ease-out',
        minWidth: '300px',
    };

    const typeStyles = {
        success: { backgroundColor: 'var(--accent-success)' },
        error: { backgroundColor: 'var(--accent-error)' },
        warning: { backgroundColor: 'var(--accent-warning)', color: '#111827' },
        info: { backgroundColor: 'var(--accent-primary)' },
    }[notification.type] || { backgroundColor: 'var(--accent-primary)' };

    const closeColor = typeStyles.color || styles.color;

    return (
        <div role="alert" aria-live="polite" style={{ ...styles, ...typeStyles }}>
            <span aria-hidden="true">
                {notification.type === 'success' && '✅'}
                {notification.type === 'error' && '❌'}
                {notification.type === 'warning' && '⚠️'}
                {notification.type === 'info' && 'ℹ️'}
            </span>
            <span style={{ flex: 1 }}>{notification.message}</span>
            <button
                onClick={closeNotification}
                aria-label="Close notification"
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: closeColor,
                    cursor: 'pointer',
                    fontSize: '18px',
                    opacity: 0.85,
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
