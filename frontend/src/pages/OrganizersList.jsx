import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import './OrganizersList.css';

const OrganizersList = () => {
    const { user, setUser } = useContext(AuthContext);
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        fetchOrganizers();
    }, [categoryFilter]);

    const fetchOrganizers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (categoryFilter !== 'all') params.category = categoryFilter;

            const { data } = await axios.get('/users/organizers', { params });
            setOrganizers(data);
        } catch (error) {
            console.error('Error fetching organizers:', error);
            toast.error('Failed to load organizers');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async (organizerId) => {
        try {
            const { data } = await axios.post(`/users/follow/${organizerId}`);
            setUser(data.user);
            toast.success(data.action === 'followed' ? 'Following club!' : 'Unfollowed club');

            // Update local state to show updated follower count or status if needed
            fetchOrganizers();
        } catch (error) {
            toast.error('Search limit exceeded or server error');
        }
    };

    const isFollowing = (id) => user?.following?.some(f => f._id === id || f === id);

    const filteredOrganizers = organizers.filter(org =>
        org.organizerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="organizers-list-container">
            <header className="page-header">
                <div className="header-content">
                    <h1>🌟 Explore Clubs & Organizers</h1>
                    <p>Follow your favorite clubs to get personalized event updates</p>
                </div>
            </header>

            <div className="filters-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by club name or keywords..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="category-tabs">
                    <button
                        className={`cat-tab ${categoryFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setCategoryFilter('all')}
                    >All</button>
                    <button
                        className={`cat-tab ${categoryFilter === 'club' ? 'active' : ''}`}
                        onClick={() => setCategoryFilter('club')}
                    >Clubs</button>
                    <button
                        className={`cat-tab ${categoryFilter === 'council' ? 'active' : ''}`}
                        onClick={() => setCategoryFilter('council')}
                    >Councils</button>
                    <button
                        className={`cat-tab ${categoryFilter === 'fest-team' ? 'active' : ''}`}
                        onClick={() => setCategoryFilter('fest-team')}
                    >Fest Teams</button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading clubs...</div>
            ) : (
                <div className="organizers-grid">
                    {filteredOrganizers.length > 0 ? (
                        filteredOrganizers.map(org => (
                            <div key={org._id} className="organizer-card">
                                <div className="card-top">
                                    <span className={`category-tag ${org.category}`}>{org.category}</span>
                                    <span className="follower-count">👤 {org.followerCount || 0} followers</span>
                                </div>

                                <h3>{org.organizerName}</h3>
                                <p className="description">{org.description || 'No description provided.'}</p>

                                <div className="card-footer">
                                    <button
                                        className={`follow-btn ${isFollowing(org._id) ? 'following' : ''}`}
                                        onClick={() => handleFollowToggle(org._id)}
                                    >
                                        {isFollowing(org._id) ? '✓ Following' : '+ Follow'}
                                    </button>
                                    <button
                                        className="view-btn"
                                        onClick={() => {
                                            const navigate = require('react-router-dom').useNavigate;
                                            window.location.href = `/organizers/${org._id}`;
                                        }}
                                    >View Events</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-results">
                            <h3>No clubs found matching your search.</h3>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrganizersList;
