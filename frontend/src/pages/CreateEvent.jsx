import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import FormBuilder from '../components/FormBuilder';
import './CreateEvent.css';

const CreateEvent = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Step 1: Basic Info
        name: '',
        description: '',
        type: 'normal',

        // Step 2: Dates & Eligibility
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        eligibility: 'All',

        // Step 3: Pricing & Limits
        registrationFee: 0,
        registrationLimit: '',

        // Merchandise specific
        stock: '',
        purchaseLimitPerUser: '',
        merchandiseDetails: {
            sizes: [],
            colors: [],
            variants: []
        },

        // Step 4: Custom Form (for normal events)
        customFormTitle: '',
        customFormDescription: '',
        customForm: [],

        // Team Settings (for normal events only)
        teamBased: false,
        minTeamSize: 2,
        maxTeamSize: 5,

        // Step 5: Additional
        tags: [],
        upiId: ''
    });

    const [loading, setLoading] = useState(false);

    // Valid tag options (must match backend enum exactly)
    const TAG_OPTIONS = ['dance', 'music', 'coding', 'hacking', 'opensource', 'quantum', 'art', 'other'];

    const toggleTag = (tag) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleMerchandiseChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            merchandiseDetails: {
                ...prev.merchandiseDetails,
                [field]: value.split(',').map(item => item.trim()).filter(Boolean)
            }
        }));
    };



    const handleFormBuilderChange = (fields) => {
        setFormData(prev => ({
            ...prev,
            customForm: fields
        }));
    };

    const validateStep = (currentStep) => {
        switch (currentStep) {
            case 1:
                if (!formData.name.trim()) {
                    toast.error('Event name is required');
                    return false;
                }
                if (!formData.description.trim()) {
                    toast.error('Event description is required');
                    return false;
                }
                return true;

            case 2:
                if (!formData.startDate) {
                    toast.error('Start date is required');
                    return false;
                }
                if (!formData.endDate) {
                    toast.error('End date is required');
                    return false;
                }
                if (!formData.registrationDeadline) {
                    toast.error('Registration deadline is required');
                    return false;
                }
                if (new Date(formData.endDate) < new Date(formData.startDate)) {
                    toast.error('End date must be after start date');
                    return false;
                }
                if (new Date(formData.registrationDeadline) > new Date(formData.startDate)) {
                    toast.error('Registration deadline must be before start date');
                    return false;
                }
                return true;

            case 3:
                if (formData.type === 'merchandise') {
                    if (!formData.stock) {
                        toast.error('Stock is required for merchandise');
                        return false;
                    }
                    if (!formData.purchaseLimitPerUser) {
                        toast.error('Purchase limit per user is required for merchandise');
                        return false;
                    }
                }
                return true;

            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(prev => Math.min(prev + 1, 5));
        }
    };

    const prevStep = () => {
        setStep(prev => Math.max(prev - 1, 1));
    };

    // Map FormBuilder internal field type → backend questionType enum
    const typeMap = {
        text: 'short',
        textarea: 'long',
        number: 'number',
        radio: 'mcq-single',
        dropdown: 'mcq-single',
        checkbox: 'mcq-multiple',
    };

    const handleSubmit = async (status = 'draft') => {
        if (!validateStep(step)) return;

        setLoading(true);
        try {
            // Transform FormBuilder fields into backend schema shape
            const mappedForm = formData.customForm.map((field, index) => ({
                questionId: field.id || `field_${Date.now()}_${index}`,
                questionText: field.label || `Question ${index + 1}`,
                questionType: typeMap[field.type] || 'short',
                required: field.required || false,
                options: field.options || [],
                wordLimit: field.type === 'text' ? 50 : field.type === 'textarea' ? 200 : undefined,
                order: index + 1,
            }));

            const eventData = {
                ...formData,
                customForm: mappedForm,
                status,
                registrationFee: parseFloat(formData.registrationFee) || 0,
                registrationLimit: formData.registrationLimit ? parseInt(formData.registrationLimit) : null,
                stock: formData.stock ? parseInt(formData.stock) : null,
                purchaseLimitPerUser: formData.purchaseLimitPerUser ? parseInt(formData.purchaseLimitPerUser) : null,
                minTeamSize: parseInt(formData.minTeamSize) || 2,
                maxTeamSize: parseInt(formData.maxTeamSize) || 5
            };

            const response = await axios.post('/events', eventData);

            toast.success(`Event ${status === 'draft' ? 'saved as draft' : 'published'} successfully!`);
            navigate(`/events/organizer/${response.data._id}`);
        } catch (error) {
            console.error('Create event error:', error);
            toast.error(error.response?.data?.message || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="step-indicator">
            {[1, 2, 3, 4, 5].map(num => (
                <div
                    key={num}
                    className={`step-item ${step === num ? 'active' : ''} ${step > num ? 'completed' : ''}`}
                >
                    <div className="step-number">{num}</div>
                    <div className="step-label">
                        {num === 1 && 'Basic Info'}
                        {num === 2 && 'Dates'}
                        {num === 3 && 'Pricing'}
                        {num === 4 && 'Form'}
                        {num === 5 && 'Review'}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="create-event-container">
            <header className="create-header">
                <div className="header-content">
                    <h1>Create New Event</h1>
                </div>
            </header>

            <div className="create-main">
                {renderStepIndicator()}

                <div className="form-container">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="form-step">
                            <h2>Basic Information</h2>

                            <div className="form-group">
                                <label>Event Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter event name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe your event"
                                    rows={6}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Event Type *</label>
                                <select name="type" value={formData.type} onChange={handleChange}>
                                    <option value="normal">Normal Event</option>
                                    <option value="merchandise">Merchandise</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Dates & Eligibility */}
                    {step === 2 && (
                        <div className="form-step">
                            <h2>Dates & Eligibility</h2>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date *</label>
                                    <input
                                        type="datetime-local"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>End Date *</label>
                                    <input
                                        type="datetime-local"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Registration Deadline *</label>
                                <input
                                    type="datetime-local"
                                    name="registrationDeadline"
                                    value={formData.registrationDeadline}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Eligibility *</label>
                                <select name="eligibility" value={formData.eligibility} onChange={handleChange}>
                                    <option value="All">All</option>
                                    <option value="IIIT Students Only">IIIT Students Only</option>
                                    <option value="IIIT Community">IIIT Community</option>
                                    <option value="Outside IIIT Only">Outside IIIT Only</option>
                                    <option value="Custom">Custom</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Pricing & Limits */}
                    {step === 3 && (
                        <div className="form-step">
                            <h2>Pricing & Limits</h2>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Registration Fee (₹)</label>
                                    <input
                                        type="number"
                                        name="registrationFee"
                                        value={formData.registrationFee}
                                        onChange={handleChange}
                                        min="0"
                                        placeholder="0"
                                    />
                                    <small>Leave as 0 for free events</small>
                                </div>

                                <div className="form-group">
                                    <label>Registration Limit</label>
                                    <input
                                        type="number"
                                        name="registrationLimit"
                                        value={formData.registrationLimit}
                                        onChange={handleChange}
                                        min="1"
                                        placeholder="No limit"
                                    />
                                    <small>Leave empty for unlimited</small>
                                </div>
                            </div>

                            {/* Team Registration Settings (normal events only) */}
                            {formData.type === 'normal' && (
                                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                    <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.teamBased}
                                            onChange={(e) => setFormData(prev => ({ ...prev, teamBased: e.target.checked }))}
                                        />
                                        <span>Team-based Event</span>
                                    </label>
                                    <small>Participants register as teams. Tickets are issued once a team reaches the minimum size.</small>

                                    {formData.teamBased && (
                                        <div className="form-row" style={{ marginTop: '0.75rem' }}>
                                            <div className="form-group">
                                                <label>Min Team Size *</label>
                                                <input
                                                    type="number"
                                                    name="minTeamSize"
                                                    value={formData.minTeamSize}
                                                    onChange={handleChange}
                                                    min="2"
                                                    max="20"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Max Team Size *</label>
                                                <input
                                                    type="number"
                                                    name="maxTeamSize"
                                                    value={formData.maxTeamSize}
                                                    onChange={handleChange}
                                                    min="2"
                                                    max="20"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.type === 'merchandise' && (
                                <>
                                    <div className="form-group">
                                        <label>Stock *</label>
                                        <input
                                            type="number"
                                            name="stock"
                                            value={formData.stock}
                                            onChange={handleChange}
                                            min="1"
                                            placeholder="Available stock"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Purchase Limit Per User *</label>
                                        <input
                                            type="number"
                                            name="purchaseLimitPerUser"
                                            value={formData.purchaseLimitPerUser}
                                            onChange={handleChange}
                                            min="1"
                                            placeholder="Max items per person"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Sizes (comma-separated)</label>
                                        <input
                                            type="text"
                                            placeholder="S, M, L, XL"
                                            onChange={(e) => handleMerchandiseChange('sizes', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Colors (comma-separated)</label>
                                        <input
                                            type="text"
                                            placeholder="Black, White, Blue"
                                            onChange={(e) => handleMerchandiseChange('colors', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Variants (comma-separated)</label>
                                        <input
                                            type="text"
                                            placeholder="Regular, Premium"
                                            onChange={(e) => handleMerchandiseChange('variants', e.target.value)}
                                        />
                                    </div>
                                    <small className="help-text">Note: The current schema handles total stock. Pricing/limits per individual variant will require future schema updates.</small>
                                </>
                            )}

                            <div className="form-group">
                                <label>UPI ID (for payments)</label>
                                <input
                                    type="text"
                                    name="upiId"
                                    value={formData.upiId}
                                    onChange={handleChange}
                                    placeholder="yourname@paytm"
                                />
                                <small>Participants will use this for payment</small>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Custom Form Builder */}
                    {step === 4 && (
                        <div className="form-step">
                            <h2>{formData.type === 'normal' ? 'Registration Form' : 'Additional Details'}</h2>

                            {formData.type === 'normal' ? (
                                <>
                                    <div className="form-group">
                                        <label>Form Title</label>
                                        <input
                                            type="text"
                                            name="customFormTitle"
                                            value={formData.customFormTitle}
                                            onChange={handleChange}
                                            placeholder="Enter form title"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Form Description</label>
                                        <textarea
                                            name="customFormDescription"
                                            value={formData.customFormDescription}
                                            onChange={handleChange}
                                            placeholder="Enter a short description for the form"
                                            rows={2}
                                        />
                                    </div>
                                    <FormBuilder
                                        fields={formData.customForm}
                                        onChange={handleFormBuilderChange}
                                    />
                                </>
                            ) : (
                                <div className="info-box">
                                    <p>Merchandise events don't require a custom registration form.</p>
                                    <p>Participants will select size, color, and variant during purchase.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 5: Review & Publish */}
                    {step === 5 && (
                        <div className="form-step">
                            <h2>Review & Publish</h2>

                            <div className="review-section">
                                <h3>Event Summary</h3>
                                <div className="review-grid">
                                    <div className="review-item">
                                        <span className="review-label">Name:</span>
                                        <span className="review-value">{formData.name}</span>
                                    </div>
                                    <div className="review-item">
                                        <span className="review-label">Type:</span>
                                        <span className="review-value">{formData.type}</span>
                                    </div>
                                    <div className="review-item">
                                        <span className="review-label">Start Date:</span>
                                        <span className="review-value">
                                            {new Date(formData.startDate).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="review-item">
                                        <span className="review-label">Fee:</span>
                                        <span className="review-value">
                                            {formData.registrationFee > 0 ? `₹${formData.registrationFee}` : 'Free'}
                                        </span>
                                    </div>
                                    {formData.type === 'normal' && (
                                        <div className="review-item">
                                            <span className="review-label">Form Fields:</span>
                                            <span className="review-value">{formData.customForm.length}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Tags <span style={{ fontWeight: 400, fontSize: '0.85em', color: '#8b949e' }}>(select all that apply)</span></label>
                                <div className="tag-checkbox-grid">
                                    {TAG_OPTIONS.map(tag => (
                                        <label key={tag} className={`tag-checkbox-item ${formData.tags.includes(tag) ? 'selected' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={formData.tags.includes(tag)}
                                                onChange={() => toggleTag(tag)}
                                            />
                                            {tag}
                                        </label>
                                    ))}
                                </div>
                                {formData.tags.length > 0 && (
                                    <p style={{ fontSize: '0.8rem', color: '#58a6ff', marginTop: '6px' }}>
                                        Selected: {formData.tags.join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="form-actions">
                        {step > 1 && (
                            <button onClick={prevStep} className="btn btn-secondary">
                                Previous
                            </button>
                        )}

                        <div className="action-right">
                            {step < 5 ? (
                                <button onClick={nextStep} className="btn btn-primary">
                                    Next
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleSubmit('draft')}
                                        className="btn btn-secondary"
                                        disabled={loading}
                                    >
                                        Save as Draft
                                    </button>
                                    <button
                                        onClick={() => handleSubmit('published')}
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Publishing...' : 'Publish Event'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateEvent;
