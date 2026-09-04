import bcrypt from 'bcryptjs';

// Convierte la contraseña en un hash seguro e irreversible
export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Compara una clave ingresada con el hash guardado en la BD
export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};