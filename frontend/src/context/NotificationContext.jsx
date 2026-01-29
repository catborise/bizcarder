import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);

    /**
     * Bildirim Göster
     * @param {string} message - Mesaj içeriği
     * @param {string} type - 'success' | 'error' | 'info'
     * @param {number} duration - Görünme süresi (ms)
     */
    const showNotification = useCallback((message, type = 'info', duration = 4000) => {
        setNotification({ message, type });

        // Otomatik kapat
        setTimeout(() => {
            setNotification(null);
        }, duration);
    }, []);

    const closeNotification = () => setNotification(null);

    return (
        <NotificationContext.Provider value={{ notification, showNotification, closeNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
