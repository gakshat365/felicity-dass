import { useState } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import './FeedbackModal.css';

const FeedbackModal = ({ event, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`/feedback/${event._id}`, {
                rating,
                comment
            });
            toast.success('Feedback submitted! Thank you.');
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit feedback');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="feedback-modal">
                <div className="modal-header">
                    <h2>Event Feedback</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <p className="event-name-hint">Share your experience for <strong>{event.name}</strong></p>
                    <p className="privacy-badge">🔒 Your feedback is strictly anonymous</p>

                    <form onSubmit={handleSubmit}>
                        <div className="rating-section">
                            <label>Rate your experience:</label>
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={star <= (hover || rating) ? 'star active' : 'star'}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <span className="rating-text">
                                {rating > 0 ? [`Poor`, `Fair`, `Good`, `Very Good`, `Excellent`][rating - 1] : 'Select a rating'}
                            </span>
                        </div>

                        <div className="form-group">
                            <label>Comments (Optional):</label>
                            <textarea
                                placeholder="What did you like? What could be improved?"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                maxLength={1000}
                                rows={5}
                            />
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </div>
                    </form>
                    <p className="timing-hint">Please submit your feedback after you have experienced the event.</p>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
