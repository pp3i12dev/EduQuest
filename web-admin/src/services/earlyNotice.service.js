
const BASE_URL = (
    import.meta.env.VITE_API_URL ||
    'http://localhost:3000/api'
).replace(/\/$/, '');

/**
 * Función centralizada para realizar solicitudes
 * al backend de Avisos Tempranos.
 *
 * Incluye:
 * - Autenticación mediante JWT.
 * - Manejo de errores HTTP.
 * - Lectura de respuestas JSON.
 */
async function request(path, token, options = {}) {
    if (!token) {
        throw new Error('No hay una sesión activa.');
    }

    const response = await fetch(
        `${BASE_URL}${path}`,
        {
            ...options,

            headers: {
                'Content-Type': 'application/json',

                Authorization: `Bearer ${token}`,

                ...options.headers,
            },
        }
    );

    const result = await response
        .json()
        .catch(() => null);

    if (!response.ok) {
        throw new Error(
            result?.message ||
            `Error HTTP ${response.status}`
        );
    }

    return result;
}

/**
 * Servicio de Avisos Tempranos.
 */
export const earlyNoticeService = {
    /**
     * GET /api/early-notices/options
     *
     * Obtiene las opciones autorizadas para
     * generar avisos tempranos.
     *
     * Respuesta esperada:
     *
     * {
     *     institutions: [],
     *     courses: [],
     *     subjects: [],
     *     assignments: [],
     *     schedules: []
     * }
     *
     * El backend filtra las opciones según
     * el rol y la institución del usuario.
     */
    getCreationOptions(token) {
        return request(
            '/early-notices/options',
            token
        );
    },

    /**
     * GET /api/early-notices
     *
     * Lista los avisos según los filtros
     * recibidos.
     */
    list(token, params = {}) {
        const query = new URLSearchParams();

        Object.entries(params).forEach(
            ([key, value]) => {
                if (
                    value !== '' &&
                    value !== undefined &&
                    value !== null
                ) {
                    query.set(
                        key,
                        String(value)
                    );
                }
            }
        );

        const suffix = query.toString();

        return request(
            `/early-notices${suffix ? `?${suffix}` : ''
            }`,
            token
        );
    },

    /**
     * GET /api/early-notices/:id
     *
     * Consulta un aviso específico.
     */
    getById(token, id) {
        return request(
            `/early-notices/${id}`,
            token
        );
    },

    deleteHistory(token, id) {
        return request(`/early-notices/${id}/history`, token, { method: 'DELETE' });
    },

    getHistory(token, id) {
        return request(`/early-notices/${id}/history`, token);
    },

    /**
     * POST /api/early-notices
     *
     * Crea un aviso temprano.
     */
    create(token, data) {
        return request(
            '/early-notices',
            token,
            {
                method: 'POST',

                body: JSON.stringify(data),
            }
        );
    },

    createMultiple(token, data) {
        return request('/early-notices/multi', token, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * PATCH /api/early-notices/:id
     *
     * Modifica un aviso existente.
     */
    update(token, id, data) {
        return request(
            `/early-notices/${id}`,
            token,
            {
                method: 'PATCH',

                body: JSON.stringify(data),
            }
        );
    },

    updateMultiple(token, id, data) {
        return request(`/early-notices/${id}/multi`, token, {
            method: 'PATCH', body: JSON.stringify(data),
        });
    },

    /**
     * PATCH /api/early-notices/:id/confirm
     *
     * Confirma un aviso pendiente.
     */
    confirm(token, id) {
        return request(
            `/early-notices/${id}/confirm`,
            token,
            {
                method: 'PATCH',
            }
        );
    },

    /**
     * PATCH /api/early-notices/:id/reject
     *
     * Rechaza un aviso pendiente.
     */
    reject(token, id, rejectionReason) {
        return request(
            `/early-notices/${id}/reject`,
            token,
            {
                method: 'PATCH',

                body: JSON.stringify({
                    rejectionReason,
                }),
            }
        );
    },

    /**
     * PATCH /api/early-notices/:id/deactivate
     *
     * Desactiva un aviso sin eliminarlo
     * de la base de datos.
     */
    deactivate(token, id) {
        return request(
            `/early-notices/${id}/deactivate`,
            token,
            {
                method: 'PATCH',
            }
        );
    },
};
