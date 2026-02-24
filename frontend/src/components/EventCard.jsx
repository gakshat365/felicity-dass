import { useNavigate } from 'react-router-dom';
import './EventCard.css';

const EventCard = ({ event }) => {
    const navigate = useNavigate();

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusBadge = () => {
        const statusColors = {
            draft: 'gray',
            published: 'blue',
            ongoing: 'green',
            completed: 'purple',
            cancelled: 'red'
        };
        return statusColors[event.status] || 'gray';
    };

    const isEndingSoon = () => {
        const deadline = new Date(event.registrationDeadline);
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        return deadline <= threeDaysFromNow && deadline >= new Date();
    };

    return (
        <div className="event-card" onClick={() => navigate(`/events/${event._id}`)}>
            {isEndingSoon() && event.status === 'published' && (
                <div className="ending-soon-badge">⏰ Ending Soon</div>
            )}

            <div className="event-card-header">
                <h3 className="event-title">{event.name}</h3>
                <span className={`status-badge status-${getStatusBadge()}`}>
                    {event.status}
                </span>
            </div>

            <p className="event-description">
                {(event.description || '').length > 150
                    ? `${event.description.substring(0, 150)}...`
                    : (event.description || 'No description available.')}
            </p>

            <div className="event-meta">
                <div className="meta-item">
                    <span className="meta-label">Type:</span>
                    <span className="meta-value">{event.type}</span>
                </div>
                <div className="meta-item">
                    <span className="meta-label">Organizer:</span>
                    <span className="meta-value">
                        {event.organizer?.organizerName || 'Unknown'}
                    </span>
                </div>
            </div>

            <div className="event-dates">
                <div className="date-item">
                    <span className="date-icon">📅</span>
                    <span>{formatDate(event.startDate)}</span>
                </div>
                <div className="date-item">
                    <span className="date-icon">⏰</span>
                    <span>Deadline: {formatDate(event.registrationDeadline)}</span>
                </div>
            </div>

            {event.tags && event.tags.length > 0 && (
                <div className="event-tags">
                    {event.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="event-tag">{tag}</span>
                    ))}
                    {event.tags.length > 3 && (
                        <span className="event-tag">+{event.tags.length - 3}</span>
                    )}
                </div>
            )}

            <div className="event-footer">
                <div className="event-stats">
                    <span>👥 {event.registrationCount || 0} registered</span>
                    {event.registrationLimit && (
                        <span>• Limit: {event.registrationLimit}</span>
                    )}
                </div>
                {event.registrationFee > 0 && (
                    <div className="event-fee">₹{event.registrationFee}</div>
                )}
            </div>
        </div>
    );
};

export default EventCard;
