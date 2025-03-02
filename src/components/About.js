import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const About = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [creatorInfo, setCreatorInfo] = useState({
        profile_picture: '',
        display_name: 'Jason'
    });

    const cryptoWallets = [
        { name: 'Bitcoin (BTC)', address: 'bc1qhclc8003jgk7cjz8f4hqtdw83qc0xmzh4p3sff' },
        { name: 'Ethereum (ETH)', address: '0x0B1e5c79b1C6862b47391Ea13e9a2860f530b6a8' },
        { name: 'Dogecoin (DOGE)', address: 'D5DJSKnAt2FXbjL2bTkZCR9JAP7vz8Py5r' }
    ];

    useEffect(() => {
        const fetchCreatorInfo = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/get_creator_info.php`);
                if (response.data.error) {
                    console.error('Error fetching creator info:', response.data.error);
                } else {
                    setCreatorInfo({
                        profile_picture: response.data.profile_picture || '/images/lego_user.png',
                        display_name: response.data.display_name || 'Jason'
                    });
                }
            } catch (error) {
                console.error('Error fetching creator info:', error);
            }
            setIsLoading(false);
        };

        fetchCreatorInfo();
    }, []);

    return (
        <div className="max-w-3xl mx-auto px-6 py-12">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-10">About MyBrickLog</h1>
            
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Profile Section */}
                <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 border-b border-gray-200">
                    <img 
                        src={creatorInfo.profile_picture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${creatorInfo.profile_picture}` : '/images/lego_user.png'}
                        alt="Creator" 
                        className="w-36 h-36 rounded-full object-cover border border-gray-300"
                    />
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Hi, I'm {creatorInfo.display_name}!</h2>
                        <p className="text-gray-600 mb-4">
                            Thanks for using MyBrickLog! I created this platform to help LEGO® enthusiasts 
                            keep track of their collections and connect with other builders.
                        </p>
                        <p className="text-gray-600">
                            This website was created with React, PHP and SQL. It's entirely self-hosted from my home server 
                            (aka an old dusty PC sat in a corner of the dog room), aside from AWS S3 bucket for storing profile pictures.
                        </p>
                    </div>
                </div>

                {/* Social Links Section */}
                <div className="p-6 md:p-8 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">Connect With Me</h3>
                    <div className="flex flex-wrap gap-4">
                        <a 
                            href="https://github.com/JasonReb0rn" 
                            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FontAwesomeIcon icon={['fab', 'github']} />
                            <span>GitHub</span>
                        </a>
                        <a 
                            href="https://twitter.com/itsjasonreborn" 
                            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FontAwesomeIcon icon={['fab', 'twitter']} />
                            <span>Twitter</span>
                        </a>
                    </div>
                </div>

                {/* Support Section */}
                <div className="p-6 md:p-8 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Support the Project</h3>
                    <p className="text-gray-600 mb-6">
                        If you're enjoying MyBrickLog and would like to support its development or running costs, 
                        you can contribute using any of these cryptocurrency addresses:
                    </p>
                    
                    <div className="space-y-6">
                        {cryptoWallets.map((wallet, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-5">
                                <h4 className="text-lg font-medium text-gray-800 mb-3">{wallet.name}</h4>
                                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-3 break-all">
                                    <code className="text-gray-600 text-sm md:text-base font-mono flex-grow">{wallet.address}</code>
                                    <button 
                                        className="ml-2 p-2 text-blue-600 hover:text-blue-800 transition-colors"
                                        onClick={() => navigator.clipboard.writeText(wallet.address)}
                                    >
                                        <FontAwesomeIcon icon="copy" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="p-6 text-center text-gray-500 text-sm">
                    Not affiliated with the LEGO® Group. LEGO® is a trademark of the LEGO Group.
                </div>
            </div>
        </div>
    );
};

export default About;