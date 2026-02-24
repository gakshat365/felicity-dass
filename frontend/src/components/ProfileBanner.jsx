import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from '../api/axios';
import './ProfileBanner.css';

const ProfileBanner = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [show, setShow] = useState(false);
    const [completeness, setCompleteness] = useState(100);
    const [missingFields, setMissingFields] = useState([]);

    useEffect(() => {
        // Check if banner was dismissed
        const dismissed = localStorage.getItem('profileBannerDismissed');
        const dismissedDate = localStorage.getItem('profileBannerDismissedDate');

        if (dismissed && dismissedDate) {
            const daysSinceDismissed = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 3) {
                return; // Don't show if dismissed less than 3 days ago
            }
        }

        // Fetch profile completion status
        fetchProfileCompletion();
    }, [user]);

    const fetchProfileCompletion = async () => {
        try {
            const { data } = await axios.get('/users/profile-completion');
            setCompleteness(data.completeness);
            setMissingFields(data.missingFields);

            // Only show if profile is incomplete
            if (data.completeness < 100) {
                setShow(true);
            }
        } catch (error) {
            console.error('Error fetching profile completion:', error);
        }
    };

    const handleDismiss = () => {
        setShow(false);
        localStorage.setItem('profileBannerDismissed', 'true');
        localStorage.setItem('profileBannerDismissedDate', Date.now().toString());
    };

    const handleCompleteProfile = () => {
        navigate('/profile');
    };

    if (!show || user?.role !== 'participant') {
        return null;
    }

    // Determine color based on completeness
    const getColorClass = () => {
        if (completeness < 60) return 'red';
        if (completeness < 90) return 'yellow';
        return 'green';
    };

    return (
        <div className={`profile-banner ${getColorClass()}`}>
            <div className="banner-content">
                <div className="banner-left">
                    <div className="progress-circle">
                        <svg width="48" height="48" viewBox="0 0 48 48">
                            <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                opacity="0.2"
                            />
                            <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeDasharray={`${2 * Math.PI * 20}`}
                                strokeDashoffset={`${2 * Math.PI * 20 * (1 - completeness / 100)}`}
                                strokeLinecap="round"
                                transform="rotate(-90 24 24)"
                            />
                            <text
                                x="24"
                                y="24"
                                textAnchor="middle"
                                dy="0.3em"
                                fontSize="12"
                                fontWeight="600"
                                fill="currentColor"
                            >
                                {completeness}%
                            </text>
                        </svg>
                    </div>
                    <div className="banner-text">
                        <h4>Profile Completeness: {completeness}%</h4>
                        <p>Complete your profile to get personalized event recommendations!</p>
                        {missingFields.length > 0 && (
                            <span className="missing-fields">
                                Missing: {missingFields.join(', ')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="banner-actions">
                    <button onClick={handleCompleteProfile} className="btn btn-primary btn-sm">
                        Complete Profile
                    </button>
                    <button onClick={handleDismiss} className="btn btn-ghost btn-sm">
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileBanner;
