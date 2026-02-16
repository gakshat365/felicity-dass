import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import FeedbackModal from '../components/FeedbackModal';
import './MyRegistrations.css';

const MyRegistrations = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [feedbackEvent, setFeedbackEvent] = useState(null);

    useEffect(() => {
        fetchRegistrations();
    }, [activeTab]);

    const fetchRegistrations = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/registrations/my-registrations?type=${activeTab}`);
            setRegistrations(data);
        } catch (error) {
            console.error('Error fetching registrations:', error);
            toast.error('Failed to load registrations');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRegistration = async (registrationId) => {
        if (!window.confirm('Are you sure you want to cancel this registration?')) {
            return;
        }

        try {
            await axios.patch(`/registrations/${registrationId}/cancel`);
            toast.success('Registration cancelled successfully');
            fetchRegistrations();
        } catch (error) {
            console.error('Cancel error:', error);
            toast.error(error.response?.data?.message || 'Failed to cancel registration');
        }
    };

    const getStatusBadgeClass = (status) => {
        const classes = {
            pending: 'status-pending',
            confirmed: 'status-confirmed',
            cancelled: 'status-cancelled',
            rejected: 'status-rejected'
        };
        return classes[status] || 'status-pending';
    };

    const getPaymentStatusBadge = (registration) => {
        if (!registration.paymentRequired) return null;

        const statusMap = {
            pending: { text: 'Payment Pending', class: 'payment-pending' },
            proof_uploaded: { text: 'Under Review', class: 'payment-review' },
            approved: { text: 'Payment Approved', class: 'payment-approved' },
            rejected: { text: 'Payment Rejected', class: 'payment-rejected' }
        };

        const status = statusMap[registration.paymentStatus] || statusMap.pending;
        return <span className={`payment-badge ${status.class}`}>{status.text}</span>;
    };

    const tabs = [
        { id: 'upcoming', label: 'Upcoming Events' },
        { id: 'normal', label: 'Normal Events' },
        { id: 'merchandise', label: 'Merchandise' },
        { id: 'completed', label: 'Completed' },
        { id: 'cancelled', label: 'Cancelled/Rejected' }
    ];

    return (
        <div className="registrations-container">
            <header className="registrations-header">
                <div className="header-content">
                    <h1>My Registrations</h1>
                    <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-sm">
                        Back to Dashboard
                    </button>
                </div>
            </header>

            <div className="registrations-main">
                {/* Tabs */}
                <div className="tabs-container">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="registrations-content">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading registrations...</p>
                        </div>
                    ) : registrations.length === 0 ? (
                        <div className="empty-state">
                            <h3>No registrations found</h3>
                            <p>You haven't registered for any events in this category yet.</p>
                            <button onClick={() => navigate('/events')} className="btn btn-primary">
                                Browse Events
                            </button>
                        </div>
                    ) : (
                        <div className="registrations-grid">
                            {registrations.map(registration => (
                                <div key={registration._id} className="registration-card">
                                    <div className="card-header">
                                        <h3>{registration.event?.name}</h3>
                                        <span className={`status-badge ${getStatusBadgeClass(registration.status)}`}>
                                            {registration.status}
                                        </span>
                                    </div>

                                    <div className="card-body">
                                        <div className="info-row">
                                            <span className="info-label">Type:</span>
                                            <span className="info-value">{registration.registrationType}</span>
                                        </div>

                                        <div className="info-row">
                                            <span className="info-label">Organizer:</span>
                                            <span className="info-value">
                                                {registration.event?.organizer?.organizerName || 'N/A'}
                                            </span>
                                        </div>

                                        <div className="info-row">
                                            <span className="info-label">Event Date:</span>
                                            <span className="info-value">
                                                {format(new Date(registration.event?.startDate), 'MMM dd, yyyy')}
                                            </span>
                                        </div>

                                        <div className="info-row">
                                            <span className="info-label">Registered:</span>
                                            <span className="info-value">
                                                {format(new Date(registration.registrationDate), 'MMM dd, yyyy')}
                                            </span>
                                        </div>

                                        {registration.teamName && (
                                            <div className="info-row">
                                                <span className="info-label">Team:</span>
                                                <span className="info-value team-name">{registration.teamName}</span>
                                            </div>
                                        )}

                                        {getPaymentStatusBadge(registration)}

                                        <div className="ticket-id-section">
                                            <span className="ticket-label">Ticket:</span>
                                            {registration.status === 'confirmed' ? (
                                                <button
                                                    className="ticket-id-btn"
                                                    onClick={() => setSelectedTicket(registration)}
                                                >
                                                    View Ticket
                                                </button>
                                            ) : (
                                                <span className="ticket-wait-msg">
                                                    {registration.status === 'rejected' ? '❌ Rejected' : '⏳ Available after approval'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-actions">
                                        <button
                                            onClick={() => navigate(`/events/${registration.event?._id}`)}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            View Event
                                        </button>

                                        {registration.paymentRequired &&
                                            registration.paymentStatus === 'pending' && (
                                                <button
                                                    onClick={() => navigate(`/registration/${registration._id}/payment`)}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    Upload Payment
                                                </button>
                                            )}

                                        {registration.status === 'pending' && (
                                            <button
                                                onClick={() => handleCancelRegistration(registration._id)}
                                                className="btn btn-danger btn-sm"
                                            >
                                                Cancel
                                            </button>
                                        )}

                                        {registration.attendanceStatus === 'Present' && !registration.feedbackSubmitted && (
                                            <button
                                                onClick={() => setFeedbackEvent(registration.event)}
                                                className="btn btn-primary btn-sm"
                                            >
                                                Give Feedback
                                            </button>
                                        )}
                                        {registration.attendanceStatus === 'Present' && registration.feedbackSubmitted && (
                                            <span className="feedback-done">✅ Feedback Sent</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Ticket Modal */}
            {selectedTicket && (
                <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
                    <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ticket-header">
                            <h2>Event Ticket</h2>
                            <button className="close-btn" onClick={() => setSelectedTicket(null)}>
                                &times;
                            </button>
                        </div>

                        <div className="ticket-body">
                            <div className="ticket-qr">
                                {selectedTicket.ticketQRCode ? (
                                    <img src={selectedTicket.ticketQRCode} alt="QR Code" />
                                ) : (
                                    <div className="qr-placeholder">QR Code Not Available</div>
                                )}
                            </div>

                            <div className="ticket-details">
                                <div className="ticket-id-display">
                                    <span className="ticket-id-label">Ticket ID</span>
                                    <span className="ticket-id-value">{selectedTicket.ticketId}</span>
                                </div>

                                <div className="ticket-info">
                                    <h3>{selectedTicket.event?.name}</h3>
                                    <p className="ticket-organizer">
                                        by {selectedTicket.event?.organizer?.organizerName}
                                    </p>

                                    <div className="ticket-meta">
                                        <div className="meta-item">
                                            <span className="meta-label">📅 Date</span>
                                            <span className="meta-value">
                                                {format(new Date(selectedTicket.event?.startDate), 'MMMM dd, yyyy')}
                                            </span>
                                        </div>

                                        <div className="meta-item">
                                            <span className="meta-label">🎫 Type</span>
                                            <span className="meta-value">{selectedTicket.registrationType}</span>
                                        </div>

                                        {selectedTicket.teamName && (
                                            <div className="meta-item">
                                                <span className="meta-label">👥 Team</span>
                                                <span className="meta-value">{selectedTicket.teamName}</span>
                                            </div>
                                        )}

                                        <div className="meta-item">
                                            <span className="meta-label">✅ Status</span>
                                            <span className={`meta-value ${getStatusBadgeClass(selectedTicket.status)}`}>
                                                {selectedTicket.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="ticket-footer">
                                <p className="ticket-note">
                                    Show this QR code at the event entrance
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Feedback Modal */}
            {feedbackEvent && (
                <FeedbackModal
                    event={feedbackEvent}
                    onClose={() => setFeedbackEvent(null)}
                    onSuccess={() => {
                        setFeedbackEvent(null);
                        fetchRegistrations();
                    }}
                />
            )}
        </div>
    );
};

export default MyRegistrations;
