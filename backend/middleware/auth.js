// Authentication Middleware

// Kullanıcının oturum açmış olup olmadığını kontrol eder
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }

    // API istekleri için 401 döndür
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Bu işlem için oturum açmanız gerekiyor.'
        });
    }

    // Sayfa istekleri için login'e yönlendir
    res.redirect('/login');
};

// Kullanıcının belirli bir role sahip olup olmadığını kontrol eder
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Bu işlem için oturum açmanız gerekiyor.'
            });
        }

        if (req.user.role !== role) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Bu işlem için yetkiniz bulunmuyor.'
            });
        }

        next();
    };
};

// Admin yetkisi kontrolü
const requireAdmin = requireRole('admin');

module.exports = {
    requireAuth,
    requireRole,
    requireAdmin
};
