import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import PropTypes from 'prop-types';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Optionally checks for specific roles
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading } = useContext(AuthContext);

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#0d1117',
                color: '#c9d1d9'
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #21262d',
                    borderTopColor: '#58a6ff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }}></div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check role-based access if roles are specified
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#0d1117',
                color: '#f85149',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Access Denied</h1>
                <p style={{ color: '#8b949e' }}>
                    You don&apos;t have permission to access this page.
                </p>
                <p style={{ color: '#8b949e' }}>
                    Required role: {allowedRoles.join(' or ')} | Your role: {user.role}
                </p>
            </div>
        );
    }

    return children;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
    allowedRoles: PropTypes.arrayOf(PropTypes.string)
};

export default ProtectedRoute;
