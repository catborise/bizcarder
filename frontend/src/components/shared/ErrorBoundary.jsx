import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '60vh', padding: 'var(--space-6)',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '16px',
                        background: 'var(--gradient-error)', border: '1px solid var(--gradient-error-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 'var(--space-4)', fontSize: '28px',
                    }}>
                        ⚠️
                    </div>
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>Something went wrong</h3>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', maxWidth: '400px', marginBottom: 'var(--space-6)' }}>
                        An unexpected error occurred. Please refresh the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="glass-button"
                        style={{ fontWeight: 600, padding: '10px 24px' }}
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
