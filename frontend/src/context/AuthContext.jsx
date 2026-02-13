import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
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
                password
            });

            if (response.data.success) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Giriş başarısız.'
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
                displayName
            });

            if (response.data.success) {
                // Eğer onay bekleniyorsa, kullanıcı girişi yapma
                if (response.data.pendingApproval) {
                    return {
                        success: true,
                        pendingApproval: true,
                        message: response.data.message
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
                error: error.response?.data?.error || 'Kayıt başarısız.'
            };
        }
    };

    // Çıkış yap
    const logout = async () => {
        try {
            await api.post('/auth/logout');
            setUser(null);
            setIsAuthenticated(false);
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
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
