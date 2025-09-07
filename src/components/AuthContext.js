import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            if (storedUser) {
                console.log("Stored user found:", storedUser);
                try {
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/check_session.php`, {
                        method: 'GET',
                        credentials: 'include',
                    });
                    const data = await response.json();
                    if (data.valid) {
                        console.log("Session is valid. User ID:", data.user_id);
                        // Update stored user with latest admin status from server
                        const updatedUser = { ...storedUser, is_admin: data.is_admin || false };
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    } else {
                        console.log("Session is invalid. Removing stored user.");
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                } catch (error) {
                    console.error("Error checking session:", error);
                    setUser(null);
                }
            } else {
                console.log("No stored user found.");
            }
            setIsLoading(false);
        };

        checkSession();
        const interval = setInterval(checkSession, 5 * 60 * 1000); // Check session every 5 minutes

        return () => clearInterval(interval);
    }, []);

    const login = async (username, password) => {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
        });
        const data = await response.json();
        if (data.success) {
            const user = { 
                user_id: data.user_id, 
                username: data.username,
                is_admin: data.is_admin || false
            };
            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));
        }
        return data;
    };

    const register = async (username, email, password, recaptchaToken) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/register.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username, 
                    email, 
                    password,
                    recaptcha_token: recaptchaToken 
                }),
            });
    
            const data = await response.json();
            return data;
        } catch (error) {
            return { 
                success: false, 
                message: 'An error occurred during registration. Please try again.' 
            };
        }
    };

    const logout = async () => {
        await fetch(`${process.env.REACT_APP_API_URL}/logout.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        localStorage.removeItem('user');
        setUser(null);
    };

    const checkAdminStatus = async () => {
        if (!user) return false;
        
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/check_admin.php`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await response.json();
            return data.is_admin || false;
        } catch (error) {
            console.error("Error checking admin status:", error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, checkAdminStatus }}>
            {children}
        </AuthContext.Provider>
    );
};
