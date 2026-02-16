import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import './Onboarding.css';

const INTEREST_OPTIONS = [
    { value: 'dance', label: 'Dance', icon: '💃' },
    { value: 'music', label: 'Music', icon: '🎵' },
    { value: 'coding', label: 'Coding', icon: '💻' },
    { value: 'hacking', label: 'Hacking', icon: '🔐' },
    { value: 'opensource', label: 'Open Source', icon: '🌐' },
    { value: 'quantum', label: 'Quantum', icon: '⚛️' },
    { value: 'art', label: 'Art', icon: '🎨' }
];

const Onboarding = () => {
    const { user, setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form state
    const [interests, setInterests] = useState([]);
    const [following, setFollowing] = useState([]);
    const [collegeName, setCollegeName] = useState('');
    const [contactNumber, setContactNumber] = useState('');

    // Organizers data
    const [organizers, setOrganizers] = useState([]);
    const [organizerCategory, setOrganizerCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch organizers when on step 3
    const fetchOrganizers = async () => {
        try {
            const params = {};
            if (organizerCategory !== 'all') params.category = organizerCategory;
            if (searchQuery) params.search = searchQuery;

            const { data } = await axios.get('/users/organizers', { params });
            setOrganizers(data);
        } catch (error) {
            console.error('Error fetching organizers:', error);
        }
    };

    // Handle interest toggle
    const toggleInterest = (interest) => {
        if (interests.includes(interest)) {
            setInterests(interests.filter(i => i !== interest));
        } else {
            setInterests([...interests, interest]);
        }
    };

    // Handle organizer follow toggle
    const toggleFollow = (organizerId) => {
        if (following.includes(organizerId)) {
            setFollowing(following.filter(id => id !== organizerId));
        } else {
            setFollowing([...following, organizerId]);
        }
    };

    // Handle skip
    const handleSkip = async () => {
        try {
            setLoading(true);
            const { data } = await axios.post('/users/onboarding', {
                interests,
                following,
                collegeName,
                contactNumber,
                skipOnboarding: true
            });
            setUser(data);
            toast.success('You can complete your profile anytime!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving preferences');
        } finally {
            setLoading(false);
        }
    };

    // Handle next step
    const handleNext = () => {
        if (step === 3) {
            fetchOrganizers();
        }
        setStep(step + 1);
    };

    // Handle complete
    const handleComplete = async () => {
        try {
            setLoading(true);
            const { data } = await axios.post('/users/onboarding', {
                interests,
                following,
                collegeName,
                contactNumber,
                skipOnboarding: false
            });
            setUser(data);
            toast.success('Profile setup complete!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving preferences');
        } finally {
            setLoading(false);
        }
    };

    // Fetch organizers when category or search changes
    useState(() => {
        if (step === 3) {
            fetchOrganizers();
        }
    }, [step, organizerCategory, searchQuery]);

    return (
        <div className="onboarding-container">
            <div className="onboarding-content">
                {/* Progress Indicator */}
                <div className="onboarding-progress">
                    <div className={`progress-dot ${step >= 1 ? 'active' : ''}`}>1</div>
                    <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
                    <div className={`progress-dot ${step >= 2 ? 'active' : ''}`}>2</div>
                    <div className={`progress-line ${step >= 3 ? 'active' : ''}`}></div>
                    <div className={`progress-dot ${step >= 3 ? 'active' : ''}`}>3</div>
                    <div className={`progress-line ${step >= 4 ? 'active' : ''}`}></div>
                    <div className={`progress-dot ${step >= 4 ? 'active' : ''}`}>4</div>
                </div>

                {/* Step 1: Welcome */}
                {step === 1 && (
                    <div className="onboarding-step">
                        <h1>Welcome to Event Management System! 👋</h1>
                        <p className="subtitle">Let's personalize your experience</p>
                        <div className="welcome-card">
                            <h3>Why complete your profile?</h3>
                            <ul>
                                <li>✨ Get personalized event recommendations</li>
                                <li>🎯 Discover events matching your interests</li>
                                <li>⭐ Follow your favorite clubs and organizers</li>
                                <li>🔔 Never miss important updates</li>
                            </ul>
                        </div>
                        <div className="button-group">
                            <button onClick={handleSkip} className="btn btn-secondary">
                                Skip for now
                            </button>
                            <button onClick={handleNext} className="btn btn-primary">
                                Let's get started
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Interests */}
                {step === 2 && (
                    <div className="onboarding-step">
                        <h2>What are you interested in?</h2>
                        <p className="subtitle">Select all that apply</p>
                        <div className="interest-grid">
                            {INTEREST_OPTIONS.map(option => (
                                <div
                                    key={option.value}
                                    className={`interest-card ${interests.includes(option.value) ? 'selected' : ''}`}
                                    onClick={() => toggleInterest(option.value)}
                                >
                                    <span className="interest-icon">{option.icon}</span>
                                    <span className="interest-label">{option.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="button-group">
                            <button onClick={handleSkip} className="btn btn-secondary">
                                Skip
                            </button>
                            <button onClick={handleNext} className="btn btn-primary">
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Follow Organizers */}
                {step === 3 && (
                    <div className="onboarding-step">
                        <h2>Follow Clubs & Organizers</h2>
                        <p className="subtitle">Stay updated with events from your favorite organizers</p>

                        {/* Category Filter */}
                        <div className="filter-tabs">
                            <button
                                className={`filter-tab ${organizerCategory === 'all' ? 'active' : ''}`}
                                onClick={() => setOrganizerCategory('all')}
                            >
                                All
                            </button>
                            <button
                                className={`filter-tab ${organizerCategory === 'club' ? 'active' : ''}`}
                                onClick={() => setOrganizerCategory('club')}
                            >
                                Clubs
                            </button>
                            <button
                                className={`filter-tab ${organizerCategory === 'council' ? 'active' : ''}`}
                                onClick={() => setOrganizerCategory('council')}
                            >
                                Councils
                            </button>
                            <button
                                className={`filter-tab ${organizerCategory === 'fest-team' ? 'active' : ''}`}
                                onClick={() => setOrganizerCategory('fest-team')}
                            >
                                Fest Teams
                            </button>
                        </div>

                        {/* Search */}
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search organizers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="form-input"
                            />
                        </div>

                        {/* Organizers List */}
                        <div className="organizers-list">
                            {organizers.map(org => (
                                <div key={org._id} className="organizer-card">
                                    <div className="organizer-info">
                                        <h4>{org.organizerName}</h4>
                                        <span className={`badge badge-${org.category}`}>
                                            {org.category}
                                        </span>
                                        <p>{org.description}</p>
                                        <span className="follower-count">
                                            {org.followerCount} followers
                                        </span>
                                    </div>
                                    <button
                                        className={`btn ${following.includes(org._id) ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => toggleFollow(org._id)}
                                    >
                                        {following.includes(org._id) ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="button-group">
                            <button onClick={() => setStep(2)} className="btn btn-secondary">
                                Back
                            </button>
                            <button onClick={handleSkip} className="btn btn-secondary">
                                Skip
                            </button>
                            <button onClick={handleNext} className="btn btn-primary">
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Additional Info */}
                {step === 4 && (
                    <div className="onboarding-step">
                        <h2>Almost done!</h2>
                        <p className="subtitle">Add a few more details (optional)</p>

                        <div className="form-group">
                            <label className="form-label">College/Organization Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., IIIT Hyderabad"
                                value={collegeName}
                                onChange={(e) => setCollegeName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Contact Number</label>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="e.g., 9876543210"
                                value={contactNumber}
                                onChange={(e) => setContactNumber(e.target.value)}
                            />
                        </div>

                        <div className="summary-card">
                            <h3>Your Profile Summary</h3>
                            <div className="summary-item">
                                <strong>Interests:</strong> {interests.length > 0 ? interests.join(', ') : 'None selected'}
                            </div>
                            <div className="summary-item">
                                <strong>Following:</strong> {following.length} organizer(s)
                            </div>
                            <div className="summary-item">
                                <strong>College:</strong> {collegeName || 'Not provided'}
                            </div>
                            <div className="summary-item">
                                <strong>Contact:</strong> {contactNumber || 'Not provided'}
                            </div>
                        </div>

                        <div className="button-group">
                            <button onClick={() => setStep(3)} className="btn btn-secondary">
                                Back
                            </button>
                            <button onClick={handleSkip} className="btn btn-secondary">
                                Skip
                            </button>
                            <button
                                onClick={handleComplete}
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Complete Setup'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;
