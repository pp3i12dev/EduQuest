import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseAdminService } from '../services/courseAdmin.service';

export function useCoursesAdmin() {
    return useQuery({ queryKey: ['courses-admin'], queryFn: courseAdminService.list });
}

export function useCreateCourse() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: courseAdminService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses-admin'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}

export function useUpdateCourse() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }) => courseAdminService.update(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses-admin'] }),
    });
}

export function useDeleteCourse() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: courseAdminService.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses-admin'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}