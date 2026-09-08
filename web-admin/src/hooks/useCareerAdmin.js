import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { careerAdminService } from '../services/careerAdmin.service';

export function useCareersAdmin() {
    return useQuery({ queryKey: ['careers-admin'], queryFn: careerAdminService.list });
}

export function useCreateCareer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: careerAdminService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['careers-admin'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}

export function useUpdateCareer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }) => careerAdminService.update(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['careers-admin'] }),
    });
}

export function useDeleteCareer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: careerAdminService.remove,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['careers-admin'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}