// Register.js
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import './Styles.css';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const { register, logout, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            logout();
            navigate('/');
            return;
        }
    
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
    
        return () => {
            const script = document.querySelector('#recaptcha-script');
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            const recaptchaElements = document.getElementsByClassName('grecaptcha-badge');
            while (recaptchaElements.length > 0) {
                recaptchaElements[0].remove();
            }
        };
    }, [user, logout, navigate]);

    const validateField = (name, value) => {
        let error = '';
        
        switch (name) {
            case 'username':
                if (!value) {
                    error = 'Username is required';
                } else if (value.length < 3) {
                    error = 'Username must be at least 3 characters long';
                } else if (value.length > 30) {
                    error = 'Username must be less than 30 characters';
                } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/.test(value)) {
                    error = 'Username must start and end with a letter or number';
                } else if (/[-_.]{2,}/.test(value)) {
                    error = 'Username cannot contain consecutive special characters';
                } else if (!/^[a-zA-Z0-9-_.]+$/.test(value)) {
                    error = 'Username can only contain letters, numbers, hyphens, underscores, and periods';
                }
                break;

            case 'email':
                if (!value) {
                    error = 'Email is required';
                } else if (!/\S+@\S+\.\S+/.test(value)) {
                    error = 'Please enter a valid email address';
                }
                break;

            case 'password':
                if (!value) {
                    error = 'Password is required';
                } else if (value.length < 8) {
                    error = 'Password must be at least 8 characters long';
                } else if (!/(?=.*[a-z])/.test(value)) {
                    error = 'Password must contain at least one lowercase letter';
                } else if (!/(?=.*[A-Z])/.test(value)) {
                    error = 'Password must contain at least one uppercase letter';
                } else if (!/(?=.*\d)/.test(value)) {
                    error = 'Password must contain at least one number';
                }
                break;

            default:
                break;
        }

        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Validate field and update errors
        const error = validateField(name, value);
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!validateForm()) {
            setMessage('Please correct the errors before submitting.');
            return;
        }

        try {
            const token = await window.grecaptcha.execute(process.env.REACT_APP_RECAPTCHA_SITE_KEY, {
                action: 'register'
            });

            const response = await register(formData.username, formData.email, formData.password, token);
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
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                        {errors.username && <p className="error-message">{errors.username}</p>}
                    </div>
                    <div>
                        <label>Email:</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        {errors.email && <p className="error-message">{errors.email}</p>}
                    </div>
                    <div>
                        <label>Password:</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        {errors.password && <p className="error-message">{errors.password}</p>}
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