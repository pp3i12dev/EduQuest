
import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';

import { institutionService } from '../services/institution.service';

export function useMyInstitution(enabled = true) {
    return useQuery({
        queryKey: ['institution', 'mine'],
        queryFn: institutionService.getMine,
        enabled,
    });
}

export function useUpdateInstitution() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: institutionService.update,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['institution'],
            });

            queryClient.invalidateQueries({
                queryKey: ['institutions'],
            });
        },
    });
}

export function useInstitutions(enabled = true) {
    return useQuery({
        queryKey: ['institutions'],
        queryFn: institutionService.list,
        enabled,
    });
}

export function useInstitution(id, enabled = true) {
    return useQuery({
        queryKey: ['institution', id],
        queryFn: () => institutionService.getById(id),
        enabled: enabled && Boolean(id),
    });
}

export function useCreateInstitution() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: institutionService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['institutions'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}

export function useUpdateInstitutionAdmin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...payload }) =>
            institutionService.updateAdmin(id, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['institutions'],
            });

            queryClient.invalidateQueries({
                queryKey: ['institution', variables.id],
            });

            queryClient.invalidateQueries({
                queryKey: ['institution', 'mine'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}

export function useToggleInstitutionActive() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, isActive }) =>
            institutionService.toggleStatus(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['institutions'],
            });

            queryClient.invalidateQueries({
                queryKey: ['institution'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}

export function useDeleteInstitution() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: institutionService.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['institutions'],
            });

            queryClient.invalidateQueries({
                queryKey: ['institution'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}
