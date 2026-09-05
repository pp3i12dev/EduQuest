import jwt from 'jsonwebtoken';
import { canAnyRole } from '../config/permissions.js';

const JWT_SECRET = process.env.JWT_SECRET || 'estaesmipalabrasecreta';

export function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no provisto' });
    }

    try {
        const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

export function requirePermission(action) {
    return (req, res, next) => {
        if (!canAnyRole(req.user?.roles ?? [], action)) {
            return res.status(403).json({ message: 'No tenés permisos para esta acción' });
        }
        next();
    };
}