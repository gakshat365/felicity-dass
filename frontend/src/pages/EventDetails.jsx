import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import AuthContext from '../context/AuthContext';
import RegistrationModal from '../components/RegistrationModal';
import DiscussionForum from '../components/DiscussionForum';
import toast from 'react-hot-toast';
import './EventDetails.css';

const EventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [registrationBlocked, setRegistrationBlocked] = useState(null);

    useEffect(() => {
        fetchEvent();
    }, [id]);

    const fetchEvent = async () => {
        try {
            const { data } = await axios.get(`/events/${id}`);
            setEvent(data);
            checkRegistrationEligibility(data);
        } catch (error) {
            console.error('Error fetching event:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkRegistrationEligibility = (eventData) => {
        if (eventData.status !== 'published' && eventData.status !== 'ongoing') {
            setRegistrationBlocked('Event is not open for registration');
            return;
        }

        if (new Date() > new Date(eventData.registrationDeadline)) {
            setRegistrationBlocked('Registration deadline has passed');
            return;
        }

        if (eventData.registrationLimit && eventData.registrationCount >= eventData.registrationLimit) {
            setRegistrationBlocked('Registration limit reached');
            return;
        }

        if (eventData.type === 'merchandise' && eventData.stock) {
            const sold = eventData.registrationCount || 0;
            if (sold >= eventData.stock) {
                setRegistrationBlocked('Item is out of stock');
                return;
            }
        }

        setRegistrationBlocked(null);
    };

    const handleRegisterClick = () => {
        if (!user) {
            toast.error('Please login to register for events');
            navigate('/login');
            return;
        }

        if (user.role !== 'participant') {
            toast.error('Only participants can register for events');
            return;
        }

        if (registrationBlocked) {
            toast.error(registrationBlocked);
            return;
        }

        setShowRegistrationModal(true);
    };

    const handleRegistrationSuccess = (data) => {
        fetchEvent();
        toast.success('Registration successful! Check your email for the ticket.');
    };

    if (loading) {
        return <div className="loading-container">Loading event details...</div>;
    }

    if (!event) {
        return (
            <div className="error-container">
                <h2>Event not found</h2>
                <button onClick={() => navigate('/events')} className="btn btn-primary">
                    Browse Events
                </button>
            </div>
        );
    }

    return (
        <div className="event-details-container">
            <header className="details-header">
                <button onClick={() => navigate('/events')} className="btn btn-secondary btn-sm">
                    ← Back to Events
                </button>
            </header>

            <div className="details-main">
                <div className="event-info-card">
                    <h1>{event.name}</h1>
                    <div className="event-meta-row">
                        <span className={`status-badge status-${event.status}`}>{event.status}</span>
                        <span className="type-badge">{event.type}</span>
                    </div>

                    <p className="event-description">{event.description}</p>

                    <div className="event-details-grid">
                        <div className="detail-item">
                            <span className="detail-label">Organizer</span>
                            <span className="detail-value">{event.organizer?.organizerName}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Start Date</span>
                            <span className="detail-value">
                                {new Date(event.startDate).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">End Date</span>
                            <span className="detail-value">
                                {new Date(event.endDate).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Registration Deadline</span>
                            <span className="detail-value">
                                {new Date(event.registrationDeadline).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Eligibility</span>
                            <span className="detail-value">{event.eligibility}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Registration Fee</span>
                            <span className="detail-value">
                                {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                            </span>
                        </div>
                        {event.registrationLimit && (
                            <div className="detail-item">
                                <span className="detail-label">Limit</span>
                                <span className="detail-value">
                                    {event.registrationCount || 0} / {event.registrationLimit}
                                </span>
                            </div>
                        )}
                    </div>

                    {event.tags && event.tags.length > 0 && (
                        <div className="tags-section">
                            <h3>Tags</h3>
                            <div className="tags-list">
                                {event.tags.map((tag, index) => (
                                    <span key={index} className="tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {event.type === 'normal' && event.customForm && event.customForm.length > 0 && (
                        <div className="form-section">
                            <h3>Registration Form Preview</h3>
                            {event.customFormTitle && <h4 className="custom-form-title">{event.customFormTitle}</h4>}
                            {event.customFormDescription && <p className="custom-form-description">{event.customFormDescription}</p>}
                            <p className="form-note">This form will be shown during registration</p>
                            {event.customForm.map((question, index) => (
                                <div key={question.questionId} className="form-question">
                                    <label>
                                        {index + 1}. {question.questionText}
                                        {question.required && <span className="required">*</span>}
                                    </label>
                                    <span className="question-type">{question.questionType}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {event.type === 'merchandise' && (event.merchandiseDetails || event.itemDetails) && (
                        <div className="merchandise-section">
                            <h3>Item Details</h3>
                            {((event.merchandiseDetails?.sizes || event.itemDetails?.sizes) || []).length > 0 && (
                                <div className="merch-detail">
                                    <strong>Sizes:</strong> {(event.merchandiseDetails?.sizes || event.itemDetails?.sizes).join(', ')}
                                </div>
                            )}
                            {((event.merchandiseDetails?.colors || event.itemDetails?.colors) || []).length > 0 && (
                                <div className="merch-detail">
                                    <strong>Colors:</strong> {(event.merchandiseDetails?.colors || event.itemDetails?.colors).join(', ')}
                                </div>
                            )}
                            {((event.merchandiseDetails?.variants || event.itemDetails?.variants) || []).length > 0 && (
                                <div className="merch-detail">
                                    <strong>Variants:</strong> {(event.merchandiseDetails?.variants || event.itemDetails?.variants).join(', ')}
                                </div>
                            )}
                            {event.stock != null && (
                                <div className="merch-detail">
                                    <strong>Stock:</strong> {event.stock} units
                                </div>
                            )}
                            {event.purchaseLimitPerUser != null && (
                                <div className="merch-detail">
                                    <strong>Purchase Limit:</strong> {event.purchaseLimitPerUser} per person
                                </div>
                            )}
                        </div>
                    )}

                    <div className="action-section">
                        <button
                            className={`btn btn-primary btn-lg ${registrationBlocked ? 'btn-disabled' : ''}`}
                            onClick={handleRegisterClick}
                            disabled={!!registrationBlocked}
                        >
                            {registrationBlocked || 'Register Now'}
                        </button>
                        {event.registrationFee > 0 && !registrationBlocked && (
                            <p className="fee-note">Registration Fee: ₹{event.registrationFee}</p>
                        )}
                    </div>

                    {user && (
                        <div className="event-forum-section">
                            <DiscussionForum
                                eventId={event._id}
                                eventOrganizerId={event.organizer?._id}
                            />
                        </div>
                    )}
                </div>
            </div>

            {showRegistrationModal && (
                <RegistrationModal
                    event={event}
                    onClose={() => setShowRegistrationModal(false)}
                    onSuccess={handleRegistrationSuccess}
                />
            )}
        </div>
    );
};

export default EventDetails;
