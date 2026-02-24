import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_COLORS = {
    draft: { bg: '#21262d', text: '#8b949e', border: '#30363d' },
    published: { bg: '#122d1e', text: '#3fb950', border: '#238636' },
    ongoing: { bg: '#1a1f6e', text: '#79c0ff', border: '#1f6feb' },
    completed: { bg: '#1f1a22', text: '#bc8cff', border: '#6e40c9' },
    cancelled: { bg: '#2d1a1a', text: '#f85149', border: '#6e2020' },
};

const MyEvents = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(searchParams.get('filter') || 'all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchMyEvents();
    }, []);

    const fetchMyEvents = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/events/organizer/my-events');
            setEvents(data);
        } catch {
            toast.error('Failed to load your events');
        } finally {
            setLoading(false);
        }
    };

    const filtered = events.filter(e => {
        const matchStatus = filter === 'all' || e.status === filter;
        const matchSearch = !search ||
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.type.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const counts = {
        all: events.length,
        published: events.filter(e => e.status === 'published').length,
        ongoing: events.filter(e => e.status === 'ongoing').length,
        draft: events.filter(e => e.status === 'draft').length,
        completed: events.filter(e => e.status === 'completed').length,
        cancelled: events.filter(e => e.status === 'cancelled').length,
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9d1d9' }}>
            Loading your events…
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#0d1117', padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ color: '#c9d1d9', fontSize: '24px', fontWeight: 700, margin: 0 }}>My Events</h1>
                    <p style={{ color: '#8b949e', margin: '4px 0 0', fontSize: '14px' }}>
                        {events.length} event{events.length !== 1 ? 's' : ''} total
                    </p>
                </div>
                <button
                    onClick={() => navigate('/events/create')}
                    style={{ padding: '10px 20px', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                    + Create New Event
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {['all', 'published', 'ongoing', 'draft', 'completed', 'cancelled'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: `1px solid ${filter === s ? '#58a6ff' : '#30363d'}`,
                            background: filter === s ? 'rgba(88,166,255,0.12)' : '#161b22',
                            color: filter === s ? '#58a6ff' : '#8b949e',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                        }}
                    >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                        <span style={{ marginLeft: '6px', opacity: 0.7 }}>({counts[s]})</span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: '24px' }}>
                <input
                    type="text"
                    placeholder="Search by event name or type..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '360px',
                        padding: '10px 14px',
                        background: '#161b22',
                        border: '1px solid #30363d',
                        borderRadius: '6px',
                        color: '#c9d1d9',
                        fontSize: '14px',
                        outline: 'none',
                    }}
                />
            </div>

            {/* Event cards */}
            {filtered.length === 0 ? (
                <div style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '10px',
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: '#8b949e',
                }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
                    <p style={{ fontSize: '16px', marginBottom: '4px' }}>
                        {filter === 'all' ? "You haven't created any events yet." : `No ${filter} events.`}
                    </p>
                    {filter === 'all' && (
                        <button
                            onClick={() => navigate('/events/create')}
                            style={{ marginTop: '16px', padding: '10px 20px', background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            Create your first event
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {filtered.map(event => {
                        const sc = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
                        const isOngoing = event.status === 'ongoing';
                        return (
                            <div
                                key={event._id}
                                style={{
                                    background: '#161b22',
                                    border: `1px solid ${isOngoing ? '#1f6feb' : '#30363d'}`,
                                    borderRadius: '10px',
                                    padding: '20px 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px',
                                    flexWrap: 'wrap',
                                    boxShadow: isOngoing ? '0 0 0 1px #1f6feb22' : 'none',
                                    transition: 'border-color 0.2s',
                                }}
                            >
                                {/* Status dot */}
                                <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: sc.text, flexShrink: 0,
                                    boxShadow: isOngoing ? `0 0 6px ${sc.text}` : 'none',
                                    animation: isOngoing ? 'pulse 2s infinite' : 'none',
                                }} />

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: '180px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <span style={{ color: '#c9d1d9', fontWeight: 600, fontSize: '16px' }}>{event.name}</span>
                                        <span style={{
                                            padding: '2px 10px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            background: sc.bg,
                                            color: sc.text,
                                            border: `1px solid ${sc.border}`,
                                        }}>
                                            {isOngoing && '🔴 '}{event.status}
                                        </span>
                                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}>
                                            {event.type}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#8b949e', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <span>📅 {format(new Date(event.startDate), 'MMM dd, yyyy')}</span>
                                        <span>👥 {event.registrationCount || 0} registered</span>
                                        {event.registrationFee > 0
                                            ? <span>₹{event.registrationFee} fee</span>
                                            : <span>Free</span>
                                        }
                                        {event.tags?.length > 0 && (
                                            <span>🏷 {event.tags.join(', ')}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button
                                        onClick={() => navigate(`/events/organizer/${event._id}`)}
                                        style={{ padding: '8px 14px', background: '#1f6feb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                                    >
                                        Manage →
                                    </button>
                                    {['draft', 'published'].includes(event.status) && (
                                        <button
                                            onClick={() => navigate(`/events/edit/${event._id}`)}
                                            style={{ padding: '8px 14px', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                                        >
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigate(`/events/${event._id}`)}
                                        style={{ padding: '8px 14px', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                        Public View
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};

export default MyEvents;
