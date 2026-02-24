import { useState } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import './TeamRegistrationModal.css';

const TeamRegistrationModal = ({ event, onClose, onSuccess }) => {
    const [mode, setMode] = useState(null); // null | 'create' | 'join'
    const [teamName, setTeamName] = useState('');
    const [inviteCodeInput, setInviteCodeInput] = useState('');
    const [teamPreview, setTeamPreview] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [lookingUp, setLookingUp] = useState(false);
    const [createdTeam, setCreatedTeam] = useState(null); // success state after creating

    const handleFormChange = (fieldKey, value) => {
        setFormData(prev => ({ ...prev, [fieldKey]: value }));
    };

    // Look up team by invite code to show preview
    const lookupTeam = async () => {
        if (!inviteCodeInput.trim()) return toast.error('Enter an invite code');
        setLookingUp(true);
        try {
            const { data } = await axios.get(`/teams/code/${inviteCodeInput.trim()}`);
            setTeamPreview(data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid invite code');
            setTeamPreview(null);
        } finally {
            setLookingUp(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!teamName.trim()) return toast.error('Team name is required');
        setLoading(true);
        try {
            const { data } = await axios.post('/teams', {
                eventId: event._id,
                teamName: teamName.trim(),
                formResponses: formData
            });
            setCreatedTeam(data.team);
            if (onSuccess) onSuccess(data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create team');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axios.post('/teams/join', {
                inviteCode: inviteCodeInput.trim(),
                formResponses: formData
            });
            toast.success(data.message);
            if (onSuccess) onSuccess(data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to join team');
        } finally {
            setLoading(false);
        }
    };

    // Render custom form fields (handles both FormBuilder and DB schema field structures)
    const renderCustomForm = () => {
        const fields = event.customForm;
        if (!fields || fields.length === 0) return null;

        return (
            <div className="custom-form-section">
                {event.customFormTitle && <h3>{event.customFormTitle}</h3>}
                {event.customFormDescription && <p className="custom-form-desc">{event.customFormDescription}</p>}
                {fields.map((field, index) => {
                    // Support both FormBuilder shape (label/type) and DB shape (questionText/questionType)
                    const label = field.label || field.questionText || `Question ${index + 1}`;
                    const type = field.type || field.questionType;
                    const key = label;

                    return (
                        <div key={field.questionId || index} className="form-group">
                            <label>
                                {label} {field.required && <span className="required">*</span>}
                            </label>

                            {(type === 'text' || type === 'short') && (
                                <input
                                    type="text"
                                    value={formData[key] || ''}
                                    onChange={(e) => {
                                        const words = e.target.value.trim().split(/\s+/).filter(Boolean);
                                        if (words.length > 50) { toast.error('Answer cannot exceed 50 words'); }
                                        handleFormChange(key, e.target.value);
                                    }}
                                    required={field.required}
                                    placeholder={field.placeholder || ''}
                                />
                            )}

                            {(type === 'textarea' || type === 'long') && (
                                <textarea
                                    value={formData[key] || ''}
                                    onChange={(e) => {
                                        const words = e.target.value.trim().split(/\s+/).filter(Boolean);
                                        if (words.length > 200) { toast.error('Answer cannot exceed 200 words'); }
                                        handleFormChange(key, e.target.value);
                                    }}
                                    required={field.required}
                                    rows={4}
                                />
                            )}

                            {(type === 'number') && (
                                <input
                                    type="number"
                                    value={formData[key] || ''}
                                    onChange={(e) => handleFormChange(key, e.target.value)}
                                    required={field.required}
                                />
                            )}

                            {(type === 'dropdown' || type === 'mcq-single') && (
                                <select
                                    value={formData[key] || ''}
                                    onChange={(e) => handleFormChange(key, e.target.value)}
                                    required={field.required}
                                >
                                    <option value="">Select an option</option>
                                    {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                </select>
                            )}

                            {(type === 'radio') && (
                                <div className="radio-group">
                                    {field.options?.map((opt, i) => (
                                        <label key={i} className="radio-label">
                                            <input
                                                type="radio"
                                                name={key}
                                                value={opt}
                                                checked={formData[key] === opt}
                                                onChange={(e) => handleFormChange(key, e.target.value)}
                                                required={field.required}
                                            />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            )}

                            {(type === 'checkbox' || type === 'mcq-multiple') && (
                                <div className="checkbox-group">
                                    {field.options?.map((opt, i) => (
                                        <label key={i} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData[key]?.includes(opt) || false}
                                                onChange={(e) => {
                                                    const current = formData[key] || [];
                                                    handleFormChange(key, e.target.checked
                                                        ? [...current, opt]
                                                        : current.filter(v => v !== opt));
                                                }}
                                            />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // ---- Success state: team created, show invite code ----
    if (createdTeam) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content team-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Team Created! 🎉</h2>
                        <button className="close-btn" onClick={onClose}>&times;</button>
                    </div>
                    <div className="team-success-body">
                        <div className="team-name-display">{createdTeam.name}</div>

                        <p className="team-success-msg">
                            Share this code with your teammates. Tickets are issued once your team
                            reaches <strong>{createdTeam.minMembers}</strong> members.
                        </p>

                        <div className="invite-code-box">
                            <span className="invite-code-label">Invite Code</span>
                            <span className="invite-code-value">{createdTeam.inviteCode}</span>
                            <button
                                className="copy-btn"
                                onClick={() => {
                                    navigator.clipboard.writeText(createdTeam.inviteCode);
                                    toast.success('Invite code copied!');
                                }}
                            >
                                Copy
                            </button>
                        </div>

                        <div className="team-status-row">
                            <span>👥 Members: {createdTeam.memberCount} / {createdTeam.maxMembers}</span>
                            <span>✅ Complete at: {createdTeam.minMembers} members</span>
                        </div>

                        {event.registrationFee > 0 && (
                            <p className="payment-warning">
                                ⚠️ Each member must also upload payment of ₹{event.registrationFee} after joining.
                            </p>
                        )}

                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={onClose}>
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content team-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Register for {event.name}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {/* Step 0: Mode selection */}
                {!mode && (
                    <div className="team-mode-select">
                        <div className="team-event-badge">
                            👥 Team Event &nbsp;·&nbsp; {event.minTeamSize}–{event.maxTeamSize} members per team
                        </div>

                        <p className="team-mode-hint">
                            You need to be in a team to register. Create a new one or join an existing team.
                        </p>

                        <button className="btn btn-primary mode-btn" onClick={() => setMode('create')}>
                            👑 Create a New Team
                        </button>
                        <button className="btn btn-secondary mode-btn" onClick={() => setMode('join')}>
                            🤝 Join Existing Team
                        </button>
                    </div>
                )}

                {/* Step 1a: Create Team */}
                {mode === 'create' && (
                    <form onSubmit={handleCreate} className="registration-form">
                        <div className="form-group">
                            <label>Team Name *</label>
                            <input
                                type="text"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="Choose a unique team name"
                                required
                            />
                        </div>

                        {renderCustomForm()}

                        {event.registrationFee > 0 && (
                            <div className="payment-info">
                                <h3>💰 Payment Required</h3>
                                <p className="fee-amount">₹{event.registrationFee} per member</p>
                                <p className="payment-note">
                                    Each member uploads their own payment proof from the dashboard after joining.
                                </p>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setMode(null)}>
                                Back
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Team'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 1b: Join Team */}
                {mode === 'join' && (
                    <div className="registration-form">
                        <div className="form-group">
                            <label>Invite Code *</label>
                            <div className="code-input-row">
                                <input
                                    type="text"
                                    value={inviteCodeInput}
                                    onChange={(e) => {
                                        setInviteCodeInput(e.target.value.toUpperCase());
                                        setTeamPreview(null); // reset preview on change
                                    }}
                                    placeholder="8-character code e.g. A3F9BC12"
                                    maxLength={8}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={lookupTeam}
                                    disabled={lookingUp || inviteCodeInput.length < 8}
                                >
                                    {lookingUp ? '...' : 'Look Up'}
                                </button>
                            </div>
                        </div>

                        {teamPreview && (
                            <form onSubmit={handleJoin}>
                                <div className="team-preview-box">
                                    <div className="team-preview-name">{teamPreview.team.name}</div>
                                    <div className="team-preview-event">for {teamPreview.event.name}</div>
                                    <div className="team-preview-members">
                                        👥 {teamPreview.team.memberCount} / {teamPreview.team.maxMembers} members
                                        {teamPreview.team.members.length > 0 && (
                                            <ul className="member-list">
                                                {teamPreview.team.members.map((m, i) => (
                                                    <li key={i}>{m}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className={`team-status-pill ${teamPreview.team.isComplete ? 'pill-complete' : 'pill-incomplete'}`}>
                                        {teamPreview.team.isComplete
                                            ? '✅ Team Complete (still accepting more)'
                                            : `⏳ Needs ${teamPreview.team.minMembers - teamPreview.team.memberCount} more to complete`}
                                    </div>
                                </div>

                                {renderCustomForm()}

                                {event.registrationFee > 0 && (
                                    <div className="payment-info">
                                        <h3>💰 Payment Required</h3>
                                        <p className="fee-amount">₹{event.registrationFee}</p>
                                        <p className="payment-note">
                                            Upload payment proof from your dashboard after joining.
                                        </p>
                                    </div>
                                )}

                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setMode(null)}>
                                        Back
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? 'Joining...' : 'Join Team'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {!teamPreview && (
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setMode(null)}>
                                    Back
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamRegistrationModal;
