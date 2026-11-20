import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TwoFactorSection from '../../components/settings/TwoFactorSection';

const mockCheckAuth = vi.fn(() => Promise.resolve());
const mockShowNotification = vi.fn();
let mockUser = { id: 1, username: 'admin', twoFactorEnabled: false };

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        checkAuth: mockCheckAuth,
    }),
}));

vi.mock('../../context/NotificationContext', () => ({
    useNotification: () => ({
        showNotification: mockShowNotification,
    }),
}));

vi.mock('../../api/axios', () => ({
    default: {
        post: vi.fn(),
    },
}));

import api from '../../api/axios';

describe('TwoFactorSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = { id: 1, username: 'admin', twoFactorEnabled: false };
    });

    it('starts 2FA setup, displays QR + secret, and verifies 6-digit code', async () => {
        api.post
            .mockResolvedValueOnce({ data: { qrCodeUrl: 'data:image/png;base64,abc', secret: 'JBSWY3DPEHPK3PXP' } })
            .mockResolvedValueOnce({ data: { messageCode: 'TWO_FACTOR_ENABLED', message: '2FA enabled.' } });

        render(<TwoFactorSection />);

        expect(screen.getByText('settings:twoFactor.statusDisabled')).toBeInTheDocument();
        fireEvent.click(screen.getByText('settings:twoFactor.enableBtn'));

        await waitFor(() => {
            expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
        });

        const input = screen.getByLabelText('settings:twoFactor.codeLabel');
        fireEvent.change(input, { target: { value: '123456' } });
        fireEvent.click(screen.getByText('settings:twoFactor.verifyBtn'));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/api/2fa/verify', { token: '123456' });
            expect(mockCheckAuth).toHaveBeenCalledTimes(1);
            expect(mockShowNotification).toHaveBeenCalledWith(expect.any(String), 'success');
        });
    });

    it('disables 2FA when enabled and valid 6-digit code submitted', async () => {
        mockUser = { id: 1, username: 'admin', twoFactorEnabled: true };
        api.post.mockResolvedValueOnce({ data: { messageCode: 'TWO_FACTOR_DISABLED', message: '2FA disabled.' } });

        render(<TwoFactorSection />);

        expect(screen.getByText('settings:twoFactor.statusEnabled')).toBeInTheDocument();
        fireEvent.click(screen.getByText('settings:twoFactor.disableBtn'));

        const input = screen.getByLabelText('settings:twoFactor.disableCodeLabel');
        fireEvent.change(input, { target: { value: '654321' } });
        fireEvent.click(screen.getByText('settings:twoFactor.confirmDisableBtn'));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/api/2fa/disable', { token: '654321' });
            expect(mockCheckAuth).toHaveBeenCalledTimes(1);
            expect(mockShowNotification).toHaveBeenCalledWith(expect.any(String), 'success');
        });
    });
});
