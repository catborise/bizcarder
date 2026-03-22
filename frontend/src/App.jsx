import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
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
import Help from './components/Help';
import MyCard from './components/MyCard';
import ContactProfile from './components/ContactProfile';
import AccessDenied from './components/AccessDenied';
import { FaTrash, FaSignInAlt, FaWifi, FaPlane, FaTimes } from 'react-icons/fa';

import Contacts from './components/Contacts';

// AppContent bileşeni - useAuth hook'unu kullanmak için AuthProvider içinde olması gerek
const AppContent = () => {
    const { isAuthenticated, user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const location = useLocation();
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
                    background: 'linear-gradient(135deg, var(--accent-primary), #1e40af)',
                    backdropFilter: 'blur(15px)',
                    color: 'white',
                    padding: '12px 24px',
                    zIndex: 2001,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    animation: 'slideDown 0.5s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ fontSize: '24px' }}>📱</div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Kurumsal CRM Uygulamasını Yükleyin</div>
                            <div style={{ fontSize: '12px', opacity: 0.9 }}>Daha hızlı erişim ve çevrimdışı kullanım için ana ekranınıza ekleyin.</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={handleInstallClick}
                            style={{
                                background: 'white',
                                color: 'var(--accent-primary)',
                                border: 'none',
                                padding: '8px 20px',
                                borderRadius: '10px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '14px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        >
                            Hemen Yükle
                        </button>
                        <button
                            onClick={() => setShowInstallBanner(false)}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                padding: '0.6rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div className="nav-brand-group" style={{ display: 'flex', alignItems: 'center' }}>
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
                            gap: '12px',
                            minWidth: 0
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
                                    boxShadow: 'var(--glass-shadow)',
                                    flexShrink: 0
                                }}
                            />
                        ) : (
                            <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>🏢</span>
                        )}
                        <span className="navbar-logo-text">{settings.companyName || 'CRM'}</span>
                    </Link>
                    <div className="nav-links">
                        <Link
                            to="/"
                            style={{
                                color: location.pathname === '/' ? 'var(--accent-primary)' : 'var(--text-primary)',
                                background: location.pathname === '/' ? 'var(--accent-primary-transparent)' : 'transparent',
                                border: location.pathname === '/' ? '1px solid var(--accent-primary-transparent)' : '1px solid transparent',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: location.pathname === '/' ? '600' : '500',
                                opacity: 0.9
                            }}
                            onMouseEnter={(e) => {
                                if (location.pathname !== '/') e.target.style.background = 'var(--glass-bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                                if (location.pathname !== '/') e.target.style.background = 'transparent';
                            }}
                        >
                            Dashboard
                        </Link>
                        <Link
                            to="/contacts"
                            style={{
                                color: location.pathname === '/contacts' ? 'var(--accent-primary)' : 'var(--text-primary)',
                                background: location.pathname === '/contacts' ? 'var(--accent-primary-transparent)' : 'transparent',
                                border: location.pathname === '/contacts' ? '1px solid var(--accent-primary-transparent)' : '1px solid transparent',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: location.pathname === '/contacts' ? '600' : '500',
                                opacity: 0.9
                            }}
                            onMouseEnter={(e) => {
                                if (location.pathname !== '/contacts') e.target.style.background = 'var(--glass-bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                                if (location.pathname !== '/contacts') e.target.style.background = 'transparent';
                            }}
                        >
                            Kartvizitler
                        </Link>
                        <Link
                            to="/my-card"
                            style={{
                                color: location.pathname === '/my-card' ? 'var(--accent-primary)' : 'var(--text-primary)',
                                background: location.pathname === '/my-card' ? 'var(--accent-primary-transparent)' : 'transparent',
                                border: location.pathname === '/my-card' ? '1px solid var(--accent-primary-transparent)' : '1px solid transparent',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                fontWeight: location.pathname === '/my-card' ? '600' : '500',
                                opacity: 0.9
                            }}
                            onMouseEnter={(e) => {
                                if (location.pathname !== '/my-card') e.target.style.background = 'var(--glass-bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                                if (location.pathname !== '/my-card') e.target.style.background = 'transparent';
                            }}
                        >
                            Kartım
                        </Link>
                    </div>
                </div>
                <div className="nav-actions">
                    <div className="theme-toggle-nav">
                        <ThemeToggle />
                    </div>
                    <Link
                        to="/trash"
                        className="trash-link-nav"
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
            <main>

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
                    <Route path="/help" element={<Help />} />
                    <Route path="/access-denied" element={<AccessDenied />} />
                    {/* Public Route for Business Card Sharing (using token) */}
                    <Route path="/contact-profile/:token" element={<ContactProfile />} />
                </Routes>
            </main >

            {/* Ultra-Compact Footer */}
            <footer style={{
                padding: '0.6rem 2rem',
                marginTop: 'auto',
                borderTop: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                color: 'var(--text-tertiary)',
                fontSize: '0.75rem'
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        {settings.footerText || `© ${new Date().getFullYear()} BizCarder.`}
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <Link to="/about" style={{ color: 'inherit', textDecoration: 'none' }}>Hakkında</Link>
                        {isAuthenticated && <Link to="/help" style={{ color: 'inherit', textDecoration: 'none' }}>Yardım</Link>}
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
