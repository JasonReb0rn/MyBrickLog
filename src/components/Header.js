// src/components/Header.js - Updated
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark, faSearch } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/');
        setIsMobileMenuOpen(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Navigate to the search results page with the query
            navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
            setShowSearch(false);
            setIsMobileMenuOpen(false); // Close mobile menu if open
        }
    };

    const collectionUrl = user ? `/collection/${user.user_id}` : "/collection";
    const wishlistUrl = user ? `/wishlist/${user.user_id}` : "/wishlist";

    const isActive = (path) => {
        return location.pathname === path ? 'bg-red-700' : '';
    };

    return (
        <header className="bg-red-600 shadow-md">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo Section */}
                    <div className="flex-shrink-0">
                        <Link to="/" className="flex items-center">
                            <img 
                                src="/images/mybricklog_logo.png" 
                                alt="MyBrickLog" 
                                className="h-8 md:h-10" 
                            />
                        </Link>
                    </div>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center space-x-1">
                        <Link 
                            to="/" 
                            className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors ${isActive('/')}`}
                        >
                            <FontAwesomeIcon icon="house" className="mr-2" />
                            Home
                        </Link>

                        <Link 
                            to={collectionUrl} 
                            className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors ${isActive(collectionUrl)}`}
                        >
                            <FontAwesomeIcon icon="folder-open" className="mr-2" />
                            My Collection
                        </Link>

                        <Link 
                            to={wishlistUrl} 
                            className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors ${isActive(wishlistUrl)}`}
                        >
                            <FontAwesomeIcon icon="heart" className="mr-2" />
                            My Wishlist
                        </Link>

                        <Link 
                            to="/themes" 
                            className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors ${isActive('/themes')}`}
                        >
                            <FontAwesomeIcon icon="folder-plus" className="mr-2" />
                            Add Sets
                        </Link>

                        <Link 
                            to="/price-tool" 
                            className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors ${isActive('/price-tool')}`}
                        >
                            <FontAwesomeIcon icon="dollar-sign" className="mr-2" />
                            Price Tool
                        </Link>

                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors"
                        >
                            <FontAwesomeIcon icon={faSearch} className="mr-2" />
                            Search
                        </button>
                    </div>

                    {/* User Authentication Section */}
                    <div className="hidden md:flex items-center">
                        {user ? (
                            <div className="flex items-center space-x-2">
                                <Link 
                                    to="/profile" 
                                    className="px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors"
                                >
                                    <FontAwesomeIcon icon="user" className="mr-2" />
                                    {user.username}
                                </Link>
                                <button 
                                    onClick={handleLogout}
                                    className="px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-red-700 hover:text-white transition-colors"
                                >
                                    <FontAwesomeIcon icon="right-from-bracket" className="mr-2" />
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <Link 
                                to="/login" 
                                className="px-3 py-2 rounded-md text-sm font-medium bg-yellow-400 text-red-700 hover:bg-yellow-300 transition-colors"
                            >
                                <FontAwesomeIcon icon="user" className="mr-2" />
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button 
                            className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-red-700 hover:text-white transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <FontAwesomeIcon icon={isMobileMenuOpen ? faXmark : faBars} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Bar - Appears below the header */}
            {showSearch && (
                <div className="bg-red-700 py-3 px-4 shadow-md">
                    <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex">
                        <input
                            type="text"
                            placeholder="Search sets, themes, or set numbers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-2 px-4 rounded-l-md focus:outline-none border-0"
                        />
                        <button 
                            type="submit"
                            className="bg-yellow-400 text-red-700 px-4 rounded-r-md hover:bg-yellow-300 transition-colors"
                        >
                            <FontAwesomeIcon icon={faSearch} />
                        </button>
                    </form>
                </div>
            )}

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-red-700 shadow-lg">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        <Link 
                            to="/" 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="house" className="mr-3 text-yellow-400" />
                            Home
                        </Link>

                        <Link 
                            to={collectionUrl} 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="folder-open" className="mr-3 text-yellow-400" />
                            My Collection
                        </Link>

                        <Link 
                            to={wishlistUrl} 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="heart" className="mr-3 text-yellow-400" />
                            My Wishlist
                        </Link>

                        <Link 
                            to="/themes" 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="folder-plus" className="mr-3 text-yellow-400" />
                            Add Sets
                        </Link>

                        <Link 
                            to="/price-tool" 
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon="dollar-sign" className="mr-3 text-yellow-400" />
                            Price Tool
                        </Link>

                        <button
                            onClick={() => {
                                setShowSearch(!showSearch);
                                setIsMobileMenuOpen(false);
                            }}
                            className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                        >
                            <FontAwesomeIcon icon={faSearch} className="mr-3 text-yellow-400" />
                            Search
                        </button>

                        {user ? (
                            <>
                                <Link 
                                    to="/profile" 
                                    className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <FontAwesomeIcon icon="user" className="mr-3 text-yellow-400" />
                                    {user.username}
                                </Link>
                                <button 
                                    onClick={handleLogout}
                                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-600 hover:text-white"
                                >
                                    <FontAwesomeIcon icon="right-from-bracket" className="mr-3 text-yellow-400" />
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <Link 
                                to="/login" 
                                className="block px-3 py-2 rounded-md text-base font-medium text-white bg-red-600 hover:bg-red-500 hover:text-white"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <FontAwesomeIcon icon="user" className="mr-3 text-yellow-400" />
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;