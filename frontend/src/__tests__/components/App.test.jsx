import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import React, { Suspense } from 'react';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'en', changeLanguage: vi.fn() },
    }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        button: ({ children, ...props }) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock API
vi.mock('../../api/axios', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
    },
    API_URL: 'http://localhost:5000',
}));

// Mock offlineStore
vi.mock('../../utils/offlineStore', () => ({
    saveCardsToOffline: vi.fn(() => Promise.resolve()),
    getOfflineCards: vi.fn(() => Promise.resolve([])),
    getPendingSync: vi.fn(() => Promise.resolve([])),
    clearSyncItem: vi.fn(() => Promise.resolve()),
}));

// Controllable auth state
let mockIsAuthenticated = false;
let mockUser = null;
let mockLoading = false;

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        isAuthenticated: mockIsAuthenticated,
        loading: mockLoading,
        loginLocal: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
    }),
}));

// Mock page components to make them identifiable
const MockDashboard = () => <div data-testid="dashboard-page">Dashboard</div>;
const MockContacts = () => <div data-testid="contacts-page">Contacts</div>;
const MockLogin = () => <div data-testid="login-page">Login</div>;
const MockSettings = () => <div data-testid="settings-page">Settings</div>;

// Import ProtectedRoute (it uses our mocked useAuth)
import ProtectedRoute from '../../components/auth/ProtectedRoute';

// Build test route structure that mirrors App.jsx
const TestApp = ({ initialRoute }) => (
    <MemoryRouter initialEntries={[initialRoute]}>
        <Suspense fallback={<div>Loading...</div>}>
            <Routes>
                <Route path="/" element={<MockDashboard />} />
                <Route path="/login" element={<MockLogin />} />
                <Route
                    path="/contacts"
                    element={
                        <ProtectedRoute>
                            <MockContacts />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <MockSettings />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Suspense>
    </MemoryRouter>
);

describe('App routing', () => {
    beforeEach(() => {
        mockIsAuthenticated = false;
        mockUser = null;
        mockLoading = false;
    });

    it('renders without crashing at root route', async () => {
        render(<TestApp initialRoute="/" />);
        await waitFor(() => {
            expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
        });
    });

    it('renders login page at /login route', async () => {
        render(<TestApp initialRoute="/login" />);
        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
    });

    it('redirects unauthenticated users from /contacts to /login', async () => {
        mockIsAuthenticated = false;
        mockUser = null;

        render(<TestApp initialRoute="/contacts" />);
        await waitFor(() => {
            // ProtectedRoute uses Navigate to redirect to /login
            expect(screen.queryByTestId('contacts-page')).not.toBeInTheDocument();
            // Should render the login page after redirect
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
    });

    it('renders protected route when authenticated', async () => {
        mockIsAuthenticated = true;
        mockUser = { id: 1, role: 'admin', displayName: 'Test' };

        render(<TestApp initialRoute="/contacts" />);
        await waitFor(() => {
            expect(screen.getByTestId('contacts-page')).toBeInTheDocument();
        });
    });

    it('renders settings page when authenticated', async () => {
        mockIsAuthenticated = true;
        mockUser = { id: 1, role: 'admin', displayName: 'Test' };

        render(<TestApp initialRoute="/settings" />);
        await waitFor(() => {
            expect(screen.getByTestId('settings-page')).toBeInTheDocument();
        });
    });

    it('shows loading state while auth is being checked', () => {
        mockLoading = true;

        render(<TestApp initialRoute="/contacts" />);
        // ProtectedRoute should not show content or redirect while loading
        expect(screen.queryByTestId('contacts-page')).not.toBeInTheDocument();
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
});
