import { getPrisma } from '../config/prisma.js';
const prisma = getPrisma();

export const deviceController = {
    async registerDevice(req, res) {
        try {
            const { userId, token, platform } = req.body;

            if (!userId || !token) {
                return res.status(400).json({ message: 'userId y token son obligatorios' });
            }

            // Verificamos si el dispositivo ya existe para actualizarlo, o lo creamos
            const existingDevice = await prisma.userDevice.findFirst({
                where: { token: token }
            });

            if (existingDevice) {
                const updated = await prisma.userDevice.update({
                    where: { id: existingDevice.id },
                    data: { userId: Number(userId), platform: platform || 'flutter_android' }
                });
                return res.status(200).json({ message: 'Dispositivo actualizado con éxito', device: updated });
            }

            const newDevice = await prisma.userDevice.create({
                data: {
                    userId: Number(userId),
                    token: token,
                    platform: platform || 'flutter_android'
                }
            });

            return res.status(201).json({ message: 'Dispositivo registrado con éxito', device: newDevice });
        } catch (error) {
            console.error('Error al registrar dispositivo FCM:', error);
            return res.status(500).json({ message: 'Error interno del servidor al registrar dispositivo' });
        }
    }
};