
import { createContext, useState } from 'react';

export const AuthContext = createContext(null);

const readStoredUser = () => {
    try {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(readStoredUser);

    const [token, setToken] = useState(
        () => localStorage.getItem('token') || null
    );

    const loginContext = (userData, tokenData) => {
        setUser(userData);
        setToken(tokenData);

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', tokenData);
    };

    const logoutContext = () => {
        setUser(null);
        setToken(null);

        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loginContext,
                logoutContext,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
