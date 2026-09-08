export function handleServiceError(error, res, fallbackMessage = 'Error interno del servidor') {
    if (error.status) {
        return res.status(error.status).json({ message: error.message });
    }
    console.error('❌', error);
    return res.status(500).json({ message: fallbackMessage });
}