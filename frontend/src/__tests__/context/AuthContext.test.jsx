import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

// Mock API
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../api/axios', () => ({
    default: {
        get: (...args) => mockGet(...args),
        post: (...args) => mockPost(...args),
    },
    API_URL: 'http://localhost:5000',
}));

// Mock i18n
vi.mock('../../i18n', () => ({
    default: { t: (key) => key },
}));

import { AuthProvider, useAuth } from '../../context/AuthContext';

// Helper component that exposes context values
const AuthConsumer = ({ onRender }) => {
    const auth = useAuth();
    onRender(auth);
    return (
        <div>
            <span data-testid="is-auth">{String(auth.isAuthenticated)}</span>
            <span data-testid="user">{auth.user ? auth.user.displayName : 'null'}</span>
            <span data-testid="loading">{String(auth.loading)}</span>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('provides default unauthenticated state', async () => {
        // checkAuth returns not authenticated
        mockGet.mockResolvedValueOnce({
            data: { isAuthenticated: false },
        });

        let capturedAuth;
        render(
            <AuthProvider>
                <AuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(capturedAuth.loading).toBe(false);
        });

        expect(capturedAuth.isAuthenticated).toBe(false);
        expect(capturedAuth.user).toBeNull();
    });

    it('login updates user state', async () => {
        // Initial checkAuth — not authenticated
        mockGet.mockResolvedValueOnce({
            data: { isAuthenticated: false },
        });

        // loginLocal response
        mockPost.mockResolvedValueOnce({
            data: {
                success: true,
                user: { id: 1, displayName: 'Admin', role: 'admin' },
            },
        });

        let capturedAuth;
        render(
            <AuthProvider>
                <AuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
            </AuthProvider>
        );

        // Wait for initial checkAuth to complete
        await waitFor(() => {
            expect(capturedAuth.loading).toBe(false);
        });

        expect(capturedAuth.isAuthenticated).toBe(false);

        // Call loginLocal
        await act(async () => {
            const result = await capturedAuth.loginLocal('admin', 'admin');
            expect(result).toEqual({ success: true });
        });

        expect(capturedAuth.isAuthenticated).toBe(true);
        expect(capturedAuth.user).toEqual({ id: 1, displayName: 'Admin', role: 'admin' });
    });

    it('logout clears user state', async () => {
        // Initial checkAuth — authenticated
        mockGet.mockResolvedValueOnce({
            data: {
                isAuthenticated: true,
                user: { id: 1, displayName: 'Admin', role: 'admin' },
            },
        });

        // Logout response
        mockPost.mockResolvedValueOnce({ data: {} });

        let capturedAuth;
        render(
            <AuthProvider>
                <AuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
            </AuthProvider>
        );

        // Wait for initial checkAuth to complete and user to be set
        await waitFor(() => {
            expect(capturedAuth.isAuthenticated).toBe(true);
        });

        expect(capturedAuth.user.displayName).toBe('Admin');

        // Call logout
        await act(async () => {
            await capturedAuth.logout();
        });

        expect(capturedAuth.isAuthenticated).toBe(false);
        expect(capturedAuth.user).toBeNull();
    });

    it('checkAuth handles network errors gracefully', async () => {
        // checkAuth fails with network error
        mockGet.mockRejectedValueOnce(new Error('Network Error'));

        let capturedAuth;
        render(
            <AuthProvider>
                <AuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(capturedAuth.loading).toBe(false);
        });

        expect(capturedAuth.isAuthenticated).toBe(false);
        expect(capturedAuth.user).toBeNull();
    });

    it('useAuth throws when used outside AuthProvider', () => {
        const BadComponent = () => {
            useAuth();
            return null;
        };

        expect(() => render(<BadComponent />)).toThrow(
            'useAuth must be used within an AuthProvider'
        );
    });
});
