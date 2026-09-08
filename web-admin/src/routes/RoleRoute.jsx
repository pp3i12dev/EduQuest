import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { hasAny } from '../config/permissions';

export default function RoleRoute({ action, children }) {
    const { user } = useContext(AuthContext);

    if (!hasAny(user?.roles, action)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}