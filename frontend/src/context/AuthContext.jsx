import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';
import i18n from '../i18n';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const resolveErrorMessage = (responseData, fallbackKey) => {
        const code = responseData?.errorCode;
        if (code) {
            const translated = i18n.t(`auth:errors.${code}`);
            if (translated !== `errors.${code}`) return translated;
        }
        return responseData?.error || i18n.t(fallbackKey);
    };
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Oturum kontrolü
    const checkAuth = async () => {
        try {
            const response = await api.get('/auth/me');
            if (response.data.isAuthenticated) {
                setUser(response.data.user);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    // App yüklendiğinde oturum kontrolü yap
    useEffect(() => {
        checkAuth();
    }, []);

    // Yerel giriş
    const loginLocal = async (username, password) => {
        try {
            const response = await api.post('/auth/local/login', {
                username,
                password,
            });

            if (response.data.success) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                error: resolveErrorMessage(error.response?.data, 'auth:loginFailed'),
            };
        }
    };

    // Yerel kayıt
    const registerLocal = async (username, email, password, displayName) => {
        try {
            const response = await api.post('/auth/local/register', {
                username,
                email,
                password,
                displayName,
            });

            if (response.data.success) {
                // Eğer onay bekleniyorsa, kullanıcı girişi yapma
                if (response.data.pendingApproval) {
                    return {
                        success: true,
                        pendingApproval: true,
                        message: response.data.message,
                    };
                }

                // Normal akış (otomatik giriş varsa)
                if (response.data.user) {
                    setUser(response.data.user);
                    setIsAuthenticated(true);
                }
                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                error: resolveErrorMessage(error.response?.data, 'auth:registrationFailed'),
            };
        }
    };

    // Çıkış yap
    const logout = async () => {
        try {
            const response = await api.post('/auth/logout');
            setUser(null);
            setIsAuthenticated(false);

            // Eğer backend bir logoutUrl döndürürse (SAML için), oraya yönlendir
            if (response.data.logoutUrl) {
                window.location.href = response.data.logoutUrl;
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        loginLocal,
        registerLocal,
        logout,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
