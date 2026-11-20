import { Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const { t } = useTranslation('common');
    const location = useLocation();

    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '60vh',
                    fontSize: '18px',
                    color: 'var(--text-tertiary)',
                }}
            >
                {t('loading')}
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && user?.role !== 'admin') {
        return <Navigate to="/access-denied" replace />;
    }

    return children;
};

export default ProtectedRoute;
