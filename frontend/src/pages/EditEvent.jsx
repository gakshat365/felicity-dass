import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import FormBuilder from '../components/FormBuilder';
import './CreateEvent.css';

const EditEvent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [eventStatus, setEventStatus] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'normal',
        category: 'Other',
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        eligibility: 'All',
        registrationFee: 0,
        registrationLimit: '',
        stock: '',
        purchaseLimitPerUser: '',
        merchandiseDetails: { sizes: [], colors: [], variants: [] },
        customFormTitle: '',
        customFormDescription: '',
        customForm: [],
        tags: [],
        upiId: '',
        teamBased: false,
        minTeamSize: 2,
        maxTeamSize: 5
    });

    const TAG_OPTIONS = ['dance', 'music', 'coding', 'hacking', 'opensource', 'quantum', 'art', 'other'];

    const toggleTag = (tag) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
    };

    const typeMap = {
        text: 'short',
        textarea: 'long',
        number: 'number',
        radio: 'mcq-single',
        dropdown: 'mcq-single',
        checkbox: 'mcq-multiple',
        short: 'short',
        long: 'long',
        'mcq-single': 'mcq-single',
        'mcq-multiple': 'mcq-multiple',
    };

    useEffect(() => {
        fetchEvent();
    }, [id]);

    const fetchEvent = async () => {
        try {
            const { data } = await axios.get(`/events/${id}`);

            // Check authorization
            if (data.organizer?._id !== user?._id && user?.role !== 'admin') {
                toast.error('Not authorized to edit this event');
                navigate('/dashboard');
                return;
            }

            setEventStatus(data.status);

            // Format dates for datetime-local input
            const formatDate = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';

            setFormData({
                name: data.name || '',
                description: data.description || '',
                type: data.type || 'normal',
                category: data.category || 'Other',
                startDate: formatDate(data.startDate),
                endDate: formatDate(data.endDate),
                registrationDeadline: formatDate(data.registrationDeadline),
                eligibility: data.eligibility || 'All',
                registrationFee: data.registrationFee || 0,
                registrationLimit: data.registrationLimit || '',
                stock: data.stock || '',
                purchaseLimitPerUser: data.purchaseLimitPerUser || '',
                merchandiseDetails: data.merchandiseDetails || { sizes: [], colors: [], variants: [] },
                customFormTitle: data.customFormTitle || '',
                customFormDescription: data.customFormDescription || '',
                customForm: data.customForm || [],
                tags: data.tags || [],
                upiId: data.upiId || '',
                teamBased: data.teamBased || false,
                minTeamSize: data.minTeamSize || 2,
                maxTeamSize: data.maxTeamSize || 5
            });
        } catch (error) {
            toast.error('Failed to load event');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
        setFormData(prev => ({ ...prev, customForm: fields }));
    };

    const handleSave = async (newStatus) => {
        setSaving(true);
        try {
            const mappedForm = formData.customForm.map((field, index) => ({
                questionId: field.questionId || field.id || `field_${Date.now()}_${index}`,
                questionText: field.questionText || field.label || `Question ${index + 1}`,
                questionType: typeMap[field.questionType] || typeMap[field.type] || 'short',
                required: field.required || false,
                options: field.options || [],
                wordLimit: (field.type === 'text' || field.questionType === 'short') ? 50
                    : (field.type === 'textarea' || field.questionType === 'long') ? 200 : undefined,
                order: index + 1,
            }));

            const eventData = {
                ...formData,
                customForm: mappedForm,
                status: newStatus || eventStatus,
                registrationFee: parseFloat(formData.registrationFee) || 0,
                registrationLimit: formData.registrationLimit ? parseInt(formData.registrationLimit) : null,
                stock: formData.stock ? parseInt(formData.stock) : null,
                purchaseLimitPerUser: formData.purchaseLimitPerUser ? parseInt(formData.purchaseLimitPerUser) : null,
                teamBased: formData.teamBased,
                minTeamSize: formData.teamBased ? parseInt(formData.minTeamSize) || 2 : undefined,
                maxTeamSize: formData.teamBased ? parseInt(formData.maxTeamSize) || 5 : undefined
            };

            await axios.patch(`/events/${id}`, eventData);
            toast.success('Event updated successfully!');
            navigate(`/events/${id}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update event');
        } finally {
            setSaving(false);
        }
    };

    // Determine what's editable based on status
    const isPublished = eventStatus === 'published';
    const isOngoing = eventStatus === 'ongoing';
    const isCompleted = eventStatus === 'completed';
    const isReadOnly = isCompleted;

    if (loading) return <div className="loading">Loading event...</div>;

    return (
        <div className="create-event-container">
            <header className="create-header">
                <div className="header-content">
                    <h1>Edit Event</h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span className={`status-badge status-${eventStatus}`} style={{ textTransform: 'capitalize' }}>
                            {eventStatus}
                        </span>
                    </div>
                </div>
            </header>

            {isReadOnly && (
                <div className="info-box" style={{ margin: '0 auto', maxWidth: '900px', marginBottom: '1rem' }}>
                    <p>⚠️ This event is <strong>{eventStatus}</strong> and cannot be edited.</p>
                </div>
            )}

            {(isPublished || isOngoing) && (
                <div className="info-box" style={{ margin: '0 auto', maxWidth: '900px', marginBottom: '1rem' }}>
                    <p>⚠️ Some fields are locked because registrations may already exist. You can still update the description, tags, and dates.</p>
                </div>
            )}

            <div className="create-main">
                <div className="form-container">
                    {/* Basic Info */}
                    <div className="form-step">
                        <h2>Basic Information</h2>
                        <div className="form-group">
                            <label>Event Name *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange}
                                disabled={isReadOnly || isPublished || isOngoing} />
                        </div>
                        <div className="form-group">
                            <label>Description *</label>
                            <textarea name="description" value={formData.description} onChange={handleChange}
                                rows={6} disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label>Event Type</label>
                            <select name="type" value={formData.type} onChange={handleChange}
                                disabled={isReadOnly || isPublished || isOngoing}>
                                <option value="normal">Normal Event</option>
                                <option value="merchandise">Merchandise</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <select name="category" value={formData.category} onChange={handleChange}
                                disabled={isReadOnly}>
                                <option value="Technical">Technical</option>
                                <option value="Cultural">Cultural</option>
                                <option value="Sports">Sports</option>
                                <option value="Academic">Academic</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="form-step">
                        <h2>Dates & Eligibility</h2>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Start Date *</label>
                                <input type="datetime-local" name="startDate" value={formData.startDate}
                                    onChange={handleChange} disabled={isReadOnly} />
                            </div>
                            <div className="form-group">
                                <label>End Date *</label>
                                <input type="datetime-local" name="endDate" value={formData.endDate}
                                    onChange={handleChange} disabled={isReadOnly} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Registration Deadline</label>
                            <input type="datetime-local" name="registrationDeadline" value={formData.registrationDeadline}
                                onChange={handleChange} disabled={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label>Eligibility</label>
                            <select name="eligibility" value={formData.eligibility} onChange={handleChange}
                                disabled={isReadOnly || isPublished || isOngoing}>
                                <option value="All">All</option>
                                <option value="IIIT Students Only">IIIT Students Only</option>
                                <option value="IIIT Community">IIIT Community</option>
                                <option value="Outside IIIT Only">Outside IIIT Only</option>
                                <option value="Custom">Custom</option>
                            </select>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="form-step">
                        <h2>Pricing & Limits</h2>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Registration Fee (₹)</label>
                                <input type="number" name="registrationFee" value={formData.registrationFee}
                                    onChange={handleChange} min="0" disabled={isReadOnly || isPublished || isOngoing} />
                            </div>
                            <div className="form-group">
                                <label>Registration Limit</label>
                                <input type="number" name="registrationLimit" value={formData.registrationLimit}
                                    onChange={handleChange} min="1" placeholder="No limit" disabled={isReadOnly} />
                            </div>
                        </div>

                        {formData.type === 'merchandise' && (
                            <>
                                <div className="form-group">
                                    <label>Stock</label>
                                    <input type="number" name="stock" value={formData.stock}
                                        onChange={handleChange} min="1" disabled={isReadOnly} />
                                </div>
                                <div className="form-group">
                                    <label>Purchase Limit Per User</label>
                                    <input type="number" name="purchaseLimitPerUser" value={formData.purchaseLimitPerUser}
                                        onChange={handleChange} min="1" placeholder="Max items per person" disabled={isReadOnly} />
                                </div>
                                <div className="form-group">
                                    <label>Sizes (comma-separated)</label>
                                    <input type="text" value={formData.merchandiseDetails?.sizes?.join(', ') || ''}
                                        onChange={(e) => handleMerchandiseChange('sizes', e.target.value)}
                                        placeholder="S, M, L, XL" disabled={isReadOnly} />
                                </div>
                                <div className="form-group">
                                    <label>Colors (comma-separated)</label>
                                    <input type="text" value={formData.merchandiseDetails?.colors?.join(', ') || ''}
                                        onChange={(e) => handleMerchandiseChange('colors', e.target.value)}
                                        placeholder="Black, White, Blue" disabled={isReadOnly} />
                                </div>
                                <div className="form-group">
                                    <label>Variants (comma-separated)</label>
                                    <input type="text" value={formData.merchandiseDetails?.variants?.join(', ') || ''}
                                        onChange={(e) => handleMerchandiseChange('variants', e.target.value)}
                                        placeholder="Hoodie, T-Shirt, Polo" disabled={isReadOnly} />
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label>UPI ID (for payments)</label>
                            <input type="text" name="upiId" value={formData.upiId}
                                onChange={handleChange} disabled={isReadOnly} />
                        </div>
                    </div>

                    {/* Custom Form (only editable in draft) */}
                    {formData.type === 'normal' && eventStatus === 'draft' && (
                        <div className="form-step">
                            <h2>Registration Form</h2>
                            <div className="form-group">
                                <label>Form Title</label>
                                <input type="text" name="customFormTitle" value={formData.customFormTitle} onChange={handleChange} placeholder="Enter form title" disabled={isReadOnly} />
                            </div>
                            <div className="form-group">
                                <label>Form Description</label>
                                <textarea name="customFormDescription" value={formData.customFormDescription} onChange={handleChange} placeholder="Enter form description" rows={2} disabled={isReadOnly} />
                            </div>
                            <FormBuilder fields={formData.customForm} onChange={handleFormBuilderChange} />
                        </div>
                    )}

                    <div className="form-step">
                        <h2>Tags</h2>
                        <div className="form-group">
                            <div className="tag-checkbox-grid">
                                {TAG_OPTIONS.map(tag => (
                                    <label
                                        key={tag}
                                        className={`tag-checkbox-item ${formData.tags.includes(tag) ? 'selected' : ''} ${isReadOnly ? 'disabled' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.tags.includes(tag)}
                                            onChange={() => !isReadOnly && toggleTag(tag)}
                                            disabled={isReadOnly}
                                        />
                                        {tag}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {!isReadOnly && (
                        <div className="form-actions">
                            <button onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
                            <div className="action-right">
                                {eventStatus === 'draft' && (
                                    <button onClick={() => handleSave('draft')} className="btn btn-secondary"
                                        disabled={saving}>Save Draft</button>
                                )}
                                {eventStatus === 'draft' && (
                                    <button onClick={() => handleSave('published')} className="btn btn-primary"
                                        disabled={saving}>{saving ? 'Publishing...' : 'Publish'}</button>
                                )}
                                {(isPublished || isOngoing) && (
                                    <button onClick={() => handleSave()} className="btn btn-primary"
                                        disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditEvent;
