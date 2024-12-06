// Verify.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const Verify = () => {
    const { verificationToken } = useParams(); // Assuming your token is passed as a URL parameter
    const [verificationMessage, setVerificationMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const verifyUser = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/verify.php?token=${verificationToken}`);
                
                console.log('Response:', response.data);

                if (response.data.success) {
                    setVerificationMessage('Verification successful! You can now login.');
                } else {
                    setVerificationMessage('Verification failed. Please try again.');
                }
            } catch (error) {
                console.error('Error verifying user:', error);
                setVerificationMessage('Error verifying user. Please try again later.');
            }
            setIsLoading(false);
        };

        verifyUser();
    }, [verificationToken]);

    return (
        <div className="verify-container">
            {isLoading ? (
                <div>Loading...</div>
            ) : (
                <div>{verificationMessage}</div>
            )}
        </div>
    );
};

export default Verify;
