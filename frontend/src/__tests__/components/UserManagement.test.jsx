import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserManagement from '../../components/admin/UserManagement';
import api from '../../api/axios';

const mockShowNotification = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'en' },
    }),
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, username: 'admin', role: 'admin', displayName: 'Main Admin' },
    }),
}));

vi.mock('../../context/NotificationContext', () => ({
    useNotification: () => ({ showNotification: mockShowNotification }),
}));

vi.mock('../../api/axios', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

const sampleUsers = [
    {
        id: 1,
        username: 'admin',
        displayName: 'Main Admin',
        email: 'admin@test.com',
        role: 'admin',
        isApproved: true,
        createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
        id: 2,
        username: 'alice',
        displayName: 'Alice Pending',
        email: 'alice@test.com',
        role: 'user',
        isApproved: false,
        createdAt: '2026-02-01T00:00:00.000Z',
    },
];

describe('UserManagement component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: sampleUsers });
    });

    it('lists users, disables self approval/role toggles, and allows toggling other users', async () => {
        api.put.mockResolvedValue({ data: { success: true } });

        render(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByText('Main Admin')).toBeInTheDocument();
            expect(screen.getByText('Alice Pending')).toBeInTheDocument();
        });

        // 4 checkboxes total: 2 for admin (disabled), 2 for alice (enabled)
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(4);
        expect(checkboxes[0]).toBeDisabled();
        expect(checkboxes[1]).toBeDisabled();
        expect(checkboxes[2]).not.toBeDisabled();
        expect(checkboxes[3]).not.toBeDisabled();

        // Approve Alice
        fireEvent.click(checkboxes[2]);
        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith('/api/users/2/approve', { isApproved: true });
        });

        // Promote Alice to admin
        fireEvent.click(checkboxes[3]);
        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith('/api/users/2/role', { role: 'admin' });
        });
    });

    it('filters users by search query and resets filters when empty', async () => {
        render(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByText('Alice Pending')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('users:searchPlaceholder');
        fireEvent.change(searchInput, { target: { value: 'alice' } });

        expect(screen.getByText('Alice Pending')).toBeInTheDocument();
        expect(screen.queryByText('Main Admin')).not.toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: 'nonexistent-xyz' } });
        expect(screen.getByText('users:noResults')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'users:clearFilters' }));
        expect(screen.getByText('Main Admin')).toBeInTheDocument();
    });

    it('reverts optimistic role update and shows error notification when API fails', async () => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        api.put.mockRejectedValueOnce(new Error('Forbidden'));

        render(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByText('Alice Pending')).toBeInTheDocument();
        });

        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes[3]).not.toBeChecked();

        fireEvent.click(checkboxes[3]);

        await waitFor(() => {
            expect(mockShowNotification).toHaveBeenCalledWith('users:roleUpdateError', 'error');
            expect(checkboxes[3]).not.toBeChecked();
        });

        errSpy.mockRestore();
    });
});
