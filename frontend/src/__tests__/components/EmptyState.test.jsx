import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmptyState from '../../components/shared/EmptyState';
import { FaAddressCard } from 'react-icons/fa';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

describe('EmptyState', () => {
    it('renders title and description', () => {
        render(<EmptyState title="No items" description="Nothing here" />);
        expect(screen.getByText('No items')).toBeInTheDocument();
        expect(screen.getByText('Nothing here')).toBeInTheDocument();
    });

    it('renders action button when onAction provided', () => {
        const onClick = vi.fn();
        render(<EmptyState title="Empty" description="desc" actionLabel="Add" onAction={onClick} />);
        const btn = screen.getByText('Add');
        fireEvent.click(btn);
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('does not render button when no onAction', () => {
        render(<EmptyState title="Empty" description="desc" />);
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('renders icon when provided', () => {
        render(<EmptyState icon={FaAddressCard} title="Test" description="desc" />);
        // Icon renders as SVG
        expect(document.querySelector('svg')).toBeInTheDocument();
    });
});
