import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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

        setIsSubmitting(true);
        
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
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex justify-center items-center py-10 px-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Register</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Username:</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.username && (
                            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Email:</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Password:</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                        )}
                    </div>
                    
                    {message && (
                        <div className={`p-3 ${message.includes('successful') ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'} border rounded-md`}>
                            {message}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Registering...' : 'Register'}
                    </button>
                </form>
                
                <div className="text-center mt-6">
                    <p className="text-gray-600">
                        Already a member? <Link to="/login" className="text-blue-600 hover:underline">Login instead.</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;