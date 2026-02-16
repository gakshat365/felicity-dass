/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to routes based on user roles
 */

/**
 * Middleware to check if user has required role(s)
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'organizer', 'participant')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, no user found' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
            });
        }

        next();
    };
};

/**
 * Middleware to check if user is admin
 */
const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, no user found' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Access denied. Admin privileges required.'
        });
    }

    next();
};

/**
 * Middleware to check if user is organizer
 */
const organizerOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, no user found' });
    }

    if (req.user.role !== 'organizer') {
        return res.status(403).json({
            message: 'Access denied. Organizer privileges required.'
        });
    }

    next();
};

/**
 * Middleware to check if user is participant
 */
const participantOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, no user found' });
    }

    if (req.user.role !== 'participant') {
        return res.status(403).json({
            message: 'Access denied. Participant access only.'
        });
    }

    next();
};

module.exports = {
    authorize,
    adminOnly,
    organizerOnly,
    participantOnly
};
