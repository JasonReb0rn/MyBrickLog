// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import Collection from './components/Collection';
import Wishlist from './components/Wishlist';
import Login from './components/Login';
import Register from './components/Register';
import Verify from './components/Verify';
import Profile from './components/Profile';
import Themes from './components/Themes';
import SubThemes from './components/SubThemes';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { AuthProvider } from './components/AuthContext';
import 'react-tooltip/dist/react-tooltip.css';
import './App.css';

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <div className="app-container">
                    <Header />
                        <div className="main-content">
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/collection/:userId" element={<Collection />} />
                                <Route path="/collection" element={<Collection />} />
                                <Route path="/wishlist/:userId" element={<Wishlist />} />
                                <Route path="/wishlist" element={<Wishlist />} />
                                <Route path="/themes" element={<Themes />} />
                                <Route path="/themes/:themeId" element={<SubThemes />} />
                                <Route path="/verify/:verificationToken" element={<Verify />} />
                                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                                <Route path="/terms-of-service" element={<TermsOfService />} />
                            </Routes>
                        </div>
                    <Footer />
                </div>
            </Router>
        </AuthProvider>
    );
};

export default App;
