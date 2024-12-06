import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

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
                        setUser(storedUser);
                    } else {
                        console.log("Session is invalid. Removing stored user.");
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                } catch (error) {
                    console.error("Error checking session:", error);
                }
            } else {
                console.log("No stored user found.");
            }
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
            const user = { user_id: data.user_id, username: data.username };
            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));
        }
        return data;
    };

    const register = async (username, email, password) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/register.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });
    
            const data = await response.json();
            return data;
        } catch (error) {
            return { success: false, message: 'An error occurred during registration. Please try again.' };
        }
    };

    const logout = async () => {
        await fetch(`${process.env.REACT_APP_API_URL}/logout.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
