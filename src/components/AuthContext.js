import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const sessionCheckRef = useRef(null);
    const lastSessionCheckRef = useRef(0);

    // Memoized session check function to prevent unnecessary re-renders
    const checkSession = useCallback(async (forceCheck = false) => {
        const now = Date.now();
        // Only check session if forced or if more than 5 minutes have passed
        if (!forceCheck && (now - lastSessionCheckRef.current) < 5 * 60 * 1000) {
            return;
        }
        
        lastSessionCheckRef.current = now;
        
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
                    // Only update if there's actually a change to prevent re-renders
                    const updatedUser = { ...storedUser, is_admin: data.is_admin || false };
                    const hasChanged = JSON.stringify(updatedUser) !== JSON.stringify(storedUser);
                    if (hasChanged) {
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    } else {
                        // Set user if it's not already set (initial load)
                        setUser(prev => prev ? prev : updatedUser);
                    }
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
            setUser(null);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // Initial session check
        checkSession(true);
        
        // Set up interval for background session checks (won't cause re-renders unless data changes)
        const interval = setInterval(() => checkSession(false), 5 * 60 * 1000);
        sessionCheckRef.current = interval;

        return () => {
            if (sessionCheckRef.current) {
                clearInterval(sessionCheckRef.current);
            }
        };
    }, [checkSession]);

    // Memoized login function
    const login = useCallback(async (username, password) => {
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
    }, []);

    // Memoized register function
    const register = useCallback(async (username, email, password, recaptchaToken) => {
        try {
            console.log('Attempting registration with:', { username, email });
            console.log('API URL:', process.env.REACT_APP_API_URL);
            
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

            console.log('Registration response status:', response.status);
            console.log('Registration response headers:', response.headers);
    
            if (!response.ok) {
                console.error('Registration request failed with status:', response.status);
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                return {
                    success: false,
                    message: `Registration failed: ${response.status} ${response.statusText}`
                };
            }

            const data = await response.json();
            console.log('Registration response data:', data);
            return data;
        } catch (error) {
            console.error('Registration error details:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            return { 
                success: false, 
                message: `Registration error: ${error.message}. Please check the console for more details.`
            };
        }
    }, []);

    // Memoized logout function
    const logout = useCallback(async () => {
        await fetch(`${process.env.REACT_APP_API_URL}/logout.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    // Memoized admin check function
    const checkAdminStatus = useCallback(async () => {
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
    }, [user]);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        user,
        isLoading,
        login,
        register,
        logout,
        checkAdminStatus
    }), [user, isLoading, login, register, logout, checkAdminStatus]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
