import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [unverified, setUnverified] = useState(false);
    const [email, setEmail] = useState('');
    const [verificationToken, setVerificationToken] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
        setIsSubmitting(true);
        
        try {
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
        } catch (error) {
            setMessage('An error occurred during login. Please try again.');
        } finally {
            setIsSubmitting(false);
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
            setUnverified(false);
        } else {
            setMessage('Failed to resend verification email.');
        }
    };

    return (
        <div className="flex justify-center items-center py-10 px-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Username:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    {message && (
                        <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-md">
                            {message}
                        </div>
                    )}

                    <div className="text-center">
                        <p className="text-gray-600">
                            Forgot your password? <Link to="/forgot-password" className="text-blue-600 hover:underline">Reset it here</Link>
                        </p>
                    </div>

                    {unverified && (
                        <button 
                            type="button"
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                            onClick={handleResendVerification}
                        >
                            Resend Verification Email
                        </button>
                    )}

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                
                <div className="text-center mt-6">
                    <p className="text-gray-600">
                        Not already a member? <Link to="/register" className="text-blue-600 hover:underline">Register an account now!</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;