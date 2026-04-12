export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-12) var(--space-6)',
                textAlign: 'center',
            }}
        >
            {Icon && (
                <div
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'var(--gradient-primary)',
                        border: '1px solid var(--gradient-primary-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    <Icon size={28} style={{ color: 'var(--accent-secondary)' }} />
                </div>
            )}
            <h3 style={{ marginBottom: 'var(--space-2)', fontWeight: 600 }}>{title}</h3>
            <p
                style={{
                    color: 'var(--text-tertiary)',
                    fontSize: '0.875rem',
                    maxWidth: '360px',
                    marginBottom: onAction ? 'var(--space-6)' : 0,
                }}
            >
                {description}
            </p>
            {onAction && actionLabel && (
                <button
                    onClick={onAction}
                    className="glass-button"
                    style={{
                        background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 600,
                        padding: '10px 24px',
                    }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
