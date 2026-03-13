import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ActivityLogs from './components/ActivityLogs';
import UserManagement from './components/UserManagement';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import NotificationBanner from './components/NotificationBanner';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import UserMenu from './components/UserMenu';
import api, { API_URL } from './api/axios';
import { getPendingSync, clearSyncItem } from './utils/offlineStore';
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';


import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import TrashBin from './components/TrashBin';
import ImportCards from './components/ImportCards';
import About from './components/About';
import MyCard from './components/MyCard';
import ContactProfile from './components/ContactProfile';
import AccessDenied from './components/AccessDenied';
import { FaTrash, FaSignInAlt, FaWifi, FaPlane, FaTimes } from 'react-icons/fa';

import Contacts from './components/Contacts';

// AppContent bileşeni - useAuth hook'unu kullanmak için AuthProvider içinde olması gerek
const AppContent = () => {
    const { isAuthenticated, user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [settings, setSettings] = useState({
        companyName: 'BizCarder',
        companyLogo: '',
        companyIcon: '',
        footerText: '© 2026 BizCarder. Tüm Hakları Saklıdır.'
    });

    const syncQueuedCards = async () => {
        const pending = await getPendingSync();
        if (pending.length === 0) return;

        showNotification(`${pending.length} bekleyen kayıt senkronize ediliyor...`, 'info');

        for (const item of pending) {
            if (item.type === 'CREATE_CARD') {
                const { data } = item;
                const formDataToSync = new FormData();

                // Reconstruction of FormData
                Object.keys(data).forEach(key => {
                    if (!['frontBlob', 'backBlob', 'logoBlob'].includes(key)) {
                        formDataToSync.append(key, data[key]);
                    }
                });

                if (data.frontBlob) formDataToSync.append('frontImage', data.frontBlob, 'front.jpg');
                if (data.backBlob) formDataToSync.append('backImage', data.backBlob, 'back.jpg');
                if (data.logoBlob) formDataToSync.append('logoImage', data.logoBlob, 'logo.jpg');

                // Additional CRM Fields
                if (data.tags) formDataToSync.append('tags', JSON.stringify(data.tags));
                if (data.reminderDate) formDataToSync.append('reminderDate', data.reminderDate);

                try {
                    await api.post('/api/cards', formDataToSync, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    await clearSyncItem(item.id);
                } catch (err) {
                    console.error('Sync Error for item', item.id, err);
                }
            }
        }
        showNotification('Senkronizasyon tamamlandı.', 'success');
    };

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncQueuedCards();
        };
        const handleOffline = () => setIsOnline(false);
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Initial check if we are online and have pending items
        if (navigator.onLine) {
            syncQueuedCards();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/api/settings');
                setSettings(res.data);

                // Favicon'u güncelle
                if (res.data.companyIcon) {
                    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
                    link.type = 'image/x-icon';
                    link.rel = 'shortcut icon';
                    link.href = API_URL + res.data.companyIcon;
                    document.getElementsByTagName('head')[0].appendChild(link);
                }

                // Sayfa başlığını güncelle
                if (res.data.companyName) {
                    document.title = res.data.companyName;
                }
            } catch (err) {
                console.error("Global settings fetch error:", err);
            }
        };
        fetchSettings();
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallBanner(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            paddingTop: !isOnline || showInstallBanner ? '50px' : '0',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Offline Banner */}
            {!isOnline && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: 'var(--accent-error)',
                    color: 'var(--bg-card)',
                    padding: '10px',
                    textAlign: 'center',
                    zIndex: 2000,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                }}>
                    <FaPlane /> Çevrimdışı Mod - Bazı özellikler kısıtlanmış olabilir.
                </div>
            )}

            {/* PWA Install Banner */}
            {showInstallBanner && isOnline && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(var(--accent-primary-rgb), 0.9)',
                    backdropFilter: 'blur(10px)',
                    color: 'var(--bg-card)',
                    padding: '12px 20px',
                    zIndex: 1999,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--glass-shadow)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaWifi /> <span>Uygulamayı ana ekrana ekleyerek daha hızlı erişebilirsiniz.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleInstallClick}
                            style={{
                                background: 'var(--bg-card)',
                                color: 'var(--accent-primary)',
                                border: 'none',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Yükle
                        </button>
                        <button
                            onClick={() => setShowInstallBanner(false)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--bg-card)', cursor: 'pointer' }}
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}
            {/* Premium Glassmorphism Navbar */}
            <nav style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link
                        to="/"
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            textShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            letterSpacing: '-0.02em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}
                    >
                        {settings.companyLogo ? (
                            <img
                                src={`${API_URL}${settings.companyLogo}`}
                                alt="Logo"
                                style={{
                                    height: '35px',
                                    borderRadius: '6px',
                                    background: 'var(--bg-card)',
                                    padding: '3px',
                                    border: '1px solid var(--glass-border)',
                                    boxShadow: 'var(--glass-shadow)'
                                }}
                            />
                        ) : (
                            <span style={{ fontSize: '1.8rem' }}>🏢</span>
                        )}
                        {settings.companyName || 'CRM'}
                    </Link>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <Link
                            to="/"
                            style={{
                                color: 'var(--text-primary)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: '500',
                                opacity: 0.9
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'var(--glass-bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                            }}
                        >
                            Dashboard
                        </Link>
                        <Link
                            to="/contacts"
                            style={{
                                color: 'var(--text-primary)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: '500',
                                opacity: 0.9
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'var(--glass-bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                            }}
                        >
                            Kartvizitler
                        </Link>
                        <Link
                            to="/my-card"
                            style={{
                                color: 'var(--text-primary)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: '500',
                                opacity: 0.9
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'var(--glass-bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                            }}
                        >
                            Kartım
                        </Link>
                        <Link
                            to="/about"
                            style={{
                                color: 'var(--text-primary)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: '500',
                                opacity: 0.9
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'var(--glass-bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                            }}
                        >
                            Hakkında
                        </Link>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <ThemeToggle />
                    <Link
                        to="/trash"
                        style={{
                            color: 'var(--text-secondary)',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            fontSize: '1.2rem',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--glass-bg-hover)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                        title="Çöp Kutusu"
                    >
                        <FaTrash />
                    </Link>
                    {isAuthenticated ? <UserMenu /> : (
                        <Link
                            to="/login"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease',
                                textDecoration: 'none'
                            }}
                        >
                            <FaSignInAlt size={16} />
                            <span>Oturum Aç</span>
                        </Link>
                    )}
                </div>
            </nav>

            {/* Main Content Area */}
            <main style={{
                padding: '2rem',
                maxWidth: '1400px',
                margin: '0 auto',
                flex: 1,
                width: '100%'
            }}>

                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/contacts"
                        element={
                            <ProtectedRoute>
                                <Contacts />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/logs"
                        element={
                            <ProtectedRoute>
                                <ActivityLogs />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/trash"
                        element={
                            <ProtectedRoute>
                                <TrashBin />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute>
                                <UserManagement />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/my-card"
                        element={
                            <ProtectedRoute>
                                <MyCard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/import"
                        element={
                            <ProtectedRoute>
                                <ImportCards />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/about" element={<About />} />
                    <Route path="/access-denied" element={<AccessDenied />} />
                    {/* Public Route for Business Card Sharing (using token) */}
                    <Route path="/contact-profile/:token" element={<ContactProfile />} />
                </Routes>
            </main >

            {/* Premium Footer */}
            <footer style={{
                padding: '2rem',
                marginTop: 'auto',
                borderTop: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        {settings.footerText || `© ${new Date().getFullYear()} BizCarder. Tüm Hakları Saklıdır.`}
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <Link to="/about" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Hakkında</Link>
                        {isAuthenticated && <Link to="/settings" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Yardım</Link>}
                    </div>
                </div>
            </footer>

            <NotificationBanner />
        </div >
    );
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <NotificationProvider>
                    <Router>
                        <AppContent />
                    </Router>
                </NotificationProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}


export default App;
