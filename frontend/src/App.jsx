import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
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
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';
import BottomNav from './components/BottomNav';
import FAB from './components/FAB';


import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import TrashBin from './components/TrashBin';
import ImportCards from './components/ImportCards';
import About from './components/About';
import Help from './components/Help';
import MyCard from './components/MyCard';
import ContactProfile from './components/ContactProfile';
import AccessDenied from './components/AccessDenied';
import { FaTrash, FaPlane, FaTimes, FaChartPie, FaUsers, FaAddressCard } from 'react-icons/fa';

import Contacts from './components/Contacts';

// AppContent bileşeni - useAuth hook'unu kullanmak için AuthProvider içinde olması gerek
const AppContent = () => {
    const { isAuthenticated, user: currentUser } = useAuth();
    const { showNotification } = useNotification();
    const { t } = useTranslation('pages');
    const location = useLocation();
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [settings, setSettings] = useState({
        companyName: 'BizCarder',
        companyLogo: '',
        companyIcon: '',
        footerText: ''
    });

    const syncQueuedCards = async () => {
        const pending = await getPendingSync();
        if (pending.length === 0) return;

        showNotification(t('app.sync.syncing', { count: pending.length }), 'info');

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
        showNotification(t('app.sync.complete'), 'success');
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

    const navLinkStyle = (isActive) => ({
        color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
        background: isActive ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))' : 'transparent',
        border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
        borderRadius: '8px',
        padding: '6px 14px',
        fontSize: '0.875rem',
        fontWeight: isActive ? 600 : 400,
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    });

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
                    <FaPlane /> {t('app.offline.banner')}
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
                            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{t('app.pwa.installTitle')}</div>
                            <div style={{ fontSize: '12px', opacity: 0.9 }}>{t('app.pwa.installDescription')}</div>
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
                            {t('app.pwa.installButton')}
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
            <nav className="top-nav">
                <div className="nav-container">
                    <div className="nav-brand-group">
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
                                    alt={t('app.nav.logoAlt')}
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
                            <span className="navbar-logo-text">{settings.companyName || t('app.nav.defaultBrand')}</span>
                        </Link>
                        <div className="nav-links">
                            <Link
                                to="/"
                                style={navLinkStyle(location.pathname === '/')}
                            >
                                <FaChartPie size={18} />
                                <span className="hide-on-mobile">{t('app.nav.dashboard')}</span>
                            </Link>
                            <Link
                                to="/contacts"
                                style={navLinkStyle(location.pathname === '/contacts')}
                            >
                                <FaUsers size={18} />
                                <span>{t('app.nav.contacts')}</span>
                            </Link>
                            <Link
                                to="/my-card"
                                style={navLinkStyle(location.pathname === '/my-card')}
                            >
                                <FaAddressCard size={18} />
                                <span className="hide-on-mobile">{t('app.nav.myCard')}</span>
                            </Link>
                        </div>
                    </div>
                    <div className="nav-actions">
                        <Link
                            to="/trash"
                            className="trash-link-nav hide-on-mobile-nav"
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
                            title={t('app.nav.trashBin')}
                        >
                            <FaTrash />
                        </Link>
                        {isAuthenticated ? (
                            <UserMenu />
                        ) : (
                            <Link
                                to="/login"
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                    color: 'white',
                                    fontWeight: '600',
                                    boxShadow: '0 4px 15px rgba(var(--accent-primary-rgb), 0.3)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {t('app.nav.login')}
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main>

                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
                        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
                        <Route
                            path="/contacts"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><Contacts /></PageTransition>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/logs"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><ActivityLogs /></PageTransition>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/trash"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><TrashBin /></PageTransition>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/users"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><UserManagement /></PageTransition>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/settings"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><Settings /></PageTransition>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/my-card"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><MyCard /></PageTransition>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/import"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><ImportCards /></PageTransition>
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
                        <Route path="/help" element={<PageTransition><Help /></PageTransition>} />
                        <Route path="/access-denied" element={<PageTransition><AccessDenied /></PageTransition>} />
                        {/* Public Route for Business Card Sharing (using token) */}
                        <Route path="/contact-profile/:token" element={<PageTransition><ContactProfile /></PageTransition>} />
                    </Routes>
                </AnimatePresence>
            </main >

            {isAuthenticated && <BottomNav />}
            {isAuthenticated && (
              <FAB onClick={() => navigate('/contacts', { state: { openAddCard: true } })} />
            )}

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
                        {settings.footerText || t('app.footer.defaultCopyright')}
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <Link to="/about" style={{ color: 'inherit', textDecoration: 'none' }}>{t('app.footer.about')}</Link>
                        {isAuthenticated && <Link to="/help" style={{ color: 'inherit', textDecoration: 'none' }}>{t('app.footer.help')}</Link>}
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
