import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddCard from '../../components/cards/AddCard';
import api from '../../api/axios';

const mockShowNotification = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
    Trans: ({ i18nKey }) => <span>{i18nKey}</span>,
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, role: 'admin', aiOcrEnabled: false },
    }),
}));

vi.mock('../../context/NotificationContext', () => ({
    useNotification: () => ({ showNotification: mockShowNotification }),
}));

vi.mock('../../api/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
    API_URL: 'http://localhost:5000',
}));

vi.mock('../../utils/offlineStore', () => ({
    queueForSync: vi.fn(),
}));

describe('AddCard component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        api.get.mockImplementation((url) => {
            if (url === '/api/tags') return Promise.resolve({ data: [] });
            if (url === '/api/cards/check-duplicate') return Promise.resolve({ data: null });
            return Promise.resolve({ data: null });
        });
    });

    it('validates required name and contact fields before quick save', async () => {
        render(<AddCard onCardAdded={vi.fn()} />);

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/api/tags');
        });

        fireEvent.click(screen.getByRole('button', { name: 'common:save' }));
        expect(mockShowNotification).toHaveBeenCalledWith('addCard.validation.nameRequired', 'error');

        fireEvent.change(screen.getByPlaceholderText('addCard.placeholder.firstName'), { target: { value: 'Ali' } });
        fireEvent.change(screen.getByPlaceholderText('addCard.placeholder.lastName'), { target: { value: 'Yilmaz' } });

        fireEvent.click(screen.getByRole('button', { name: 'common:save' }));
        expect(mockShowNotification).toHaveBeenCalledWith('addCard.validation.contactRequired', 'error');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows duplicate alert modal when duplicate exists and creates anyway on confirmation', async () => {
        const onCardAdded = vi.fn();
        api.get.mockImplementation((url) => {
            if (url === '/api/tags') return Promise.resolve({ data: [] });
            if (url === '/api/cards/check-duplicate') {
                return Promise.resolve({
                    data: {
                        id: 99,
                        firstName: 'Ali',
                        lastName: 'Yilmaz',
                        email: 'ali@acme.com',
                        company: 'Acme',
                    },
                });
            }
            return Promise.resolve({ data: null });
        });
        api.post.mockResolvedValue({ data: { id: 100 } });

        render(<AddCard onCardAdded={onCardAdded} />);

        fireEvent.change(screen.getByPlaceholderText('addCard.placeholder.firstName'), { target: { value: 'Ali' } });
        fireEvent.change(screen.getByPlaceholderText('addCard.placeholder.lastName'), { target: { value: 'Yilmaz' } });
        fireEvent.change(screen.getByPlaceholderText('addCard.placeholder.email'), {
            target: { value: 'ali@acme.com' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'common:save' }));

        const createAnywayBtn = await screen.findByRole('button', { name: 'addCard.btn.createAnyway' });
        expect(api.post).not.toHaveBeenCalled();

        fireEvent.click(createAnywayBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                '/api/cards',
                expect.any(FormData),
                expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
            );
            expect(onCardAdded).toHaveBeenCalled();
        });
    });

    it('prefills fields in edit mode and submits PUT /api/cards/:id', async () => {
        const onCardAdded = vi.fn();
        api.put.mockResolvedValue({ data: { id: 55 } });

        render(
            <AddCard
                onCardAdded={onCardAdded}
                activeCard={{
                    id: 55,
                    firstName: 'Elif',
                    lastName: 'Kaya',
                    email: 'elif@corp.com',
                    company: 'TechCorp',
                    tags: [],
                }}
            />,
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Elif')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Kaya')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'common:save' }));

        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith(
                '/api/cards/55',
                expect.any(FormData),
                expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
            );
            expect(mockShowNotification).toHaveBeenCalledWith('addCard.notify.updated', 'success');
            expect(onCardAdded).toHaveBeenCalled();
        });
    });
});
