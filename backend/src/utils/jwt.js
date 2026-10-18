
import jwt from 'jsonwebtoken';

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret || !secret.trim()) {
        throw new Error(
            'JWT_SECRET no está configurada. Revisá el archivo .env del backend.'
        );
    }

    return secret;
}

// Genera un token válido durante 8 horas.
export const generateToken = (payload) => {
    return jwt.sign(payload, getJwtSecret(), {
        expiresIn: '8h',
    });
};

// Verifica la firma y la expiración del token.
export const verifyToken = (token) => {
    return jwt.verify(token, getJwtSecret());
};
