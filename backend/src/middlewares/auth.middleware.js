
import { verifyToken } from '../utils/jwt.js';
import { getPrisma } from '../config/prisma.js';
import { getRolesFromUser } from '../utils/rols.js';
import { canAnyRole } from '../config/permissions.js';

export async function authenticate(req, res, next) {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Token no provisto',
        });
    }

    const token = header.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            message: 'Token no provisto',
        });
    }

    let payload;

    try {
        payload = verifyToken(token);
    } catch {
        return res.status(401).json({
            message: 'Token inválido o expirado',
        });
    }

    const userId = Number(payload.id ?? payload.sub);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        return res.status(401).json({
            message: 'Token inválido',
        });
    }

    try {
        const prisma = getPrisma();

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                directorProfile: true,
                preceptorProfile: true,
                teacherProfile: true,
                studentProfile: true,
            },
        });

        if (!user) {
            return res.status(401).json({
                message: 'El usuario ya no existe',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                message: 'Tu cuenta está desactivada',
            });
        }

        const isSuperAdmin = user.isSuperAdmin === true;

        const profileRoles = getRolesFromUser(user);

        const roles = isSuperAdmin
            ? [...new Set(['SUPER_ADMIN', ...profileRoles])]
            : profileRoles;

        // Nunca confiar en los permisos o la institución
        // que venían guardados en el JWT.
        req.user = {
            id: user.id,
            email: user.email,
            institutionId: user.institutionId,
            isSuperAdmin,
            roles,
        };

        next();
    } catch (error) {
        next(error);
    }
}

export function requirePermission(action) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Usuario no autenticado',
            });
        }

        if (!canAnyRole(req.user.roles ?? [], action)) {
            return res.status(403).json({
                message: 'No tenés permisos para esta acción',
            });
        }

        next();
    };
}
