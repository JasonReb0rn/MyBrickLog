// Register.js
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import './Styles.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const { register, logout, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // First handle user redirect if logged in
        if (user) {
            logout();
            navigate('/');
            return; // Exit early
        }
    
        // Load ReCAPTCHA only for registration
        let recaptchaScript = document.querySelector('#recaptcha-script');
        
        if (!recaptchaScript) {
            recaptchaScript = document.createElement('script');
            recaptchaScript.src = `https://www.google.com/recaptcha/api.js?render=${process.env.REACT_APP_RECAPTCHA_SITE_KEY}`;
            recaptchaScript.async = true;
            recaptchaScript.defer = true;
            recaptchaScript.id = 'recaptcha-script';
            
            recaptchaScript.onload = () => {
                console.log('ReCAPTCHA script loaded');
            };
            
            document.head.appendChild(recaptchaScript);
        }
    
        // Cleanup function
        return () => {
            // Remove the script
            const script = document.querySelector('#recaptcha-script');
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            // Remove the ReCAPTCHA badge/elements
            const recaptchaElements = document.getElementsByClassName('grecaptcha-badge');
            while (recaptchaElements.length > 0) {
                recaptchaElements[0].remove();
            }
        };
    }, [user, logout, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Execute ReCAPTCHA and get token
            const token = await window.grecaptcha.execute(process.env.REACT_APP_RECAPTCHA_SITE_KEY, {
                action: 'register'
            });

            const response = await register(username, email, password, token);
            if (response.success) {
                setMessage('Registration successful! Please check your email to verify your account.');
            } else {
                setMessage(response.message || 'Registration failed');
            }
        } catch (error) {
            setMessage('An error occurred during registration. Please try again.');
            console.error('Registration error:', error);
        }
    };

    return (
        <div className="auth-container-centered">
            <div className="auth-container">
                <h2>Register</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>Username:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {message && <p className={message.includes('successful') ? 'success-message' : 'error-message'}>{message}</p>}
                    <button type="submit">Register</button>
                </form>
                <div className="signup-link">
                    <p>Already a member? <Link to="/login">Login instead.</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Register;