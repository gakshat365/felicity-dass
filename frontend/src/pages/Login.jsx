import { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await login(email, password);
        setLoading(false);
        if (success) {
            navigate('/dashboard');
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
                        <h2>Sign in to your account</h2>
                        <p>Enter your credentials to access the platform</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email address
                            </label>
                            <input
                                type="email"
                                id="email"
                                className="form-input"
                                placeholder="user@iiit.ac.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                className="form-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>

                        <div className="auth-footer">
                            <p>
                                Don&apos;t have an account?{' '}
                                <Link to="/register" className="auth-link">
                                    Create account
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>

                <div className="auth-info">
                    <p className="info-text">
                        <strong>Demo Credentials:</strong>
                    </p>
                    <p className="info-text">Admin: admin@iiit.ac.in / Admin@123456</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
