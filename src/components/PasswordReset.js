// PasswordReset.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './Login.css';

const PasswordReset = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { token } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const verifyToken = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/verify_reset_token.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token }),
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    setMessage('This password reset link is invalid or has expired.');
                    setIsValid(false);
                } else {
                    setIsValid(true);
                }
            } catch (error) {
                setMessage('An error occurred. Please try again.');
                setIsValid(false);
            } finally {
                setIsLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setMessage('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/reset_password.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                setMessage('Password successfully reset. Redirecting to login...');
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setMessage(data.message || 'An error occurred. Please try again.');
            }
        } catch (error) {
            setMessage('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="auth-container-centered">
                <div className="auth-container">
                    <h2>Reset Password</h2>
                    <p>Verifying reset link...</p>
                </div>
            </div>
        );
    }

    if (!isValid) {
        return (
            <div className="auth-container-centered">
                <div className="auth-container">
                    <h2>Reset Password</h2>
                    {message && <p className="error-message">{message}</p>}
                    <div className="signup-link">
                        <p><Link to="/forgot-password">Request a new reset link</Link></p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container-centered">
            <div className="auth-container">
                <h2>Reset Password</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>New Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Confirm Password:</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    {message && <p className="error-message">{message}</p>}
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PasswordReset;