import { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
    validateParticipantEmail,
    validateOrganizerEmail,
    IIIT_DOMAINS
} from '../utils/emailValidator';
import './Auth.css';

const Register = () => {
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'participant',
        organizerName: '',
        category: '',
        description: '',
        contactNumber: ''
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Basic validation
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        // Email domain validation
        if (formData.email) {
            if (formData.role === 'organizer') {
                const validation = validateOrganizerEmail(formData.email);
                if (!validation.valid) {
                    newErrors.email = validation.message;
                }
            } else {
                const validation = validateParticipantEmail(formData.email);
                if (!validation.valid) {
                    newErrors.email = validation.message;
                }
            }
        }

        // Organizer-specific validation
        if (formData.role === 'organizer') {
            if (!formData.organizerName.trim()) {
                newErrors.organizerName = 'Organization name is required';
            }
            if (!formData.category.trim()) {
                newErrors.category = 'Category is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        const { confirmPassword, ...userData } = formData;
        const success = await register(userData);
        setLoading(false);

        if (success) {
            navigate('/onboarding');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-content">
                <div className="auth-header">
                    <h1>Event Management System</h1>
                    <p className="auth-subtitle">IIIT Hyderabad</p>
                </div>

                <div className="auth-card">
                    <div className="card-header">
                        <h2>Create your account</h2>
                        <p>Join the IIIT event management platform</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {/* Name Fields */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="firstName" className="form-label">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    className={`form-input ${errors.firstName ? 'error' : ''}`}
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                                {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName" className="form-label">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    className={`form-input ${errors.lastName ? 'error' : ''}`}
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                                {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="user@iiit.ac.in"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                            <span className="helper-text">
                                IIIT emails: @students.iiit.ac.in, @iiit.ac.in, etc. or any valid email
                            </span>
                        </div>

                        {/* Organizer-specific fields */}


                        {/* Contact Number */}
                        <div className="form-group">
                            <label htmlFor="contactNumber" className="form-label">
                                Contact Number (Optional)
                            </label>
                            <input
                                type="tel"
                                id="contactNumber"
                                name="contactNumber"
                                className="form-input"
                                placeholder="+91 1234567890"
                                value={formData.contactNumber}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Password Fields */}
                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="Minimum 6 characters"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            {errors.password && <span className="error-text">{errors.password}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? 'Creating account...' : 'Create account'}
                        </button>

                        <div className="auth-footer">
                            <p>
                                Already have an account?{' '}
                                <Link to="/login" className="auth-link">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
