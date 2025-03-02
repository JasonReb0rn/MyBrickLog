import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const Verify = () => {
    const { verificationToken } = useParams();
    const [verificationMessage, setVerificationMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const verifyUser = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/verify.php?token=${verificationToken}`);
                
                console.log('Response:', response.data);

                if (response.data.success) {
                    setVerificationMessage('Verification successful! You can now login.');
                    setIsSuccess(true);
                } else {
                    setVerificationMessage('Verification failed. Please try again.');
                    setIsSuccess(false);
                }
            } catch (error) {
                console.error('Error verifying user:', error);
                setVerificationMessage('Error verifying user. Please try again later.');
                setIsSuccess(false);
            }
            setIsLoading(false);
        };

        verifyUser();
    }, [verificationToken]);

    return (
        <div className="flex justify-center items-center min-h-[60vh] px-4 py-10">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Verification</h2>
                
                {isLoading ? (
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Verifying your account...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        {isSuccess ? (
                            <>
                                <FontAwesomeIcon 
                                    icon={faCheckCircle} 
                                    className="text-green-500 text-5xl mb-4" 
                                />
                                <p className="text-lg text-gray-700 mb-6">{verificationMessage}</p>
                                <Link 
                                    to="/login" 
                                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                >
                                    Go to Login
                                </Link>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon 
                                    icon={faExclamationTriangle} 
                                    className="text-red-500 text-5xl mb-4" 
                                />
                                <p className="text-lg text-gray-700 mb-6">{verificationMessage}</p>
                                <Link 
                                    to="/register" 
                                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                >
                                    Back to Registration
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Verify;