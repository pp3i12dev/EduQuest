import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectAdminService } from '../services/subjectAdmin.service';

export function useSubjectsAdmin() {
    return useQuery({ queryKey: ['subjects-admin'], queryFn: subjectAdminService.list });
}

export function useCreateSubject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: subjectAdminService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects-admin'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}

export function useUpdateSubject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }) => subjectAdminService.update(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects-admin'] }),
    });
}

export function useDeleteSubject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: subjectAdminService.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects-admin'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}