import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from '../../components/settings/Settings';
import api from '../../api/axios';

const mockCheckAuth = vi.fn();
const mockShowNotification = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

vi.mock('../../context/NotificationContext', () => ({
    useNotification: () => ({ showNotification: mockShowNotification }),
}));

vi.mock('../../api/axios', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
    API_URL: 'http://localhost:5000',
}));

vi.mock('../../components/settings/PasswordChangeForm', () => ({
    default: () => <div data-testid="password-change-form" />,
}));
vi.mock('../../components/settings/TwoFactorSection', () => ({
    default: () => <div data-testid="two-factor-section" />,
}));
vi.mock('../../components/settings/AISection', () => ({
    default: () => <div data-testid="ai-section" />,
}));
vi.mock('../../components/settings/TagManagement', () => ({
    default: () => <div data-testid="tag-management" />,
}));

describe('Settings & SystemSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders admin system section with allowPublicRegistration toggle and saves profile & system settings', async () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: 1,
                username: 'admin',
                displayName: 'Admin User',
                email: 'admin@test.com',
                role: 'admin',
                trashRetentionDays: 30,
                shibbolethId: null,
            },
            checkAuth: mockCheckAuth,
        });

        api.get.mockResolvedValueOnce({
            data: {
                logRetentionLimit: 1000,
                trashRetentionDays: 30,
                allowPublicRegistration: true,
                developerName: 'Dev',
                developerEmail: 'dev@test.com',
                developerGithub: '',
                developerLinkedin: '',
                companyName: 'BizCarder',
                companyLogo: '',
                companyIcon: '',
                appBanner: '',
                footerText: 'Footer',
            },
        });
        api.put.mockResolvedValue({ data: { success: true } });

        render(<Settings />);

        // Local user sees password form and 2FA section
        expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
        expect(screen.getByTestId('two-factor-section')).toBeInTheDocument();

        // Admin sees system settings toggle after load
        const regToggle = await screen.findByLabelText('system.allowPublicRegistration');
        expect(regToggle).toBeChecked();

        fireEvent.click(regToggle);
        expect(regToggle).not.toBeChecked();

        fireEvent.click(screen.getByRole('button', { name: 'system.saveBtn' }));
        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith(
                '/api/settings',
                expect.objectContaining({ allowPublicRegistration: false }),
            );
        });

        // Update profile
        fireEvent.click(screen.getByRole('button', { name: 'settings:profile.updateBtn' }));
        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith(
                '/auth/profile',
                expect.objectContaining({ displayName: 'Admin User', email: 'admin@test.com', trashRetentionDays: 30 }),
            );
            expect(mockCheckAuth).toHaveBeenCalled();
        });
    });

    it('hides system settings for regular users and hides local password/2FA for SSO users', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: 2,
                username: 'sso_user',
                displayName: 'SSO User',
                email: 'sso@test.com',
                role: 'user',
                shibbolethId: 'uid-123',
            },
            checkAuth: mockCheckAuth,
        });

        render(<Settings />);

        expect(screen.getByText('settings:account.ssoMessage')).toBeInTheDocument();
        expect(screen.queryByTestId('password-change-form')).not.toBeInTheDocument();
        expect(screen.queryByTestId('two-factor-section')).not.toBeInTheDocument();
        expect(screen.queryByText('settings:section.system')).not.toBeInTheDocument();
    });
});
