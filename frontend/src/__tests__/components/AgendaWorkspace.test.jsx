import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgendaWorkspace from '../../components/agenda/AgendaWorkspace';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
    API_URL: 'http://localhost:5000',
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, username: 'ayse', displayName: 'Ayşe Sekreter', role: 'user' },
        isAuthenticated: true,
    }),
}));

vi.mock('../../context/NotificationContext', () => ({
    useNotification: () => ({
        showNotification: vi.fn(),
    }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, fallback) => (typeof fallback === 'string' ? fallback : fallback?.defaultValue || key),
        i18n: { language: 'tr' },
    }),
}));

describe('AgendaWorkspace Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders daily spread, 12-month tabs, and creates an inline entry with @Contact autocomplete', async () => {
        api.get.mockImplementation((url) => {
            if (url.startsWith('/api/agenda/day/')) {
                return Promise.resolve({
                    data: {
                        owner: { id: 1, username: 'ayse', displayName: 'Ayşe Sekreter' },
                        access: { ownerId: 1, actorUserId: 1, isOwner: true, isDelegate: false, permission: 'owner' },
                        page: {
                            id: 10,
                            ownerId: 1,
                            date: '2026-11-24',
                            freeformNotes: 'Genel Müdür toplantı notları',
                            privateNotes: 'Özel şifre notu',
                            version: 1,
                        },
                        entries: [
                            {
                                id: 101,
                                ownerId: 1,
                                createdByUserId: 1,
                                date: '2026-11-24',
                                timeSlot: '09:30',
                                entryType: 'schedule',
                                content: 'Yönetim kurulu hazırlığı',
                                status: 'open',
                                isPrivate: false,
                                contactLinks: [{ id: 1, cardId: 5, displayNameSnapshot: 'Ahmet Yılmaz' }],
                                tags: [{ id: 2, name: 'finans', color: '#10b981' }],
                            },
                        ],
                    },
                });
            }
            if (url.startsWith('/api/agenda/year-overview/')) {
                return Promise.resolve({
                    data: {
                        year: 2026,
                        months: [{ month: 11, totalEntries: 1, openEntries: 1, doneEntries: 0, activeDays: 1 }],
                        days: { '2026-11-24': { total: 1, open: 1, done: 0, hasNotes: true } },
                    },
                });
            }
            if (url === '/api/agenda/delegations') {
                return Promise.resolve({
                    data: {
                        outgoing: [],
                        incoming: [],
                        colleagues: [{ id: 2, username: 'burcu', displayName: 'Burcu Vekil' }],
                    },
                });
            }
            if (url.startsWith('/api/cards')) {
                return Promise.resolve({
                    data: {
                        cards: [
                            { id: 5, firstName: 'Ahmet', lastName: 'Yılmaz', company: 'Yılmaz A.Ş.', title: 'CEO' },
                        ],
                    },
                });
            }
            if (url === '/api/tags') {
                return Promise.resolve({
                    data: [{ id: 2, name: 'finans', color: '#10b981' }],
                });
            }
            return Promise.resolve({ data: {} });
        });

        api.post.mockResolvedValue({ data: { id: 102, migratedCount: 1, toDate: '2026-11-25' } });

        render(<AgendaWorkspace />);

        await waitFor(() => {
            expect(screen.getByText('Yönetim kurulu hazırlığı')).toBeInTheDocument();
        });

        // Owner sees Private Scratchpad tab and Share/Delegation buttons
        expect(screen.getByText(/Özel Karalama/i)).toBeInTheDocument();
        expect(screen.getByText(/Sayfayı Paylaş/i)).toBeInTheDocument();
        expect(screen.getByText(/Vekâlet \/ İzin/i)).toBeInTheDocument();

        // Type @Ahmet to trigger contact autocomplete
        const quickInput = screen.getByLabelText('Hızlı ajanda satırı ekle');
        fireEvent.change(quickInput, { target: { value: '14:00 @Ahmet' } });

        const suggestionBtn = await screen.findByText(/Ahmet Yılmaz/i, { selector: 'strong' });
        fireEvent.click(suggestionBtn);

        // Submit the inline entry
        const addBtn = screen.getByText('Ajandaya Yaz');
        fireEvent.click(addBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                '/api/agenda/entries',
                expect.objectContaining({
                    contactIds: [5],
                }),
                expect.any(Object),
            );
        });

        // Click "Açıkları Yarına Devret"
        const migrateBtn = screen.getByText(/Açıkları Yarına Devret/i);
        fireEvent.click(migrateBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                '/api/agenda/entries/migrate-unfinished',
                expect.objectContaining({ fromDate: expect.any(String) }),
                expect.any(Object),
            );
        });

        // Click "Yazdır / PDF" to open AgendaPrintModal
        const printBtn = screen.getByText(/Yazdır \/ PDF/i);
        fireEvent.click(printBtn);

        await waitFor(() => {
            expect(screen.getByText(/Ajanda Yaprağı Yazdır & Kurumsal PDF Çıktısı/i)).toBeInTheDocument();
            expect(screen.getByText(/Günlük Ajanda Yaprağı \(1 Gün\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Haftalık Program \(7 Gün\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Kurumsal PDF İndir/i)).toBeInTheDocument();
        });
    });

    it('enforces Substitute (Vekâlet) UI restrictions: shows banner and hides private scratchpad, share, and delegation buttons', async () => {
        api.get.mockImplementation((url) => {
            if (url.startsWith('/api/agenda/day/')) {
                return Promise.resolve({
                    data: {
                        owner: { id: 9, username: 'fatma', displayName: 'Fatma Asıl Sekreter' },
                        access: {
                            ownerId: 9,
                            actorUserId: 1,
                            isOwner: false,
                            isDelegate: true,
                            permission: 'write',
                            handoverNote: 'Cuma gününe kadar izindeyim',
                        },
                        page: {
                            id: 22,
                            ownerId: 9,
                            date: '2026-11-24',
                            freeformNotes: 'Ortak sağ sayfa notu',
                            version: 1,
                        },
                        entries: [
                            {
                                id: 201,
                                ownerId: 9,
                                createdByUserId: 1,
                                createdBy: { id: 1, username: 'ayse', displayName: 'Ayşe Sekreter' },
                                date: '2026-11-24',
                                timeSlot: '11:00',
                                entryType: 'call',
                                content: 'Vekil tarafından alınan çağrı',
                                status: 'open',
                                isPrivate: false,
                                contactLinks: [],
                                tags: [],
                            },
                        ],
                    },
                });
            }
            return Promise.resolve({ data: { months: [], days: {}, outgoing: [], incoming: [], colleagues: [] } });
        });

        render(<AgendaWorkspace />);

        await waitFor(() => {
            expect(screen.getByText(/Vekâlet Modu/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/Cuma gününe kadar izindeyim/i)).toBeInTheDocument();
        expect(screen.getByText(/Vekâleten: Ayşe Sekreter/i)).toBeInTheDocument();

        // Private scratchpad tab, Share button, and Delegation button must be hidden in substitute mode
        expect(screen.queryByText(/Özel Karalama/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Sayfayı Paylaş/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Vekâlet \/ İzin/i)).not.toBeInTheDocument();
    });

    it('renders P0 due reminders inbox, time conflict warning badge, inline edit form, and selective rollover panel', async () => {
        api.get.mockImplementation((url) => {
            if (url.startsWith('/api/agenda/day/')) {
                return Promise.resolve({
                    data: {
                        owner: { id: 1, username: 'ayse', displayName: 'Ayşe Sekreter' },
                        access: { ownerId: 1, actorUserId: 1, isOwner: true, isDelegate: false, permission: 'owner' },
                        page: { id: 10, ownerId: 1, date: '2026-11-25', freeformNotes: '', version: 1 },
                        dueReminders: [
                            {
                                id: 301,
                                ownerId: 1,
                                createdByUserId: 1,
                                date: '2026-11-25',
                                content: 'Bakanlık geri araması',
                                status: 'open',
                                reminderAt: new Date(Date.now() - 60000).toISOString(),
                            },
                        ],
                        entries: [
                            {
                                id: 301,
                                ownerId: 1,
                                createdByUserId: 1,
                                date: '2026-11-25',
                                timeSlot: '10:00',
                                endTime: '10:30',
                                entryType: 'schedule',
                                content: 'Bakanlık geri araması',
                                status: 'open',
                                migratedFromEntryId: 99,
                                contactLinks: [],
                                tags: [],
                            },
                            {
                                id: 302,
                                ownerId: 1,
                                createdByUserId: 1,
                                date: '2026-11-25',
                                timeSlot: '10:15',
                                endTime: '10:45',
                                entryType: 'schedule',
                                content: 'Finans komitesi toplantısı',
                                status: 'open',
                                contactLinks: [],
                                tags: [],
                            },
                        ],
                    },
                });
            }
            return Promise.resolve({ data: { months: [], days: {}, outgoing: [], incoming: [], colleagues: [] } });
        });

        api.patch.mockResolvedValue({ data: { id: 301, status: 'open' } });

        render(<AgendaWorkspace />);

        // P0-1: Due & Overdue Reminders Inbox
        await waitFor(() => {
            expect(screen.getByText(/Bugün & Geciken Hatırlatmalar/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/\+10 dk Ertele/i)).toBeInTheDocument();

        // P0-2: Time Conflict detection & Rolled over badge
        expect(screen.getAllByText(/Saat Çakışması/i).length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText(/Önceki Günden Devir/i)).toBeInTheDocument();

        // P0-2: Open inline edit form
        const editButtons = screen.getAllByLabelText(/Düzenle \/ Yeniden Planla/i);
        fireEvent.click(editButtons[0]);
        expect(screen.getByText(/Değişiklikleri Kaydet/i)).toBeInTheDocument();

        // P0-3: Open selective rollover panel
        const selectiveBtn = screen.getByText(/Seçerek Devret/i);
        fireEvent.click(selectiveBtn);
        expect(screen.getByText(/Günü Kapat & Açık İşleri Seçerek Devret/i)).toBeInTheDocument();
    });
});
