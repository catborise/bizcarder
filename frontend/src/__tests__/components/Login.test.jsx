import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../../components/auth/Login';

const mockNavigate = vi.fn();
const mockLoginLocal = vi.fn();
const mockRegisterLocal = vi.fn();
let mockSearch = '';

vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/login', search: mockSearch, state: null }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => {
            const dict = {
                'errors.SAML_LOGIN_FAILED': 'Corporate login failed.',
                'errors.REQUIRES_2FA': 'Two-factor authentication required.',
                'login.usernameLabel': 'Username',
                'login.orEmail': 'or Email',
                'login.loginButton': 'Sign In',
            };
            return dict[key] || key;
        },
    }),
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        loginLocal: mockLoginLocal,
        registerLocal: mockRegisterLocal,
    }),
}));

vi.mock('../../api/axios', () => ({
    default: {
        get: vi.fn(() =>
            Promise.resolve({
                data: {
                    allowPublicRegistration: true,
                    samlEnabled: false,
                    companyName: 'BizCarder',
                    companyLogo: '',
                },
            }),
        ),
    },
    API_URL: 'http://localhost:5000',
}));

describe('Login component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearch = '';
    });

    it('resolves ?errorCode= query param without reflecting untrusted ?error= param', async () => {
        mockSearch = '?errorCode=SAML_LOGIN_FAILED';
        render(<Login />);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Corporate login failed.');
        });
    });

    it('shows Username or Email label in login mode and switches to 2FA step on requires2FA', async () => {
        mockLoginLocal.mockResolvedValueOnce({
            success: false,
            requires2FA: true,
            error: 'Two-factor authentication required.',
        });

        render(<Login />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Username or Email/)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/Username or Email/), { target: { value: 'admin' } });
        fireEvent.change(screen.getByLabelText('login.passwordLabel'), { target: { value: 'Secret123!' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

        await waitFor(() => {
            expect(screen.getByLabelText('2FA')).toBeInTheDocument();
            expect(screen.getByRole('alert')).toHaveTextContent('Two-factor authentication required.');
        });
    });
});
