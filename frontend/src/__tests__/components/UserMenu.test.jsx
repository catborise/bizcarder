import { render, screen, fireEvent } from '@testing-library/react';

// Capture mocks so tests can assert on them
const mockNavigate = vi.fn();
const mockChangeLanguage = vi.fn();
const mockLogout = vi.fn(() => Promise.resolve());
const mockToggleTheme = vi.fn();

vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'en', changeLanguage: mockChangeLanguage },
    }),
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 1,
            role: 'admin',
            displayName: 'Test Admin',
            username: 'admin',
            email: 'admin@test.com',
        },
        logout: mockLogout,
    }),
}));

vi.mock('../../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'dark', toggleTheme: mockToggleTheme }),
}));

import UserMenu from '../../components/layout/UserMenu';

describe('UserMenu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders user display name', () => {
        render(<UserMenu />);
        expect(screen.getByText('Test Admin')).toBeInTheDocument();
    });

    it('opens dropdown on click', () => {
        render(<UserMenu />);
        // Before click, logout button should not be visible
        expect(screen.queryByText('userMenu.logout')).not.toBeInTheDocument();

        // Click the user button to open dropdown
        const trigger = screen.getByText('Test Admin');
        fireEvent.click(trigger);

        // After click, dropdown items should be visible
        expect(screen.getByText('userMenu.logout')).toBeInTheDocument();
        expect(screen.getByText('userMenu.settings')).toBeInTheDocument();
    });

    it('menu items navigate correctly', () => {
        render(<UserMenu />);
        // Open dropdown
        fireEvent.click(screen.getByText('Test Admin'));

        // Click settings menu item
        fireEvent.click(screen.getByText('userMenu.settings'));
        expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('navigates to my-card page', () => {
        render(<UserMenu />);
        fireEvent.click(screen.getByText('Test Admin'));
        fireEvent.click(screen.getByText('userMenu.myCard'));
        expect(mockNavigate).toHaveBeenCalledWith('/my-card');
    });

    it('navigates to user management for admin users', () => {
        render(<UserMenu />);
        fireEvent.click(screen.getByText('Test Admin'));
        fireEvent.click(screen.getByText('userMenu.userManagement'));
        expect(mockNavigate).toHaveBeenCalledWith('/users');
    });

    it('language toggle calls changeLanguage', () => {
        render(<UserMenu />);
        fireEvent.click(screen.getByText('Test Admin'));

        // Find the language button — it should show "TR" since current language is 'en'
        const langButton = screen.getByText('TR');
        fireEvent.click(langButton);

        expect(mockChangeLanguage).toHaveBeenCalledWith('tr');
    });

    it('theme toggle calls toggleTheme', () => {
        render(<UserMenu />);
        fireEvent.click(screen.getByText('Test Admin'));

        // Since theme is 'dark', button should show "Light"
        const themeButton = screen.getByText('Light');
        fireEvent.click(themeButton);

        expect(mockToggleTheme).toHaveBeenCalledOnce();
    });

    it('logout calls logout function and navigates', async () => {
        render(<UserMenu />);
        fireEvent.click(screen.getByText('Test Admin'));
        fireEvent.click(screen.getByText('userMenu.logout'));

        expect(mockLogout).toHaveBeenCalledOnce();
    });

    it('renders admin role badge', () => {
        render(<UserMenu />);
        fireEvent.click(screen.getByText('Test Admin'));
        expect(screen.getByText('userMenu.roleBadge.admin')).toBeInTheDocument();
    });

    it('renders user email in dropdown', () => {
        render(<UserMenu />);
        fireEvent.click(screen.getByText('Test Admin'));
        expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });
});
