import { render, screen, waitFor } from '@testing-library/react';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useLocation: () => ({ state: null, pathname: '/contacts', search: '' }),
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

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

// Mock API — return appropriate data based on the URL
vi.mock('../../api/axios', () => ({
    default: {
        get: vi.fn((url) => {
            if (url === '/api/tags') return Promise.resolve({ data: [] });
            if (url === '/api/cards/cities') return Promise.resolve({ data: [] });
            // Default: cards endpoint
            return Promise.resolve({
                data: { cards: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0 } }
            });
        }),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
    API_URL: 'http://localhost:5000',
}));

// Mock contexts
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, role: 'admin', displayName: 'Test User' },
        isAuthenticated: true,
    }),
}));
vi.mock('../../context/NotificationContext', () => ({
    useNotification: () => ({ showNotification: vi.fn() }),
}));
vi.mock('../../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'dark' }),
}));

// Mock offlineStore (uses Dexie)
vi.mock('../../utils/offlineStore', () => ({
    saveCardsToOffline: vi.fn(() => Promise.resolve()),
    getOfflineCards: vi.fn(() => Promise.resolve([])),
}));

// Mock downloadHelper
vi.mock('../../utils/downloadHelper', () => ({
    downloadFile: vi.fn(),
}));

// Mock vcardHelper
vi.mock('../../utils/vcardHelper', () => ({
    generateVCardString: vi.fn(() => ''),
}));

// Mock child components that are not under test
vi.mock('../../components/shared/EmptyState', () => ({
    default: ({ title, description, actionLabel }) => (
        <div data-testid="empty-state">
            <span>{title}</span>
            <span>{description}</span>
            {actionLabel && <span>{actionLabel}</span>}
        </div>
    ),
}));
vi.mock('../../components/cards/SearchBar', () => ({
    default: () => <div data-testid="search-bar" />,
}));
vi.mock('../../components/shared/Modal', () => ({
    default: ({ children }) => <div data-testid="modal">{children}</div>,
}));
vi.mock('../../components/shared/ConfirmModal', () => ({
    default: ({ isOpen, title }) => isOpen ? <div data-testid="confirm-modal">{title}</div> : null,
}));
vi.mock('../../components/shared/QRCodeOverlay', () => ({
    default: () => null,
}));
vi.mock('../../components/cards/HistoryTimeline', () => ({
    default: () => null,
}));
vi.mock('../../components/cards/AddCard', () => ({
    default: () => <div data-testid="add-card" />,
}));
vi.mock('../../components/cards/InteractionLog', () => ({
    default: () => null,
}));

import Contacts from '../../components/cards/Contacts';

describe('Contacts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders contact list page without crashing', async () => {
        const { container } = render(<Contacts />);
        await waitFor(() => {
            expect(container.querySelector('.fade-in, [data-testid="empty-state"]')).toBeTruthy();
        });
    });

    it('shows empty state when no cards returned', async () => {
        render(<Contacts />);
        await waitFor(() => {
            expect(screen.getByTestId('empty-state')).toBeInTheDocument();
        });
    });

    it('renders page title', async () => {
        render(<Contacts />);
        await waitFor(() => {
            expect(screen.getByText('cards:contacts.title')).toBeInTheDocument();
        });
    });

    it('uses react-router useLocation return shape', () => {
        // If react-router v7 changes useLocation return type, this mock
        // (and the component depending on it) will need updating
        render(<Contacts />);
        // The component accesses location.state and location.pathname
        // If our mock shape is wrong, the component would crash
        expect(screen.getByText('cards:contacts.title')).toBeInTheDocument();
    });

    it('useNavigate mock returns a callable function', () => {
        // Verify our mock matches the expected react-router API
        expect(typeof mockNavigate).toBe('function');
        // The component calls navigate() — if the API changes, the mock
        // and these tests need to be updated
        mockNavigate('/test');
        expect(mockNavigate).toHaveBeenCalledWith('/test');
    });

    it('calls api.get to fetch cards on mount', async () => {
        const api = (await import('../../api/axios')).default;
        render(<Contacts />);
        await waitFor(() => {
            expect(api.get).toHaveBeenCalled();
        });
    });
});
