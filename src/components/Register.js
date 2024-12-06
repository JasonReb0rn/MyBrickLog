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
        if (user) {
            logout();
            navigate('/');
        }
    }, [user, logout, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await register(username, email, password);
        if (response.success) {
            setMessage('Registration successful! Please check your email to verify your account.');
        } else {
            setMessage(response.message || 'Registration failed');
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
                        />
                    </div>
                    <div>
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                    {message && <p>{message}</p>}
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
