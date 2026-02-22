import { useState, useEffect, useContext } from 'react';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import EventCard from '../components/EventCard';
import './BrowseEvents.css';

const BrowseEvents = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [trendingEvents, setTrendingEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followedOnly, setFollowedOnly] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        type: 'all',
        eligibility: 'all',
        startDate: '',
        endDate: '',
        tags: 'all'
    });

    useEffect(() => {
        fetchEvents();
        fetchTrending();
    }, [filters, followedOnly]);

    const fetchEvents = async () => {
        try {
            setLoading(true);

            const params = {};
            if (filters.type !== 'all') params.type = filters.type;
            if (filters.tags !== 'all') params.tags = filters.tags;
            if (filters.eligibility !== 'all') params.eligibility = filters.eligibility;
            if (filters.search) params.search = filters.search;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (followedOnly && user) params.followedOnly = 'true';

            const { data } = await axios.get('/events', { params });
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTrending = async () => {
        try {
            const { data } = await axios.get('/events/trending');
            setTrendingEvents(data.slice(0, 5));
        } catch (error) {
            console.error('Error fetching trending:', error);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    return (
        <div className="browse-container">
            <header className="page-header">
                <h1>Browse Events</h1>
                <p>Welcome to Felicity 2026</p>
            </header>

            {/* Trending Section */}
            {trendingEvents.length > 0 && (
                <section className="trending-section">
                    <h2> Trending Now </h2>
                    <div className="trending-scroll">
                        {trendingEvents.map(event => (
                            <div key={event._id} className="trending-card" onClick={() => navigate(`/events/${event._id}`)}>
                                <div className="trending-badge">#Trending</div>
                                <h4>{event.name}</h4>
                                <p>{event.registrationCount} candidates registered</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="browse-layout">
                {/* Filters Sidebar */}
                <aside className="filters-sidebar">
                    <h3>Filters</h3>
                    <div className="filter-group">
                        <label>Search</label>
                        <input
                            type="text"
                            name="search"
                            placeholder="Type to search..."
                            value={filters.search}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Event Type</label>
                        <select name="type" value={filters.type} onChange={handleFilterChange}>
                            <option value="all">All Types</option>
                            <option value="normal">Events</option>
                            <option value="merchandise">Merchandise</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Eligibility</label>
                        <select name="eligibility" value={filters.eligibility} onChange={handleFilterChange}>
                            <option value="all">All Participants</option>
                            <option value="IIIT Students Only">IIIT Students Only</option>
                            <option value="Outside IIIT Only">Outside IIIT Only</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Date Range</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    </div>

                    <div className="filter-group">
                        <label>Category</label>
                        <select name="tags" value={filters.tags} onChange={handleFilterChange}>
                            <option value="all">All Categories</option>
                            <option value="dance">Dance</option>
                            <option value="music">Music</option>
                            <option value="coding">Coding</option>
                            <option value="hacking">Hacking</option>
                            <option value="art">Art</option>
                        </select>
                    </div>

                    {user?.role === 'participant' && (
                        <div className="filter-group">
                            <label>Followed Clubs</label>
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={followedOnly}
                                    onChange={(e) => setFollowedOnly(e.target.checked)}
                                />
                                <span>Show only from clubs I follow</span>
                            </label>
                        </div>
                    )}
                </aside>

                <main className="events-main">
                    {loading ? (
                        <div className="loading">Searching events...</div>
                    ) : events.length === 0 ? (
                        <div className="no-results">
                            <h3>No events found matching your criteria.</h3>
                            <button onClick={() => {
                                setFilters({
                                    search: '', type: 'all', eligibility: 'all', startDate: '', endDate: '', tags: 'all'
                                });
                                setFollowedOnly(false);
                            }}>Clear Filters</button>
                        </div>
                    ) : (
                        <div className="events-grid">
                            {events.map(event => (
                                <EventCard key={event._id} event={event} />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default BrowseEvents;
