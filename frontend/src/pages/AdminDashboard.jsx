import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalOrganizers: 0,
        totalParticipants: 0,
        totalEvents: 0,
        totalRegistrations: 0,
        pendingOrganizers: 0
    });
    const [pendingOrganizers, setPendingOrganizers] = useState([]);
    const [allOrganizers, setAllOrganizers] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [passwordRequests, setPasswordRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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
            setPendingOrganizers(organizersRes.data.filter(o => o.approvalStatus === 'pending'));
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
                        className={`tab ${activeTab === 'pending' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pending Approvals ({pendingOrganizers.length})
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

                            <div className="stat-card highlight">
                                <div className="stat-icon">⏳</div>
                                <div className="stat-info">
                                    <div className="stat-value">{stats.pendingOrganizers}</div>
                                    <div className="stat-label">Pending Approvals</div>
                                </div>
                            </div>
                        </div>

                        <div className="quick-actions">
                            <h3>Quick Actions</h3>
                            <div className="actions-grid">
                                <button
                                    onClick={() => setActiveTab('pending')}
                                    className="action-btn"
                                    disabled={pendingOrganizers.length === 0}
                                >
                                    <span className="action-icon">✅</span>
                                    <span>Review Pending Organizers</span>
                                    {pendingOrganizers.length > 0 && (
                                        <span className="action-badge">{pendingOrganizers.length}</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('organizers')}
                                    className="action-btn"
                                >
                                    <span className="action-icon">👥</span>
                                    <span>Manage Organizers</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('events')}
                                    className="action-btn"
                                >
                                    <span className="action-icon">🎉</span>
                                    <span>View All Events</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Approvals Tab */}
                {activeTab === 'pending' && (
                    <div className="tab-content">
                        {pendingOrganizers.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">✅</div>
                                <p>No pending organizer approvals</p>
                            </div>
                        ) : (
                            <div className="organizers-grid">
                                {pendingOrganizers.map(org => (
                                    <div key={org._id} className="organizer-card pending">
                                        <div className="card-header">
                                            <h4>{org.organizerName}</h4>
                                            <span className="status-badge status-pending">Pending</span>
                                        </div>
                                        <div className="card-body">
                                            <div className="info-row">
                                                <span className="info-label">Email:</span>
                                                <span className="info-value">{org.email}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="info-label">Category:</span>
                                                <span className="info-value">{org.category}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="info-label">Contact:</span>
                                                <span className="info-value">{org.contactEmail}</span>
                                            </div>
                                            {org.description && (
                                                <div className="info-row">
                                                    <span className="info-label">Description:</span>
                                                    <p className="description">{org.description}</p>
                                                </div>
                                            )}
                                            <div className="info-row">
                                                <span className="info-label">Registered:</span>
                                                <span className="info-value">
                                                    {format(new Date(org.createdAt), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button
                                                onClick={() => handleRejectOrganizer(org._id)}
                                                className="btn btn-danger btn-sm"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleApproveOrganizer(org._id)}
                                                className="btn btn-success btn-sm"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* All Organizers Tab */}
                {activeTab === 'organizers' && (
                    <div className="tab-content">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Search organizers by name, email, or category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

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
                                                {org.approvalStatus === 'approved' && (
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
