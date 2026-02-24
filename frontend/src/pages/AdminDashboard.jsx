import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(new URLSearchParams(location.search).get('tab') || 'overview');

    useEffect(() => {
        const tab = new URLSearchParams(location.search).get('tab') || 'overview';
        setActiveTab(tab);
    }, [location.search]);

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalOrganizers: 0,
        totalParticipants: 0,
        totalEvents: 0,
        totalRegistrations: 0
    });
    const [allOrganizers, setAllOrganizers] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [passwordRequests, setPasswordRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddOrganizer, setShowAddOrganizer] = useState(false);
    const [newOrganizer, setNewOrganizer] = useState({
        email: '', organizerName: '', category: '', description: ''
    });
    const [createdOrgResult, setCreatedOrgResult] = useState(null);

    useEffect(() => {
        if (user?.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        fetchDashboardData();
    }, [user, navigate]);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, organizersRes, eventsRes, recoveryRes] = await Promise.all([
                axios.get('/admin/stats'),
                axios.get('/admin/organizers'),
                axios.get('/admin/events'),
                axios.get('/admin/password-requests')
            ]);

            setStats(statsRes.data);
            setAllOrganizers(organizersRes.data);
            setAllEvents(eventsRes.data);
            setPasswordRequests(recoveryRes.data);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordRequest = async (requestId, status) => {
        const notes = prompt('Enter notes for the user:');
        try {
            const { data } = await axios.patch(`/admin/password-requests/${requestId}`, {
                status,
                adminNotes: notes
            });
            toast.success(`Request ${status}`);
            if (data.status === 'approved') {
                alert(`SUCCESS! Temporary password generated: ${data.adminNotes.split('Temp Password: ')[1].split('.')[0]}. Please communicate this to the user manually.`);
            }
            fetchDashboardData();
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const handleDeleteOrganizer = async (id) => {
        if (!window.confirm('Are you sure? This will delete the organizer and all their events permanently.')) return;
        try {
            await axios.delete(`/admin/organizers/${id}`);
            toast.success('Organizer removed');
            fetchDashboardData();
        } catch (error) {
            toast.error('Deletion failed');
        }
    };

    const handleApproveOrganizer = async (organizerId) => {
        try {
            await axios.patch(`/admin/organizers/${organizerId}/approve`);
            toast.success('Organizer approved successfully');
            fetchDashboardData();
        } catch (error) {
            console.error('Approve error:', error);
            toast.error(error.response?.data?.message || 'Failed to approve organizer');
        }
    };

    const handleRejectOrganizer = async (organizerId) => {
        const reason = prompt('Enter rejection reason (optional):');
        try {
            await axios.patch(`/admin/organizers/${organizerId}/reject`, { reason });
            toast.success('Organizer rejected');
            fetchDashboardData();
        } catch (error) {
            console.error('Reject error:', error);
            toast.error(error.response?.data?.message || 'Failed to reject organizer');
        }
    };

    const handleToggleOrganizerStatus = async (organizerId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            await axios.patch(`/admin/organizers/${organizerId}/status`, { status: newStatus });
            toast.success(`Organizer ${newStatus === 'active' ? 'activated' : 'suspended'}`);
            fetchDashboardData();
        } catch (error) {
            console.error('Status toggle error:', error);
            toast.error('Failed to update organizer status');
        }
    };

    const handleCreateOrganizer = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('/admin/organizers', newOrganizer);
            toast.success('Organizer created successfully!');
            setCreatedOrgResult(data);
            setNewOrganizer({ email: '', organizerName: '', category: '', description: '' });
            fetchDashboardData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create organizer');
        }
    };

    const filteredOrganizers = allOrganizers.filter(org =>
        org.organizerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredEvents = allEvents.filter(event =>
        event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer?.organizerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="loading-container">Loading...</div>;
    }

    return (
        <div className="admin-dashboard-container">
            <header className="admin-header">
                <div className="header-content">
                    <h1>Admin Dashboard</h1>
                    <p className="header-subtitle">Platform Management & Analytics</p>
                </div>
            </header>

            <div className="admin-main">
                {/* Tabs */}
                <div className="tabs-container">
                    <button
                        className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab ${activeTab === 'organizers' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('organizers')}
                    >
                        All Organizers ({allOrganizers.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'events' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        All Events ({allEvents.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'recovery' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('recovery')}
                    >
                        Recovery ({passwordRequests.filter(r => r.status === 'pending').length})
                    </button>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="tab-content">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">👥</div>
                                <div className="stat-info">
                                    <div className="stat-value">{stats.totalUsers}</div>
                                    <div className="stat-label">Total Users</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">🎭</div>
                                <div className="stat-info">
                                    <div className="stat-value">{stats.totalOrganizers}</div>
                                    <div className="stat-label">Organizers</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">🎫</div>
                                <div className="stat-info">
                                    <div className="stat-value">{stats.totalParticipants}</div>
                                    <div className="stat-label">Participants</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">🎉</div>
                                <div className="stat-info">
                                    <div className="stat-value">{stats.totalEvents}</div>
                                    <div className="stat-label">Total Events</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">📝</div>
                                <div className="stat-info">
                                    <div className="stat-value">{stats.totalRegistrations}</div>
                                    <div className="stat-label">Registrations</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* All Organizers Tab */}
                {activeTab === 'organizers' && (
                    <div className="tab-content">
                        <div className="search-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Search organizers by name, email, or category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                                style={{ flex: 1 }}
                            />
                            <button
                                onClick={() => { setShowAddOrganizer(!showAddOrganizer); setCreatedOrgResult(null); }}
                                className="btn btn-primary btn-sm"
                            >
                                {showAddOrganizer ? 'Cancel' : '+ Add Organizer'}
                            </button>
                        </div>

                        {showAddOrganizer && (
                            <div className="add-organizer-form" style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '24px', marginBottom: '20px' }}>
                                <h3 style={{ color: '#c9d1d9', marginBottom: '16px' }}>Create New Organizer</h3>
                                {createdOrgResult ? (
                                    <div style={{ background: '#0d1117', border: '1px solid #3fb950', borderRadius: '8px', padding: '20px' }}>
                                        <p style={{ color: '#3fb950', fontWeight: 'bold', marginBottom: '8px' }}>✅ Organizer Created Successfully!</p>
                                        <p style={{ color: '#c9d1d9' }}><strong>Email:</strong> {createdOrgResult.email}</p>
                                        <p style={{ color: '#f0883e', fontFamily: 'monospace', fontSize: '18px', marginTop: '8px' }}>
                                            <strong>Temporary Password:</strong> {createdOrgResult.password}
                                        </p>
                                        <p style={{ color: '#8b949e', fontSize: '13px', marginTop: '8px' }}>⚠️ Share this password securely with the organizer. They should change it on first login.</p>
                                        <button onClick={() => { setShowAddOrganizer(false); setCreatedOrgResult(null); }} className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>Close</button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleCreateOrganizer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group">
                                            <label style={{ color: '#8b949e', display: 'block', marginBottom: '6px' }}>Email *</label>
                                            <input type="email" className="form-input" required value={newOrganizer.email}
                                                onChange={(e) => setNewOrganizer({ ...newOrganizer, email: e.target.value })}
                                                placeholder="organizer@clubs.iiit.ac.in"
                                                style={{ width: '100%', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ color: '#8b949e', display: 'block', marginBottom: '6px' }}>Organizer Name *</label>
                                            <input type="text" className="form-input" required value={newOrganizer.organizerName}
                                                onChange={(e) => setNewOrganizer({ ...newOrganizer, organizerName: e.target.value })}
                                                placeholder="e.g. Programming Club"
                                                style={{ width: '100%', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ color: '#8b949e', display: 'block', marginBottom: '6px' }}>Category *</label>
                                            <select className="form-input" required value={newOrganizer.category}
                                                onChange={(e) => setNewOrganizer({ ...newOrganizer, category: e.target.value })}
                                                style={{ width: '100%', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }}>
                                                <option value="">Select category</option>
                                                <option value="club">Club</option>
                                                <option value="council">Council</option>
                                                <option value="fest-team">Fest Team</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ color: '#8b949e', display: 'block', marginBottom: '6px' }}>Description</label>
                                            <input type="text" className="form-input" value={newOrganizer.description}
                                                onChange={(e) => setNewOrganizer({ ...newOrganizer, description: e.target.value })}
                                                placeholder="Brief description"
                                                style={{ width: '100%', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <button type="submit" className="btn btn-success btn-sm">Create Organizer</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}

                        <div className="organizers-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Category</th>
                                        <th>Status</th>
                                        <th>Events</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrganizers.map(org => (
                                        <tr key={org._id}>
                                            <td className="org-name">{org.organizerName}</td>
                                            <td>{org.email}</td>
                                            <td>{org.category}</td>
                                            <td>
                                                <span className={`status-badge status-${org.approvalStatus}`}>
                                                    {org.approvalStatus}
                                                </span>
                                            </td>
                                            <td>{org.eventsCount || 0}</td>
                                            <td>{format(new Date(org.createdAt), 'MMM dd, yyyy')}</td>
                                            <td>
                                                {org.approvalStatus === 'approved' ? (
                                                    <div className="table-actions">
                                                        <button
                                                            onClick={() => handleToggleOrganizerStatus(org._id, org.status)}
                                                            className={`btn btn-sm ${org.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                                                        >
                                                            {org.status === 'active' ? 'Suspend' : 'Activate'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteOrganizer(org._id)}
                                                            className="btn btn-sm btn-danger"
                                                            title="Delete Permanently"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                ) : org.approvalStatus === 'pending' ? (
                                                    <div className="table-actions">
                                                        <button
                                                            onClick={() => handleApproveOrganizer(org._id)}
                                                            className="btn btn-sm btn-success"
                                                        >
                                                            ✓ Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectOrganizer(org._id)}
                                                            className="btn btn-sm btn-warning"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteOrganizer(org._id)}
                                                            className="btn btn-sm btn-danger"
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="table-actions">
                                                        <button
                                                            onClick={() => handleDeleteOrganizer(org._id)}
                                                            className="btn btn-sm btn-danger"
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* All Events Tab */}
                {activeTab === 'events' && (
                    <div className="tab-content">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Search events by name or organizer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="events-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Event Name</th>
                                        <th>Organizer</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Registrations</th>
                                        <th>Start Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEvents.map(event => (
                                        <tr key={event._id}>
                                            <td className="event-name">{event.name}</td>
                                            <td>{event.organizer?.organizerName}</td>
                                            <td>{event.type}</td>
                                            <td>
                                                <span className={`status-badge status-${event.status}`}>
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td>{event.registrationCount || 0}</td>
                                            <td>{format(new Date(event.startDate), 'MMM dd, yyyy')}</td>
                                            <td>
                                                <div className="admin-row-actions">
                                                    <button
                                                        onClick={() => navigate(`/events/${event._id}`)}
                                                        className="btn btn-secondary btn-sm"
                                                    >
                                                        Public View
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/events/organizer/${event._id}`)}
                                                        className="btn btn-primary btn-sm"
                                                    >
                                                        Analytics
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {/* Recovery Requests Tab */}
                {activeTab === 'recovery' && (
                    <div className="tab-content">
                        {passwordRequests.length === 0 ? (
                            <div className="empty-state">
                                <p>No recovery requests found.</p>
                            </div>
                        ) : (
                            <div className="requests-list">
                                {passwordRequests.map(req => (
                                    <div key={req._id} className={`request-card status-${req.status}`}>
                                        <div className="request-header">
                                            <h4>{req.user?.organizerName || `${req.user?.firstName} ${req.user?.lastName}`}</h4>
                                            <span className={`status-badge ${req.status}`}>{req.status}</span>
                                        </div>
                                        <div className="request-body">
                                            <p><strong>Email:</strong> {req.email}</p>
                                            <p><strong>Reason:</strong> {req.reason}</p>
                                            <p><strong>Requested:</strong> {format(new Date(req.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                                            {req.adminNotes && (
                                                <div className="admin-notes-display">
                                                    <strong>Admin Note:</strong>
                                                    <p>{req.adminNotes}</p>
                                                </div>
                                            )}
                                        </div>
                                        {req.status === 'pending' && (
                                            <div className="card-actions">
                                                <button onClick={() => handlePasswordRequest(req._id, 'approved')} className="btn btn-success btn-sm">Approve & Reset</button>
                                                <button onClick={() => handlePasswordRequest(req._id, 'rejected')} className="btn btn-danger btn-sm">Reject</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
