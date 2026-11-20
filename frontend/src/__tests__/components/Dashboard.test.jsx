import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Dashboard from '../../components/dashboard/Dashboard';
import api from '../../api/axios';

const mockUseAuth = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'en' },
    }),
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

vi.mock('../../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

vi.mock('../../context/NotificationContext', () => ({
    useNotification: () => ({ showNotification: vi.fn() }),
}));

vi.mock('../../api/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
    API_URL: 'http://localhost:5000',
}));

describe('Dashboard component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockUseAuth.mockReturnValue({
            user: { id: 1, role: 'admin', displayName: 'Admin' },
            isAuthenticated: true,
        });
    });

    it('renders fetched stats, tag pills, and sanitizes dangerous tile URLs (blocks javascript: XSS)', async () => {
        api.get.mockImplementation((url) => {
            if (url === '/api/cards/stats') {
                return Promise.resolve({ data: { totalCards: 42, thisWeek: 7, followUps: 5 } });
            }
            if (url === '/api/db-tiles') {
                return Promise.resolve({
                    data: [
                        {
                            id: 1,
                            title: 'Contacts Tile',
                            subtitle: 'All contacts',
                            url: '/contacts',
                            icon: 'FaAddressBook',
                            isInternal: true,
                            order: 1,
                        },
                        {
                            id: 2,
                            title: 'Safe External',
                            subtitle: 'Docs',
                            url: 'https://docs.example.com',
                            icon: 'FaGlobe',
                            isInternal: false,
                            order: 2,
                        },
                        {
                            id: 3,
                            title: 'Evil Tile',
                            subtitle: 'XSS attempt',
                            url: 'javascript:alert(1)',
                            icon: 'FaLink',
                            isInternal: false,
                            order: 3,
                        },
                    ],
                });
            }
            if (url === '/api/settings') {
                return Promise.resolve({ data: { companyName: 'BizCarder', appBanner: '' } });
            }
            if (url === '/api/tags/stats') {
                return Promise.resolve({
                    data: [{ id: 10, name: 'VIP', color: '#ff0000', cardCount: 4 }],
                });
            }
            if (url === '/api/cards/due-reminders') {
                return Promise.resolve({ data: [] });
            }
            return Promise.resolve({ data: null });
        });

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByText('42')).toBeInTheDocument();
        });

        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('VIP')).toBeInTheDocument();
        expect(screen.getByText('Contacts Tile')).toBeInTheDocument();

        const externalLink = screen.getByRole('link', { name: /Safe External/i });
        expect(externalLink).toHaveAttribute('href', 'https://docs.example.com');
        expect(externalLink).toHaveAttribute('target', '_blank');
        expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');

        const evilLink = screen.getByRole('link', { name: /Evil Tile/i });
        expect(evilLink).toHaveAttribute('href', '#');
        expect(evilLink.getAttribute('href')).not.toContain('javascript:');
    });

    it('does not fetch authenticated-only endpoints when user is not logged in', async () => {
        mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
        api.get.mockResolvedValue({ data: [] });

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/api/cards/stats');
        });

        expect(api.get).not.toHaveBeenCalledWith('/api/tags/stats');
        expect(api.get).not.toHaveBeenCalledWith('/api/cards/due-reminders');
    });
});
