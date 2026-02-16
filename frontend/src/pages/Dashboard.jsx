import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import OrganizerDashboard from './OrganizerDashboard';
import AdminDashboard from './AdminDashboard';
import ProfileBanner from '../components/ProfileBanner';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    if (user?.role === 'admin') return <AdminDashboard />;
    if (user?.role === 'organizer') return <OrganizerDashboard />;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>Participant Dashboard</h1>
                    <p className="welcome-text">Explore and manage your registrations</p>
                </div>
            </header>

            <main className="dashboard-main">
                <ProfileBanner />

                <div className="dashboard-grid">
                    <div className="action-card primary" onClick={() => navigate('/events')}>
                        <div className="card-icon">🔎</div>
                        <h3>Browse Events</h3>
                        <p>Discover new workshops, fests, and competitions.</p>
                    </div>

                    <div className="action-card secondary" onClick={() => navigate('/my-registrations')}>
                        <div className="card-icon">🎟️</div>
                        <h3>My Registrations</h3>
                        <p>View your tickets and participation history.</p>
                    </div>

                    <div className="action-card tertiary" onClick={() => navigate('/organizers')}>
                        <div className="card-icon">🛡️</div>
                        <h3>Follow Clubs</h3>
                        <p>Get updates from your favorite organizations.</p>
                    </div>

                    <div className="action-card quaternary" onClick={() => navigate('/profile')}>
                        <div className="card-icon">👤</div>
                        <h3>My Profile</h3>
                        <p>Update your interests and security settings.</p>
                    </div>
                </div>

                <div className="info-box">
                    <h3>📢 Announcements</h3>
                    <p>New events are added every week! Follow your favorite clubs to never miss an update.</p>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
