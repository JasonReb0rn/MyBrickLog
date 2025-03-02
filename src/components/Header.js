import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/');
        setIsMobileMenuOpen(false); // Close mobile menu on logout
    };

    const collectionUrl = user ? `/collection/${user.user_id}` : "/collection";
    const wishlistUrl = user ? `/wishlist/${user.user_id}` : "/wishlist";

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className="bg-red-600 border-b-2 border-red-700 shadow-md">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo Section */}
                    <div className="flex-shrink-0">
                        <Link to="/" className="flex items-center h-full" onClick={closeMobileMenu}>
                            <img src="/images/mybricklog_logo.png" alt="Logo" className="h-10" />
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button 
                            className="inline-flex items-center justify-center p-2 rounded-full bg-yellow-400 bg-opacity-85 text-white hover:bg-yellow-500 transition-colors border-2 border-red-700 w-12 h-12"
                            onClick={toggleMobileMenu}
                        >
                            <FontAwesomeIcon icon={isMobileMenuOpen ? faXmark : faBars} size="lg" />
                        </button>
                    </div>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link 
                            to="/" 
                            className="px-4 py-2 rounded-md bg-black bg-opacity-25 text-white hover:bg-opacity-35 transition-colors flex items-center space-x-2"
                            onClick={closeMobileMenu}
                        >
                            <FontAwesomeIcon icon="house" />
                            <span>Home</span>
                        </Link>

                        <Link 
                            to={collectionUrl} 
                            className="px-4 py-2 rounded-md bg-black bg-opacity-25 text-white hover:bg-opacity-35 transition-colors flex items-center space-x-2"
                            onClick={closeMobileMenu}
                        >
                            <FontAwesomeIcon icon="folder-open" />
                            <span>My Collection</span>
                        </Link>

                        <Link 
                            to={wishlistUrl} 
                            className="px-4 py-2 rounded-md bg-black bg-opacity-25 text-white hover:bg-opacity-35 transition-colors flex items-center space-x-2"
                            onClick={closeMobileMenu}
                        >
                            <FontAwesomeIcon icon="heart" />
                            <span>My Wishlist</span>
                        </Link>

                        <Link 
                            to="/themes" 
                            className="px-4 py-2 rounded-md bg-black bg-opacity-25 text-white hover:bg-opacity-35 transition-colors flex items-center space-x-2"
                            onClick={closeMobileMenu}
                        >
                            <FontAwesomeIcon icon="folder-plus" />
                            <span>Add Sets</span>
                        </Link>

                        {user ? (
                            <>
                                <Link 
                                    to="/profile" 
                                    className="px-4 py-2 rounded-md bg-black bg-opacity-25 text-white hover:bg-opacity-35 transition-colors flex items-center space-x-2"
                                    onClick={closeMobileMenu}
                                >
                                    <FontAwesomeIcon icon="user" />
                                    <span>{user.username}</span>
                                </Link>
                                <Link 
                                    to="/" 
                                    onClick={handleLogout} 
                                    className="px-4 py-2 rounded-md bg-black bg-opacity-25 text-white hover:bg-opacity-35 transition-colors flex items-center space-x-2"
                                >
                                    <FontAwesomeIcon icon="right-from-bracket" />
                                    <span>Sign Out</span>
                                </Link>
                            </>
                        ) : (
                            <Link 
                                to="/login" 
                                className="px-4 py-2 rounded-md bg-black bg-opacity-25 text-white hover:bg-opacity-35 transition-colors flex items-center space-x-2"
                                onClick={closeMobileMenu}
                            >
                                <FontAwesomeIcon icon="user" />
                                <span>Sign In</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
                <div className="bg-red-700 border-t-2 border-red-800">
                    <Link 
                        to="/" 
                        className="block py-4 px-6 text-white border-b border-red-600 flex items-center justify-end space-x-2"
                        onClick={closeMobileMenu}
                    >
                        <span>Home</span>
                        <FontAwesomeIcon icon="house" />
                    </Link>

                    <Link 
                        to={collectionUrl} 
                        className="block py-4 px-6 text-white border-b border-red-600 flex items-center justify-end space-x-2"
                        onClick={closeMobileMenu}
                    >
                        <span>My Collection</span>
                        <FontAwesomeIcon icon="folder-open" />
                    </Link>

                    <Link 
                        to={wishlistUrl} 
                        className="block py-4 px-6 text-white border-b border-red-600 flex items-center justify-end space-x-2"
                        onClick={closeMobileMenu}
                    >
                        <span>My Wishlist</span>
                        <FontAwesomeIcon icon="heart" />
                    </Link>

                    <Link 
                        to="/themes" 
                        className="block py-4 px-6 text-white border-b border-red-600 flex items-center justify-end space-x-2"
                        onClick={closeMobileMenu}
                    >
                        <span>Add Sets</span>
                        <FontAwesomeIcon icon="folder-plus" />
                    </Link>

                    {user ? (
                        <>
                            <Link 
                                to="/profile" 
                                className="block py-4 px-6 text-white border-b border-red-600 flex items-center justify-end space-x-2"
                                onClick={closeMobileMenu}
                            >
                                <span>{user.username}</span>
                                <FontAwesomeIcon icon="user" />
                            </Link>
                            <Link 
                                to="/" 
                                onClick={handleLogout} 
                                className="block py-4 px-6 text-white flex items-center justify-end space-x-2"
                            >
                                <span>Sign Out</span>
                                <FontAwesomeIcon icon="right-from-bracket" />
                            </Link>
                        </>
                    ) : (
                        <Link 
                            to="/login" 
                            className="block py-4 px-6 text-white flex items-center justify-end space-x-2"
                            onClick={closeMobileMenu}
                        >
                            <span>Sign In</span>
                            <FontAwesomeIcon icon="user" />
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Header;