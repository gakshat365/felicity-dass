import { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { FaCalendarAlt } from 'react-icons/fa';
import Notifications from './Notifications';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const renderLinks = () => {
        switch (user.role) {
            case 'admin':
                return (
                    <>
                        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
                        <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Manage Platform</Link>
                        <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
                    </>
                );
            case 'organizer':
                return (
                    <>
                        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
                        <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>Browse Events</Link>
                        <Link to="/events/create" className={`nav-link ${isActive('/events/create') ? 'active' : ''}`}>Create Event</Link>
                        <Link to="/events/my-events" className={`nav-link ${isActive('/events/my-events') ? 'active' : ''}`}>My Events</Link>
                        <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
                    </>
                );
            case 'participant':
                return (
                    <>
                        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
                        <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>Browse Events</Link>
                        <Link to="/organizers" className={`nav-link ${isActive('/organizers') ? 'active' : ''}`}>Clubs/Organizers</Link>
                        <Link to="/my-registrations" className={`nav-link ${isActive('/my-registrations') ? 'active' : ''}`}>My Events</Link>
                        <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    <span className="logo-icon"><FaCalendarAlt /></span>
                    <span className="logo-text">DASS Events</span>
                </Link>

                <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
                    {renderLinks()}
                    <Notifications />
                    <button onClick={handleLogout} className="logout-btn">
                        Logout
                    </button>
                </div>

                <div className="nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <div className={`hamburger ${isMenuOpen ? 'active' : ''}`}></div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
