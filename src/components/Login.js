import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import './Styles.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [unverified, setUnverified] = useState(false);
    const [email, setEmail] = useState('');
    const [verificationToken, setVerificationToken] = useState('');
    const { login, logout, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            logout();
            navigate('/');
        }
    }, [user, logout, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await login(username, password);
        if (response.success) {
            navigate('/');
        } else if (response.unverified) {
            setUnverified(true);
            setEmail(response.email);
            setVerificationToken(response.verification_token);
            setMessage('Your account is not verified. Would you like to resend the verification email?');
        } else {
            setMessage(response.error || 'Invalid credentials');
        }
    };

    const handleResendVerification = async () => {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/resend_verification.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, verificationToken }),
        });
        const data = await response.json();
        if (data.success) {
            setMessage('Verification email has been resent. Please check your inbox.');
            setUnverified(false); // Hide the resend button
        } else {
            setMessage('Failed to resend verification email.');
        }
    };

    return (
        <div className="auth-container-centered">
            <div className="auth-container">
                <h2>Login</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>Username:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {message && <p className="error-message">{message}</p>}

                    {unverified && (
                    <button className="resend-verification-button" onClick={handleResendVerification}>Resend Verification Email</button>
                    )}
                    <button type="submit">Login</button>

                </form>
                
                <div className="signup-link">
                    <p>Not already a member? <Link to="/register">Register an account now!</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
