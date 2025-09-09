import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { faTwitter, faInstagram, faReddit } from '@fortawesome/free-brands-svg-icons';
import axios from 'axios';

const Footer = () => {
    const [currentYear, setCurrentYear] = useState('');
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setCurrentYear(new Date().getFullYear().toString());
    }, []);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        
        if (!email || !email.includes('@')) {
            setMessage('Please enter a valid email address.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/newsletter_subscribe.php`, {
                email: email
            });

            if (response.data.success) {
                setSubscribed(true);
                setEmail('');
                setMessage(response.data.message);
                setTimeout(() => {
                    setSubscribed(false);
                    setMessage('');
                }, 5000);
            } else {
                setMessage(response.data.message);
            }
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            setMessage('An error occurred. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <footer className="bg-gray-800 text-gray-200">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto pt-12 pb-6 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Brand Column */}
                    <div className="flex flex-col">
                        <Link to="/" className="mb-4">
                            <img className="h-10 w-auto object-contain" src="/images/mybricklog_logo.png" alt="MyBrickLog logo" />
                        </Link>
                        <p className="text-gray-400 mb-4">
                            Keep track of your LEGO® collection, discover new sets, and connect with other brick enthusiasts.
                        </p>
                        <div className="mt-auto">
                            <p className="text-sm text-gray-400">
                                Created by <Link to="/collection/1" className="text-yellow-400 hover:text-yellow-300 transition-colors">Jason</Link>
                            </p>
                        </div>
                    </div>

                    {/* Navigation Column */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white border-b border-gray-700 pb-2">
                            Site Navigation
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/collection" className="text-gray-400 hover:text-white transition-colors">
                                    My Collection
                                </Link>
                            </li>
                            <li>
                                <Link to="/wishlist" className="text-gray-400 hover:text-white transition-colors">
                                    My Wishlist
                                </Link>
                            </li>
                            <li>
                                <Link to="/themes" className="text-gray-400 hover:text-white transition-colors">
                                    Add Sets
                                </Link>
                            </li>
                            <li>
                                <Link to="/about" className="text-gray-400 hover:text-white transition-colors">
                                    About
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Connect Column */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white border-b border-gray-700 pb-2">
                            Connect
                        </h3>
                        <div className="flex flex-wrap gap-3 mb-4">
                            <a href="#" className="w-9 h-9 rounded-full bg-gray-700 hover:bg-blue-600 flex items-center justify-center transition-colors">
                                <FontAwesomeIcon icon={faTwitter} />
                            </a>
                            <a href="#" className="w-9 h-9 rounded-full bg-gray-700 hover:bg-pink-600 flex items-center justify-center transition-colors">
                                <FontAwesomeIcon icon={faInstagram} />
                            </a>
                            <a href="#" className="w-9 h-9 rounded-full bg-gray-700 hover:bg-orange-600 flex items-center justify-center transition-colors">
                                <FontAwesomeIcon icon={faReddit} />
                            </a>
                        </div>
                        <p className="text-gray-400 mb-2">Enjoying the site?</p>
                        <a 
                            href="https://buymeacoffee.com/jason.online" 
                            className="inline-block px-4 py-2 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-300 transition-colors font-medium text-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Support the Project
                        </a>
                    </div>

                    {/* Newsletter Column */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white border-b border-gray-700 pb-2">
                            Stay Updated
                        </h3>
                        <p className="text-gray-400 mb-3 text-sm">
                            Subscribe to our newsletter for updates on new LEGO® sets and features.
                        </p>
                        <form onSubmit={handleSubscribe} className="mb-4">
                            <div className="flex">
                                <input
                                    type="email"
                                    placeholder="Your email"
                                    className="w-full px-3 py-2 rounded-l focus:outline-none bg-gray-700 text-white text-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`px-3 py-2 rounded-r font-medium transition-colors ${
                                        isSubmitting 
                                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                            : 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 simple-spinner" style={{ borderWidth: '2px', borderColor: '#4b5563', borderTopColor: 'transparent' }}></div>
                                    ) : (
                                        <FontAwesomeIcon icon={faEnvelope} />
                                    )}
                                </button>
                            </div>
                            {(subscribed || message) && (
                                <p className={`text-xs mt-2 ${
                                    subscribed ? 'text-green-400' : 'text-red-400'
                                }`}>
                                    {message || 'Thanks for subscribing!'}
                                </p>
                            )}
                        </form>
                        <div className="text-sm text-gray-400">
                            <Link to="/privacy-policy" className="hover:text-white transition-colors mr-4">
                                Privacy Policy
                            </Link>
                            <Link to="/terms-of-service" className="hover:text-white transition-colors">
                                Terms of Service
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright Bar */}
            <div className="border-t border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-sm text-gray-500">
                        © {currentYear} MyBrickLog
                    </p>
                    <p className="text-xs text-gray-500 mt-2 md:mt-0">
                        LEGO® is a trademark of the LEGO Group which does not sponsor, authorize or endorse this site.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;