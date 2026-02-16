import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import './Auth.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/auth/request-password-reset', { email, reason });
            setSubmitted(true);
            toast.success('Recovery request sent to administrator');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Account Recovery</h2>
                {submitted ? (
                    <div className="success-state">
                        <div className="success-icon">⏳</div>
                        <p>Your recovery request has been submitted successfully.</p>
                        <p className="admin-note">An administrator will review your request. Once approved, a temporary password will be sent to your email.</p>
                        <Link to="/login" className="btn btn-primary btn-full">Back to Login</Link>
                    </div>
                ) : (
                    <>
                        <p className="auth-subtitle">Organizers can request a password reset from the platform admin.</p>
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label>Registered Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Enter your registered email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Reason for Reset</label>
                                <textarea
                                    className="form-input"
                                    placeholder="Briefly explain why you need a reset (e.g., Forgot password, Security concern)"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    rows={3}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                {loading ? 'Submitting Request...' : 'Send Recovery Request'}
                            </button>
                        </form>
                        <div className="auth-footer">
                            <Link to="/login">Back to Login</Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
