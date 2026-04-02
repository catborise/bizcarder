import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PageTransition from '../../components/layout/PageTransition';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
}));

describe('PageTransition', () => {
    it('renders children', () => {
        render(<PageTransition><p>Content</p></PageTransition>);
        expect(screen.getByText('Content')).toBeInTheDocument();
    });
});
