import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import ErrorBoundary from '../../components/shared/ErrorBoundary';

const ThrowError = () => { throw new Error('Test crash'); };

describe('ErrorBoundary', () => {
    // Suppress console.error from React for expected errors
    const originalError = console.error;
    beforeAll(() => { console.error = vi.fn(); });
    afterAll(() => { console.error = originalError; });

    it('renders children when no error', () => {
        render(<ErrorBoundary><div>Hello</div></ErrorBoundary>);
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('renders fallback UI when child throws', () => {
        render(<ErrorBoundary><ThrowError /></ErrorBoundary>);
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });
});
