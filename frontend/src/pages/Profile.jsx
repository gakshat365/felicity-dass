import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import './Profile.css';

const INTEREST_OPTIONS = [
    { value: 'dance', label: 'Dance', icon: '💃' },
    { value: 'music', label: 'Music', icon: '🎵' },
    { value: 'coding', label: 'Coding', icon: '💻' },
    { value: 'hacking', label: 'Hacking', icon: '🔐' },
    { value: 'opensource', label: 'Open Source', icon: '🌐' },
    { value: 'quantum', label: 'Quantum', icon: '⚛️' },
    { value: 'art', label: 'Art', icon: '🎨' }
];

const Profile = () => {
    const { user, updateUserProfile, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        interests: [],
        collegeName: '',
        contactNumber: '',
        organizerName: '',
        description: '',
        contactEmail: '',
        discordWebhookUrl: ''
    });

    const [following, setFollowing] = useState([]);
    const [profileCompletion, setProfileCompletion] = useState(100);

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                interests: user.interests || [],
                collegeName: user.collegeName || '',
                contactNumber: user.contactNumber || '',
                organizerName: user.organizerName || '',
                description: user.description || '',
                contactEmail: user.contactEmail || '',
                discordWebhookUrl: user.discordWebhookUrl || ''
            });
            setFollowing(user.following || []);
            setProfileCompletion(user.profileCompleteness || 50);
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const toggleInterest = (interest) => {
        const newInterests = formData.interests.includes(interest)
            ? formData.interests.filter(i => i !== interest)
            : [...formData.interests, interest];

        setFormData({
            ...formData,
            interests: newInterests
        });
    };

    const handleUnfollow = async (organizerId) => {
        try {
            await axios.post(`/users/follow/${organizerId}`);
            setFollowing(following.filter(org => org._id !== organizerId));
            toast.success('Unfollowed successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error unfollowing');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data } = await axios.patch('/users/profile', formData);
            updateUserProfile(data);
            setEditing(false);
            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getCompletionColor = () => {
        if (profileCompletion < 60) return 'red';
        if (profileCompletion < 90) return 'yellow';
        return 'green';
    };

    return (
        <div className="profile-container">
            {/* Header */}
            <header className="profile-header">
                <div className="header-content">
                    <h1>Profile Settings</h1>
                </div>
            </header>

            <div className="profile-main">
                {/* Profile Form */}
                <div className="profile-card">
                    <div className="card-header">
                        <h2>Personal Information</h2>
                        {!editing && (
                            <button onClick={() => setEditing(true)} className="btn btn-primary btn-sm">
                                Edit Profile
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Basic Info */}
                        <div className="form-section">
                            <h3>Basic Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        className="form-input"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        disabled={!editing}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        className="form-input"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        disabled={!editing}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email (Locked)</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={user?.email}
                                    disabled
                                />
                                <span className="helper-text">Email cannot be changed</span>
                            </div>

                            {user?.role === 'participant' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Participant Type (Auto-detected)</label>
                                        <div className="badge-display">
                                            <span className="badge badge-info">{user.participantType}</span>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">College/Organization</label>
                                            <input
                                                type="text"
                                                name="collegeName"
                                                className="form-input"
                                                placeholder="e.g., IIIT Hyderabad"
                                                value={formData.collegeName}
                                                onChange={handleChange}
                                                disabled={!editing}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Contact Number</label>
                                            <input
                                                type="tel"
                                                name="contactNumber"
                                                className="form-input"
                                                placeholder="e.g., 9876543210"
                                                value={formData.contactNumber}
                                                onChange={handleChange}
                                                disabled={!editing}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {user?.role === 'organizer' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Organization Name</label>
                                        <input
                                            type="text"
                                            name="organizerName"
                                            className="form-input"
                                            value={formData.organizerName}
                                            onChange={handleChange}
                                            disabled={!editing}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Category (Locked)</label>
                                        <div className="badge-display">
                                            <span className="badge badge-warning">{user.category}</span>
                                        </div>
                                        <span className="helper-text">Category cannot be changed</span>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea
                                            name="description"
                                            className="form-textarea"
                                            rows="4"
                                            value={formData.description}
                                            onChange={handleChange}
                                            disabled={!editing}
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Contact Email</label>
                                            <input
                                                type="email"
                                                name="contactEmail"
                                                className="form-input"
                                                value={formData.contactEmail}
                                                onChange={handleChange}
                                                disabled={!editing}
                                            />
                                            <div className="form-group">
                                                <label className="form-label">Contact Number</label>
                                                <input
                                                    type="tel"
                                                    name="contactNumber"
                                                    className="form-input"
                                                    value={formData.contactNumber}
                                                    onChange={handleChange}
                                                    disabled={!editing}
                                                />
                                            </div>
                                        </div>

                                        <div className="webhook-input-group">
                                            <input
                                                type="url"
                                                name="discordWebhookUrl"
                                                className="form-input"
                                                placeholder="https://discord.com/api/webhooks/..."
                                                value={formData.discordWebhookUrl}
                                                onChange={handleChange}
                                                disabled={!editing}
                                            />
                                        </div>
                                        <span className="helper-text">Auto-post new events to your Discord channel</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Interests (Participants Only) */}
                        {user?.role === 'participant' && (
                            <div className="form-section">
                                <h3>Areas of Interest</h3>
                                <div className="interest-grid">
                                    {INTEREST_OPTIONS.map(option => (
                                        <div
                                            key={option.value}
                                            className={`interest-card ${formData.interests.includes(option.value) ? 'selected' : ''} ${!editing ? 'disabled' : ''}`}
                                            onClick={() => editing && toggleInterest(option.value)}
                                        >
                                            <span className="interest-icon">{option.icon}</span>
                                            <span className="interest-label">{option.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Following (Participants Only) */}
                        {user?.role === 'participant' && following.length > 0 && (
                            <div className="form-section">
                                <h3>Following ({following.length})</h3>
                                <div className="following-list">
                                    {following.map(org => (
                                        <div key={org._id} className="following-item">
                                            <div className="following-info">
                                                <h4>{org.organizerName}</h4>
                                                <span className={`badge badge-${org.category}`}>
                                                    {org.category}
                                                </span>
                                            </div>
                                            {editing && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUnfollow(org._id)}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    Unfollow
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {editing && (
                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="btn btn-secondary"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Security Section */}
                <div className="profile-card security-section">
                    <div className="card-header">
                        <h2>🔒 Security Settings</h2>
                    </div>
                    <form className="security-form" onSubmit={async (e) => {
                        e.preventDefault();
                        const currentPassword = e.target.currentPassword.value;
                        const newPassword = e.target.newPassword.value;
                        const confirmPassword = e.target.confirmPassword.value;

                        if (newPassword !== confirmPassword) {
                            return toast.error('Passwords do not match');
                        }

                        try {
                            setLoading(true);
                            await axios.patch('/auth/change-password', { currentPassword, newPassword });
                            toast.success('Password changed successfully');
                            e.target.reset();
                        } catch (error) {
                            toast.error(error.response?.data?.message || 'Error changing password');
                        } finally {
                            setLoading(false);
                        }
                    }}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input type="password" name="currentPassword" placeholder="••••••••" required className="form-input" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input type="password" name="newPassword" placeholder="••••••••" required className="form-input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <input type="password" name="confirmPassword" placeholder="••••••••" required className="form-input" />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-warning" disabled={loading}>
                            Update Password
                        </button>
                    </form>
                </div>
            </div >
        </div >
    );
};

export default Profile;
