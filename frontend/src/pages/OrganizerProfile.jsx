import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../api/axios';
import AuthContext from '../context/AuthContext';
import EventCard from '../components/EventCard';
import './OrganizerProfile.css';
import toast from 'react-hot-toast';

const OrganizerProfile = () => {
    const { id } = useParams();
    const { user, updateUserProfile } = useContext(AuthContext);
    const [organizer, setOrganizer] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [orgRes, eventsRes] = await Promise.all([
                axios.get(`/users/organizers/${id}`),
                axios.get(`/events`, { params: { organizer: id, status: 'published,completed,ongoing' } })
            ]);
            setOrganizer(orgRes.data);
            setEvents(eventsRes.data);
        } catch (error) {
            console.error('Error fetching organizer data:', error);
            toast.error('Failed to load organizer profile');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async () => {
        if (!user) {
            toast.error('Please log in to follow clubs');
            return;
        }
        if (user.role !== 'participant') {
            toast.error('Only participants can follow clubs');
            return;
        }
        try {
            const { data } = await axios.post(`/users/follow/${id}`);
            updateUserProfile(data.user);
            setOrganizer(prev => ({
                ...prev,
                followerCount: data.action === 'followed' ? prev.followerCount + 1 : prev.followerCount - 1
            }));
            toast.success(data.action === 'followed' ? 'Following club!' : 'Unfollowed club');
        } catch (error) {
            toast.error('Error updating follow status');
        }
    };

    const isFollowing = user?.following?.some(f => f._id === id || f === id);

    if (loading) return <div className="loading">Loading profile...</div>;
    if (!organizer) return <div className="no-results">Organizer not found.</div>;

    const upcomingEvents = events.filter(e => e.status === 'published');
    const pastEvents = events.filter(e => e.status === 'completed' || e.status === 'ongoing');

    return (
        <div className="organizer-profile-container">
            <header className="profile-header">
                <div className="profile-info">
                    <span className={`category-tag ${organizer.category}`}>{organizer.category}</span>
                    <h1>{organizer.organizerName}</h1>
                    <p className="description">{organizer.description || 'No description provided.'}</p>
                    <div className="contact-info">
                        📧 <a href={`mailto:${organizer.contactEmail}`}>{organizer.contactEmail}</a>
                    </div>
                    <div className="follower-stats">
                        👤 {organizer.followerCount || 0} Followers
                    </div>
                </div>
                {!user ? (
                    <button className="follow-action-btn" onClick={() => toast.error('Please log in to follow clubs')}>
                        + Follow
                    </button>
                ) : user?.role === 'participant' && (
                    <button
                        className={`follow-action-btn ${isFollowing ? 'following' : ''}`}
                        onClick={handleFollowToggle}
                    >
                        {isFollowing ? '✓ Following' : '+ Follow'}
                    </button>
                )}
            </header>

            <main className="profile-content">
                <section className="events-section">
                    <h2>Upcoming Events</h2>
                    {upcomingEvents.length > 0 ? (
                        <div className="events-grid">
                            {upcomingEvents.map(event => (
                                <EventCard key={event._id} event={event} />
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">No upcoming events right now.</p>
                    )}
                </section>

                <section className="events-section">
                    <h2>Past & Ongoing Events</h2>
                    {pastEvents.length > 0 ? (
                        <div className="events-grid">
                            {pastEvents.map(event => (
                                <EventCard key={event._id} event={event} />
                            ))}
                        </div>
                    ) : (
                        <p className="empty-state">No past events found.</p>
                    )}
                </section>
            </main>
        </div>
    );
};

export default OrganizerProfile;
