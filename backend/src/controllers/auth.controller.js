import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrisma } from '../config/prisma.js';
import { getRolesFromUser } from '../utils/rols.js';

export const login = async (req, res) => {
    try {
        const { email, password, dni } = req.body;

        if (!password || (!email && !dni)) {
            return res.status(400).json({ message: 'Debe ingresar email/DNI y contraseña' });
        }

        const prisma = getPrisma();

        const user = await prisma.user.findFirst({
            where: email ? { email } : { dni },
            include: {
                directorProfile: true,
                teacherProfile: true,
                preceptorProfile: true,
                studentProfile: true,
            },
        });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const roles = getRolesFromUser(user);

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                institutionId: user.institutionId,
                roles,
            },
            process.env.JWT_SECRET || 'estaesmipalabrasecreta',
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roles,
                directorProfile: user.directorProfile,
                teacherProfile: user.teacherProfile,
                preceptorProfile: user.preceptorProfile,
                studentProfile: user.studentProfile,
            },
        });
    } catch (error) {
        console.error('❌ Error en el login:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const registerStudent = async (req, res) => {
    return res.status(501).json({ message: 'No implementado' });
};

export const registerTeacher = async (req, res) => {
    return res.status(501).json({ message: 'No implementado' });
};