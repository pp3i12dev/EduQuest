
import {
    createContext,
    useCallback,
    useMemo,
    useState,
} from 'react';

export const AuthContext = createContext(null);

const readStoredUser = () => {
    try {
        const savedUser = localStorage.getItem('user');

        return savedUser
            ? JSON.parse(savedUser)
            : null;
    } catch {
        return null;
    }
};

const readStoredToken = () => {
    try {
        return localStorage.getItem('token') || null;
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(readStoredUser);

    const [token, setToken] = useState(readStoredToken);

    const loginContext = useCallback((userData, tokenData) => {
        setUser(userData);
        setToken(tokenData);

        localStorage.setItem(
            'user',
            JSON.stringify(userData)
        );

        localStorage.setItem('token', tokenData);
    }, []);

    /**
     * Actualiza los datos del usuario autenticado.
     *
     * Se utiliza después de guardar cambios
     * en Mi perfil.
     *
     * Conserva los campos existentes de sesión,
     * como roles e institución, cuando la respuesta
     * del backend no los incluye.
     */
    const updateUserContext = useCallback((updatedData) => {
        if (!updatedData || typeof updatedData !== 'object') {
            return;
        }

        setUser(currentUser => {
            if (!currentUser) {
                return currentUser;
            }

            // Nunca permitir que una actualización del perfil
            // reemplace la identidad o los permisos de sesión.
            const {
                id,
                roles,
                isSuperAdmin,
                institutionId,
                isActive,
                token: ignoredToken,
                password,
                passwordHash,
                ...safeUpdatedData
            } = updatedData;

            const updatedUser = {
                ...currentUser,
                ...safeUpdatedData,
            };

            localStorage.setItem(
                'user',
                JSON.stringify(updatedUser)
            );

            return updatedUser;
        });
    }, []);

    /**
     * Reemplaza los datos de sesión cuando
     * se obtiene una versión completa y confiable
     * del usuario desde el backend.
     */
    const refreshUserContext = useCallback((userData) => {
        if (!userData || typeof userData !== 'object') {
            return;
        }

        const {
            password,
            passwordHash,
            ...safeUserData
        } = userData;

        setUser(safeUserData);

        localStorage.setItem(
            'user',
            JSON.stringify(safeUserData)
        );
    }, []);

    const logoutContext = useCallback(() => {
        setUser(null);
        setToken(null);

        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }, []);

    const contextValue = useMemo(() => ({
        user,
        token,
        loginContext,
        logoutContext,
        updateUserContext,
        refreshUserContext,
    }), [
        user,
        token,
        loginContext,
        logoutContext,
        updateUserContext,
        refreshUserContext,
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
