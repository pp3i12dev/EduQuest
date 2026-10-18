
import { earlyNoticeService as service } from '../services/earlyNotice.service.js';

/**
 * Manejo centralizado de errores.
 */
const handleError = (res, error) => {
    console.error('[EarlyNotice]', error);

    const status = Number.isInteger(error.status)
        ? error.status
        : 500;

    return res.status(status).json({
        message:
            status === 500
                ? 'Error interno al procesar el aviso'
                : error.message,
    });
};

/**
 * Ejecuta operaciones asíncronas del servicio
 * y devuelve la respuesta HTTP correspondiente.
 */
const execute = (res, callback, successStatus = 200) => {
    Promise.resolve()
        .then(callback)
        .then((result) => {
            return res.status(successStatus).json(result);
        })
        .catch((error) => {
            return handleError(res, error);
        });
};

export const earlyNoticeController = {
    /**
     * GET /api/early-notices/options
     *
     * Devuelve las instituciones, cursos, materias,
     * asignaciones docentes y horarios disponibles
     * para crear avisos.
     *
     * El servicio determina qué información puede
     * consultar cada usuario según su rol.
     */
    getCreationOptions(req, res) {
        execute(res, () =>
            service.getCreationOptions(req.user)
        );
    },

    /**
     * GET /api/early-notices
     *
     * Lista avisos según institución, permisos
     * y filtros recibidos.
     */
    list(req, res) {
        execute(res, () =>
            service.list(req.user, req.query)
        );
    },

    /**
     * GET /api/early-notices/:id
     *
     * Consulta un aviso concreto.
     */
    getById(req, res) {
        execute(res, () =>
            service.getById(req.user, req.params.id)
        );
    },

    /**
     * POST /api/early-notices
     *
     * Crea un aviso temprano.
     */
    create(req, res) {
        execute(
            res,
            () => service.create(req.user, req.body),
            201
        );
    },

    /**
     * PATCH /api/early-notices/:id
     *
     * Modifica un aviso existente.
     */
    update(req, res) {
        execute(res, () =>
            service.update(
                req.user,
                req.params.id,
                req.body
            )
        );
    },

    /**
     * PATCH /api/early-notices/:id/confirm
     *
     * Confirma un aviso pendiente.
     */
    confirm(req, res) {
        execute(res, () =>
            service.confirm(
                req.user,
                req.params.id
            )
        );
    },

    /**
     * PATCH /api/early-notices/:id/reject
     *
     * Rechaza un aviso pendiente.
     */
    reject(req, res) {
        execute(res, () =>
            service.reject(
                req.user,
                req.params.id,
                req.body
            )
        );
    },

    /**
     * PATCH /api/early-notices/:id/deactivate
     *
     * Desactiva un aviso sin eliminarlo.
     */
    deactivate(req, res) {
        execute(res, () =>
            service.deactivate(
                req.user,
                req.params.id
            )
        );
    },
};
