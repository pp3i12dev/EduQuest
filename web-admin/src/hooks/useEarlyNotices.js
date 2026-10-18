
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import {
    earlyNoticeService,
} from '../services/earlyNotice.service';

/**
 * Obtiene los Avisos Tempranos.
 *
 * Permite aplicar filtros de:
 * - Estado
 * - Curso
 * - Asignación docente
 * - Fecha
 * - Institución (SUPER_ADMIN)
 * - Paginación
 *
 * Actualiza los datos automáticamente
 * cada 30 segundos.
 */
export function useEarlyNotices(token, filters = {}) {
    return useQuery({
        queryKey: [
            'early-notices',
            token,
            filters,
        ],

        queryFn: () =>
            earlyNoticeService.list(
                token,
                filters
            ),

        enabled: Boolean(token),

        refetchInterval: 30_000,

        refetchOnWindowFocus: true,
    });
}

/**
 * Obtiene las opciones para crear Avisos Tempranos.
 *
 * El backend devuelve únicamente las opciones
 * que el usuario tiene permitido utilizar.
 *
 * Docente:
 *   Sus asignaciones docentes vigentes.
 *
 * Preceptor / Director:
 *   Asignaciones de su institución.
 *
 * SUPER_ADMIN:
 *   Asignaciones de todas las instituciones.
 *
 * Estudiante:
 *   El backend rechaza esta consulta.
 *
 * La consulta se ejecuta cuando el componente
 * que utiliza este hook está montado y habilitado.
 */
export function useEarlyNoticeCreationOptions(
    token,
    enabled = true
) {
    return useQuery({
        queryKey: [
            'early-notices',
            'creation-options',
            token,
        ],

        queryFn: () =>
            earlyNoticeService.getCreationOptions(
                token
            ),

        enabled:
            Boolean(token) &&
            Boolean(enabled),

        staleTime: 60_000,

        refetchOnWindowFocus: true,

        retry: (failureCount, error) => {
            const message =
                error?.message || '';

            if (
                message.includes('403') ||
                message.includes('401') ||
                message.includes('permisos') ||
                message.includes('institución asignada')
            ) {
                return false;
            }

            return failureCount < 2;
        },
    });
}

/**
 * Acciones para crear y modificar avisos.
 *
 * Después de una operación exitosa,
 * invalida las consultas relacionadas
 * para actualizar la interfaz.
 */
export function useEarlyNoticeActions(token) {
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({
            queryKey: ['early-notices'],
        });

    /**
     * Crear aviso.
     */
    const create = useMutation({
        mutationFn: (data) =>
            earlyNoticeService.create(
                token,
                data
            ),

        onSuccess: invalidate,
    });

    /**
     * Editar aviso.
     */
    const update = useMutation({
        mutationFn: ({ id, data }) =>
            earlyNoticeService.update(
                token,
                id,
                data
            ),

        onSuccess: invalidate,
    });

    /**
     * Confirmar aviso pendiente.
     */
    const confirm = useMutation({
        mutationFn: (id) =>
            earlyNoticeService.confirm(
                token,
                id
            ),

        onSuccess: invalidate,
    });

    /**
     * Rechazar aviso pendiente.
     */
    const reject = useMutation({
        mutationFn: ({
            id,
            rejectionReason,
        }) =>
            earlyNoticeService.reject(
                token,
                id,
                rejectionReason
            ),

        onSuccess: invalidate,
    });

    /**
     * Desactivar aviso.
     */
    const deactivate = useMutation({
        mutationFn: (id) =>
            earlyNoticeService.deactivate(
                token,
                id
            ),

        onSuccess: invalidate,
    });

    return {
        create,
        update,
        confirm,
        reject,
        deactivate,
    };
}
