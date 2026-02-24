import { useState } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import './RegistrationModal.css';
import TeamRegistrationModal from './TeamRegistrationModal';

const RegistrationModal = ({ event, onClose, onSuccess }) => {
    // Delegate entirely to TeamRegistrationModal for team-based events
    if (event.teamBased) {
        return <TeamRegistrationModal event={event} onClose={onClose} onSuccess={onSuccess} />;
    }
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

            const response = await axios.post('/registrations', registrationData);

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

                            <div className="form-group">
                                <label>Quantity *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={event.purchaseLimitPerUser || 1}
                                    value={merchandiseDetails.quantity}
                                    onChange={(e) => setMerchandiseDetails(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                    required
                                />
                                {event.purchaseLimitPerUser && <small className="help-text">Max {event.purchaseLimitPerUser} items per person.</small>}
                            </div>
                        </div>
                    )}

                    {/* Custom Registration Form */}
                    {event.type === 'normal' && event.customForm && event.customForm.length > 0 && (
                        <div className="custom-form-section">
                            <h3>{event.customFormTitle || 'Registration Details'}</h3>
                            {event.customFormDescription && <p className="custom-form-desc">{event.customFormDescription}</p>}
                            {event.customForm.map((field, index) => {
                                const label = field.questionText || field.label;
                                const type = field.questionType || field.type;
                                return (
                                <div key={index} className="form-group">
                                    <label>
                                        {label} {field.required && <span className="required">*</span>}
                                    </label>

                                    {(type === 'short' || type === 'text') && (
                                        <input
                                            type="text"
                                            value={formData[label] || ''}
                                            onChange={(e) => {
                                                const words = e.target.value.trim().split(/\s+/).filter(Boolean);
                                                if (words.length > (field.wordLimit || 50)) {
                                                    toast.error(`Short answer cannot exceed ${field.wordLimit || 50} words`);
                                                    return;
                                                }
                                                handleFormChange(label, e.target.value);
                                            }}
                                            required={field.required}
                                            placeholder={field.placeholder || ''}
                                        />
                                    )}

                                    {(type === 'long' || type === 'textarea') && (
                                        <textarea
                                            value={formData[label] || ''}
                                            onChange={(e) => {
                                                const words = e.target.value.trim().split(/\s+/).filter(Boolean);
                                                if (words.length > (field.wordLimit || 200)) {
                                                    toast.error(`Long answer cannot exceed ${field.wordLimit || 200} words`);
                                                    return;
                                                }
                                                handleFormChange(label, e.target.value);
                                            }}
                                            required={field.required}
                                            placeholder={field.placeholder || ''}
                                            rows={4}
                                        />
                                    )}

                                    {type === 'number' && (
                                        <input
                                            type="number"
                                            value={formData[label] || ''}
                                            onChange={(e) => handleFormChange(label, e.target.value)}
                                            required={field.required}
                                            placeholder={field.placeholder || ''}
                                        />
                                    )}

                                    {(type === 'mcq-single' || type === 'dropdown' || type === 'radio') && (
                                        field.options && field.options.length <= 5 ? (
                                            <div className="radio-group">
                                                {field.options.map((option, i) => (
                                                    <label key={i} className="radio-label">
                                                        <input
                                                            type="radio"
                                                            name={label}
                                                            value={option}
                                                            checked={formData[label] === option}
                                                            onChange={(e) => handleFormChange(label, e.target.value)}
                                                            required={field.required}
                                                        />
                                                        {option}
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <select
                                                value={formData[label] || ''}
                                                onChange={(e) => handleFormChange(label, e.target.value)}
                                                required={field.required}
                                            >
                                                <option value="">Select an option</option>
                                                {field.options && field.options.map((option, i) => (
                                                    <option key={i} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        )
                                    )}

                                    {(type === 'mcq-multiple' || type === 'checkbox') && (
                                        <div className="checkbox-group">
                                            {field.options && field.options.map((option, i) => (
                                                <label key={i} className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData[label]?.includes(option) || false}
                                                        onChange={(e) => {
                                                            const currentValues = formData[label] || [];
                                                            if (e.target.checked) {
                                                                handleFormChange(label, [...currentValues, option]);
                                                            } else {
                                                                handleFormChange(label, currentValues.filter(v => v !== option));
                                                            }
                                                        }}
                                                    />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {type === 'file' && (
                                        <div className="file-upload-group">
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file && file.size > 5 * 1024 * 1024) {
                                                        toast.error('File size should be less than 5MB');
                                                        e.target.value = '';
                                                        return;
                                                    }
                                                    if (file) {
                                                        handleFormChange(label, `[File Uploaded] ${file.name}`);
                                                        toast.success('File attached successfully (simulated)');
                                                    } else {
                                                        const currentData = { ...formData };
                                                        delete currentData[label];
                                                        setFormData(currentData);
                                                    }
                                                }}
                                                required={field.required}
                                                style={{ padding: '0.5rem 0' }}
                                            />
                                            <small className="help-text">Max size: 5MB. Accepted formats: PDF, DOC, JPG, PNG.</small>
                                        </div>
                                    )}
                                </div>
                            );
                            })}
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
                            <p className="fee-amount">₹{event.registrationFee * (event.type === 'merchandise' ? merchandiseDetails.quantity : 1)}</p>
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
