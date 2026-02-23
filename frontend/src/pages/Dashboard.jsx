import { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import OrganizerDashboard from './OrganizerDashboard';
import AdminDashboard from './AdminDashboard';
import ProfileBanner from '../components/ProfileBanner';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { format } from 'date-fns';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [recentRegistrations, setRecentRegistrations] = useState([]);
    const [forYouEvents, setForYouEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    useEffect(() => {
        if (user?.role === 'participant') {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            const [eventsRes, regsRes, forYouRes] = await Promise.all([
                axios.get('/registrations/my-registrations?type=upcoming'),
                axios.get('/registrations/my-registrations?type=completed'),
                axios.get('/events/for-you').catch(() => ({ data: [] })) // graceful fallback
            ]);
            setUpcomingEvents(eventsRes.data.slice(0, 4));
            setRecentRegistrations(regsRes.data.slice(0, 4));
            setForYouEvents(forYouRes.data.slice(0, 4));
        } catch (error) {
            console.error('Dashboard data fetch error:', error);
        } finally {
            setLoadingEvents(false);
        }
    };

    if (user?.role === 'admin') return <AdminDashboard />;
    if (user?.role === 'organizer') return <OrganizerDashboard />;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>Welcome back, {user?.firstName}! 👋</h1>
                    <p className="welcome-text">Explore and manage your registrations</p>
                </div>
            </header>

            <main className="dashboard-main">
                <ProfileBanner />

                {/* For You — Personalised by interests (Phase 2 requirement) */}
                {user?.interests?.length > 0 ? (
                    <div className="dashboard-section">
                        <div className="section-header">
                            <h2>✨ For You</h2>
                            <button className="see-all-btn" onClick={() => navigate('/events')}>Browse All →</button>
                        </div>
                        {forYouEvents.length > 0 ? (
                            <div className="upcoming-grid">
                                {forYouEvents.map(event => (
                                    <div key={event._id} className="upcoming-card" onClick={() => navigate(`/events/${event._id}`)}>
                                        <div className="upcoming-card-header">
                                            <span className="event-type-tag">{event.type}</span>
                                            {event.tags?.slice(0, 2).map(tag => (
                                                <span key={tag} className="interest-tag">#{tag}</span>
                                            ))}
                                        </div>
                                        <h4>{event.name}</h4>
                                        <p className="upcoming-date">📅 {event.startDate ? format(new Date(event.startDate), 'MMM dd, yyyy') : 'TBD'}</p>
                                        <p className="upcoming-organizer">by {event.organizer?.organizerName || 'Unknown'}</p>
                                        <span className="upcoming-status confirmed">Open</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-section">
                                <p>No upcoming events match your interests right now.</p>
                                <button className="btn btn-primary btn-sm" onClick={() => navigate('/events')}>Browse All Events</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="dashboard-section">
                        <div className="info-box" style={{ marginBottom: 0 }}>
                            <h3>✨ For You</h3>
                            <p>Set your interests on your <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate('/profile')}>Profile</span> to get personalised event recommendations.</p>
                        </div>
                    </div>
                )}

                {/* Upcoming Events Section */}
                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>🎫 Upcoming Events</h2>
                        <button className="see-all-btn" onClick={() => navigate('/my-registrations')}>
                            See All →
                        </button>
                    </div>
                    {loadingEvents ? (
                        <div className="loading-small">Loading...</div>
                    ) : upcomingEvents.length > 0 ? (
                        <div className="upcoming-grid">
                            {upcomingEvents.map(reg => (
                                <div key={reg._id} className="upcoming-card" onClick={() => navigate(`/events/${reg.event?._id}`)}>
                                    <div className="upcoming-card-header">
                                        <span className={`status-dot ${reg.status}`}></span>
                                        <span className="event-type-tag">{reg.registrationType}</span>
                                    </div>
                                    <h4>{reg.event?.name}</h4>
                                    <p className="upcoming-date">
                                        📅 {reg.event?.startDate ? format(new Date(reg.event.startDate), 'MMM dd, yyyy') : 'TBD'}
                                    </p>
                                    <p className="upcoming-organizer">
                                        by {reg.event?.organizer?.organizerName || 'Unknown'}
                                    </p>
                                    <span className={`upcoming-status ${reg.status}`}>{reg.status}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-section">
                            <p>You haven't registered for any upcoming events yet.</p>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/events')}>Browse Events</button>
                        </div>
                    )}
                </div>

                {/* Participation History */}
                {recentRegistrations.length > 0 && (
                    <div className="dashboard-section">
                        <div className="section-header">
                            <h2>📜 Recent Participation</h2>
                        </div>
                        <div className="history-list">
                            {recentRegistrations.map(reg => (
                                <div key={reg._id} className="history-item">
                                    <div className="history-info">
                                        <span className="history-name">{reg.event?.name}</span>
                                        <span className="history-date">
                                            {reg.event?.startDate ? format(new Date(reg.event.startDate), 'MMM dd') : ''}
                                        </span>
                                    </div>
                                    <span className={`history-status ${reg.attendanceStatus === 'Present' ? 'attended' : ''}`}>
                                        {reg.attendanceStatus === 'Present' ? '✓ Attended' : 'Completed'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
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
