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
    const [activeTab, setActiveTab] = useState('normal');
    const [tabRegistrations, setTabRegistrations] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        if (user?.role === 'participant') {
            fetchDashboardData();
        }
    }, [user]);

    useEffect(() => {
        if (user?.role === 'participant') {
            fetchTabRegistrations();
        }
    }, [activeTab, user]);

    const fetchTabRegistrations = async () => {
        try {
            setTabLoading(true);
            const { data } = await axios.get(`/registrations/my-registrations?type=${activeTab}`);
            setTabRegistrations(data);
        } catch (error) {
            console.error('Tab data fetch error:', error);
        } finally {
            setTabLoading(false);
        }
    };

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

                {/* Registration History — Tabbed (Section 9.2) */}
                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>🎟️ My Registrations</h2>
                        <button className="see-all-btn" onClick={() => navigate('/my-registrations')}>
                            Full View →
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {[
                            { id: 'normal', label: 'Normal' },
                            { id: 'merchandise', label: 'Merchandise' },
                            { id: 'completed', label: 'Completed' },
                            { id: 'cancelled', label: 'Cancelled/Rejected' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: activeTab === tab.id ? '2px solid #58a6ff' : '1px solid #30363d',
                                    background: activeTab === tab.id ? '#1f6feb22' : '#21262d',
                                    color: activeTab === tab.id ? '#58a6ff' : '#8b949e',
                                    cursor: 'pointer',
                                    fontWeight: activeTab === tab.id ? 600 : 400,
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {tabLoading ? (
                        <div className="loading-small">Loading...</div>
                    ) : tabRegistrations.length > 0 ? (
                        <div className="upcoming-grid">
                            {tabRegistrations.map(reg => (
                                <div key={reg._id} className="upcoming-card" style={{ cursor: 'default' }}>
                                    <div className="upcoming-card-header">
                                        <span className={`status-dot ${reg.status}`}></span>
                                        <span className="event-type-tag">{reg.registrationType}</span>
                                    </div>
                                    <h4
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/events/${reg.event?._id}`)}
                                    >
                                        {reg.event?.name}
                                    </h4>
                                    <p className="upcoming-date">
                                        📅 {reg.event?.startDate ? format(new Date(reg.event.startDate), 'MMM dd, yyyy') : 'TBD'}
                                    </p>
                                    <p className="upcoming-organizer">
                                        by {reg.event?.organizer?.organizerName || 'Unknown'}
                                    </p>
                                    <span className={`upcoming-status ${reg.status}`}>{reg.status}</span>

                                    {/* Clickable Ticket ID */}
                                    {reg.ticketId && reg.status === 'confirmed' ? (
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #30363d' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>Ticket: </span>
                                            <span
                                                onClick={() => setSelectedTicket(reg)}
                                                style={{
                                                    cursor: 'pointer',
                                                    color: '#58a6ff',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 600,
                                                    textDecoration: 'underline',
                                                    fontSize: '0.85rem'
                                                }}
                                                title="Click to view ticket"
                                            >
                                                {reg.ticketId}
                                            </span>
                                        </div>
                                    ) : reg.status !== 'confirmed' && (
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #30363d', fontSize: '0.8rem', color: '#8b949e' }}>
                                            Ticket: {reg.status === 'rejected' || reg.status === 'cancelled' ? '—' : '⏳ Pending'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-section">
                            <p>No registrations in this category.</p>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/events')}>Browse Events</button>
                        </div>
                    )}
                </div>

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

            {/* Ticket Modal */}
            {selectedTicket && (
                <div
                    onClick={() => setSelectedTicket(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                >
                    <div
                        style={{ background: '#161b22', borderRadius: '12px', maxWidth: '400px', width: '90%', border: '1px solid #30363d' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#e6edf3' }}>Event Ticket</h2>
                            <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                            {selectedTicket.ticketQRCode && (
                                <div style={{ marginBottom: '16px' }}>
                                    <img src={selectedTicket.ticketQRCode} alt="QR Code" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                                </div>
                            )}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px' }}>Ticket ID</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, color: '#58a6ff' }}>{selectedTicket.ticketId}</div>
                            </div>
                            <h3 style={{ color: '#e6edf3', margin: '8px 0 4px' }}>{selectedTicket.event?.name}</h3>
                            <p style={{ color: '#8b949e', fontSize: '0.9rem' }}>by {selectedTicket.event?.organizer?.organizerName}</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', fontSize: '0.85rem', color: '#c9d1d9' }}>
                                <span>📅 {selectedTicket.event?.startDate ? format(new Date(selectedTicket.event.startDate), 'MMM dd, yyyy') : 'TBD'}</span>
                                <span>🎫 {selectedTicket.registrationType}</span>
                            </div>
                            {selectedTicket.teamName && (
                                <p style={{ marginTop: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>👥 Team: {selectedTicket.teamName}</p>
                            )}
                            <p style={{ marginTop: '16px', fontSize: '0.8rem', color: '#8b949e' }}>
                                Show this QR code at the event entrance
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
