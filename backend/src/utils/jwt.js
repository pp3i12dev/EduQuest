import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_eduquest';

// Genera el token con una validez de 8 horas
export const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
};

// Desencripta y valida que el token no haya sido alterado
export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};