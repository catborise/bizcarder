import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const timerRef = useRef(null);

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    /**
     * Bildirim Göster
     * @param {string} message - Mesaj içeriği
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - Görünme süresi (ms)
     */
    const showNotification = useCallback((message, type = 'info', duration = 4000) => {
        clearTimer();
        setNotification({ message, type });

        timerRef.current = setTimeout(() => {
            setNotification(null);
            timerRef.current = null;
        }, duration);
    }, []);

    const closeNotification = useCallback(() => {
        clearTimer();
        setNotification(null);
    }, []);

    useEffect(() => () => clearTimer(), []);

    return (
        <NotificationContext.Provider value={{ notification, showNotification, closeNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
