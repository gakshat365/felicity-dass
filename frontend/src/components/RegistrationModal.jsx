import { useState } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import './RegistrationModal.css';

const RegistrationModal = ({ event, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({});
    const [teamName, setTeamName] = useState('');
    const [merchandiseDetails, setMerchandiseDetails] = useState({
        size: '',
        color: '',
        variant: '',
        quantity: 1
    });
    const [loading, setLoading] = useState(false);

    const handleFormChange = (fieldName, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const registrationData = {
                eventId: event._id,
                teamName: teamName || null,
                formResponses: formData,
                merchandiseDetails: event.type === 'merchandise' ? merchandiseDetails : undefined
            };

            const response = await axios.post('/api/registrations', registrationData);

            toast.success('Registration successful! Check your email for the ticket.');

            if (onSuccess) {
                onSuccess(response.data);
            }

            onClose();
        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Register for {event.name}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="registration-form">
                    {/* Event Type Badge */}
                    <div className="event-type-badge">
                        {event.type === 'merchandise' ? '🛍️ Merchandise' : '🎫 Event Registration'}
                    </div>

                    {/* Merchandise Selection */}
                    {event.type === 'merchandise' && event.merchandiseDetails && (
                        <div className="merchandise-section">
                            <h3>Select Options</h3>

                            {event.merchandiseDetails.sizes && event.merchandiseDetails.sizes.length > 0 && (
                                <div className="form-group">
                                    <label>Size *</label>
                                    <select
                                        value={merchandiseDetails.size}
                                        onChange={(e) => setMerchandiseDetails(prev => ({ ...prev, size: e.target.value }))}
                                        required
                                    >
                                        <option value="">Select Size</option>
                                        {event.merchandiseDetails.sizes.map(size => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {event.merchandiseDetails.colors && event.merchandiseDetails.colors.length > 0 && (
                                <div className="form-group">
                                    <label>Color *</label>
                                    <select
                                        value={merchandiseDetails.color}
                                        onChange={(e) => setMerchandiseDetails(prev => ({ ...prev, color: e.target.value }))}
                                        required
                                    >
                                        <option value="">Select Color</option>
                                        {event.merchandiseDetails.colors.map(color => (
                                            <option key={color} value={color}>{color}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {event.merchandiseDetails.variants && event.merchandiseDetails.variants.length > 0 && (
                                <div className="form-group">
                                    <label>Variant *</label>
                                    <select
                                        value={merchandiseDetails.variant}
                                        onChange={(e) => setMerchandiseDetails(prev => ({ ...prev, variant: e.target.value }))}
                                        required
                                    >
                                        <option value="">Select Variant</option>
                                        {event.merchandiseDetails.variants.map(variant => (
                                            <option key={variant} value={variant}>{variant}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Registration Form */}
                    {event.type === 'normal' && event.customForm && event.customForm.length > 0 && (
                        <div className="custom-form-section">
                            <h3>Registration Details</h3>
                            {event.customForm.map((field, index) => (
                                <div key={index} className="form-group">
                                    <label>
                                        {field.label} {field.required && <span className="required">*</span>}
                                    </label>

                                    {field.type === 'text' && (
                                        <input
                                            type="text"
                                            value={formData[field.label] || ''}
                                            onChange={(e) => handleFormChange(field.label, e.target.value)}
                                            required={field.required}
                                            placeholder={field.placeholder || ''}
                                        />
                                    )}

                                    {field.type === 'textarea' && (
                                        <textarea
                                            value={formData[field.label] || ''}
                                            onChange={(e) => handleFormChange(field.label, e.target.value)}
                                            required={field.required}
                                            placeholder={field.placeholder || ''}
                                            rows={4}
                                        />
                                    )}

                                    {field.type === 'number' && (
                                        <input
                                            type="number"
                                            value={formData[field.label] || ''}
                                            onChange={(e) => handleFormChange(field.label, e.target.value)}
                                            required={field.required}
                                            placeholder={field.placeholder || ''}
                                        />
                                    )}

                                    {field.type === 'dropdown' && (
                                        <select
                                            value={formData[field.label] || ''}
                                            onChange={(e) => handleFormChange(field.label, e.target.value)}
                                            required={field.required}
                                        >
                                            <option value="">Select an option</option>
                                            {field.options && field.options.map((option, i) => (
                                                <option key={i} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    )}

                                    {field.type === 'checkbox' && (
                                        <div className="checkbox-group">
                                            {field.options && field.options.map((option, i) => (
                                                <label key={i} className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData[field.label]?.includes(option) || false}
                                                        onChange={(e) => {
                                                            const currentValues = formData[field.label] || [];
                                                            if (e.target.checked) {
                                                                handleFormChange(field.label, [...currentValues, option]);
                                                            } else {
                                                                handleFormChange(field.label, currentValues.filter(v => v !== option));
                                                            }
                                                        }}
                                                    />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {field.type === 'radio' && (
                                        <div className="radio-group">
                                            {field.options && field.options.map((option, i) => (
                                                <label key={i} className="radio-label">
                                                    <input
                                                        type="radio"
                                                        name={field.label}
                                                        value={option}
                                                        checked={formData[field.label] === option}
                                                        onChange={(e) => handleFormChange(field.label, e.target.value)}
                                                        required={field.required}
                                                    />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Team Name (Optional) */}
                    <div className="form-group">
                        <label>
                            Team Name <span className="optional">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Leave blank if registering individually"
                        />
                        <small className="help-text">
                            If you're part of a team, enter the same team name as your teammates
                        </small>
                    </div>

                    {/* Payment Info */}
                    {event.registrationFee > 0 && (
                        <div className="payment-info">
                            <h3>💰 Payment Required</h3>
                            <p className="fee-amount">₹{event.registrationFee}</p>
                            <p className="payment-note">
                                After registration, you'll need to upload payment proof in your dashboard.
                            </p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Registering...' : 'Complete Registration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistrationModal;
