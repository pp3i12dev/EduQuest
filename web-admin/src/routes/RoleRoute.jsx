
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import { hasAny } from '../config/permissions';

export default function RoleRoute({ action, children }) {
    const { user } = useContext(AuthContext);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const isSuperAdmin =
        user.isSuperAdmin === true ||
        user.roles?.includes('SUPER_ADMIN');

    if (isSuperAdmin) {
        return children;
    }

    const hasPermission = hasAny(user.roles ?? [], action);

    if (!hasPermission) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
