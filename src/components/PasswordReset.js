import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

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
            <div className="flex justify-center items-center py-10 px-4">
                <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Reset Password</h2>
                    <p className="text-center text-gray-600">Verifying reset link...</p>
                    <div className="flex justify-center mt-4">
                        <div className="w-8 h-8 simple-spinner mx-auto" style={{ borderWidth: '2px' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isValid) {
        return (
            <div className="flex justify-center items-center py-10 px-4">
                <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Reset Password</h2>
                    {message && (
                        <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-md mb-4">
                            {message}
                        </div>
                    )}
                    <div className="text-center mt-4">
                        <Link to="/forgot-password" className="text-blue-600 hover:underline">
                            Request a new reset link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center py-10 px-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Reset Password</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">New Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Confirm Password:</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    {message && (
                        <div className={`p-3 ${message.includes('successfully') ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'} border rounded-md`}>
                            {message}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PasswordReset;