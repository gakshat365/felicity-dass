import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './OrganizerDashboard.css';

const OrganizerDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRegistrations: 0,
        totalRevenue: 0,
        averageAttendance: 0,
        activeEvents: 0
    });
    const [carouselIndex, setCarouselIndex] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [eventsRes, statsRes] = await Promise.all([
                axios.get('/events/organizer/my-events'),
                axios.get('/events/organizer/stats') // I need to implement this endpoint
            ]);
            setEvents(eventsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // Fallback for stats if endpoint not yet ready
            setStats({
                totalRegistrations: events.reduce((acc, curr) => acc + (curr.registrationCount || 0), 0),
                totalRevenue: events.reduce((acc, curr) => acc + (curr.revenue || 0), 0),
                averageAttendance: 0,
                activeEvents: events.filter(e => e.status === 'published' || e.status === 'ongoing').length
            });
        } finally {
            setLoading(false);
        }
    };

    const nextSlide = () => {
        setCarouselIndex((prev) => (prev + 1) % Math.max(events.length, 1));
    };

    const prevSlide = () => {
        setCarouselIndex((prev) => (prev - 1 + events.length) % Math.max(events.length, 1));
    };

    if (loading) return <div className="loading">Loading dashboard...</div>;

    const currentEvent = events[carouselIndex];

    return (
        <div className="organizer-dash-container">
            <header className="dash-header">
                <div>
                    <h1>👋 Welcome, {user.organizerName}</h1>
                    <p>Here's what's happening with your events today.</p>
                </div>
                <div className="header-actions">
                    <button
                        className="scanner-btn"
                        onClick={() => navigate('/scanner')}
                    >
                        📷 Open Scanner
                    </button>
                    <button
                        className="create-btn"
                        onClick={() => navigate('/events/create')}
                    >
                        + Create New Event
                    </button>
                </div>
            </header>

            {/* Quick Stats Section */}
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-label">Total Registrations</span>
                    <span className="stat-value">{stats.totalRegistrations}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Revenue</span>
                    <span className="stat-value">₹{stats.totalRevenue}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Active Events</span>
                    <span className="stat-value">{stats.activeEvents}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Avg. Attendance</span>
                    <span className="stat-value">{stats.averageAttendance}%</span>
                </div>
            </div>

            {/* Events Carousel */}
            <div className="carousel-section">
                <h2>Your Events</h2>
                {events.length > 0 ? (
                    <div className="carousel-container">
                        <button className="carousel-control prev" onClick={prevSlide}>❮</button>

                        <div className="carousel-card-wrapper">
                            <div className="event-carousel-card">
                                <div className="card-image-placeholder">
                                    <div className={`status-badge ${currentEvent.status}`}>{currentEvent.status}</div>
                                </div>
                                <div className="card-content">
                                    <div className="card-header">
                                        <span className="event-type">{currentEvent.type}</span>
                                        <h3>{currentEvent.name}</h3>
                                    </div>
                                    {format(new Date(currentEvent.startDate), 'MMM dd, yyyy')}
                                    <div className="card-stats">
                                        <div>
                                            <span className="stat-num">{currentEvent.registrationCount || 0}</span>
                                            <span className="stat-meta">Regs</span>
                                        </div>
                                        <div>
                                            <span className="stat-num">₹{currentEvent.revenue || 0}</span>
                                            <span className="stat-meta">Revenue</span>
                                        </div>
                                    </div>
                                    <Link to={`/events/organizer/${currentEvent._id}`} className="manage-link">
                                        Manage Event {'->'}
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <button className="carousel-control next" onClick={nextSlide}>❯</button>
                    </div>
                ) : (
                    <div className="empty-carousel">
                        <p>You haven't created any events yet.</p>
                        <button onClick={() => navigate('/events/create')}>Start Creating</button>
                    </div>
                )}
            </div>

            {/* Recent Activity / Analytics Placeholder */}
            <div className="analytics-preview">
                <h2>📈 Platform Growth</h2>
                <div className="chart-placeholder">
                    {/* In a real app, use Chart.js here */}
                    <div className="bar-container">
                        {[40, 70, 45, 90, 65, 80, 95].map((h, i) => (
                            <div key={i} className="bar" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    <div className="chart-labels">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizerDashboard;
