import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionService } from '../services/institution.service';

export function useMyInstitution() {
    return useQuery({
        queryKey: ['institution'],
        queryFn: institutionService.getMine,
    });
}

export function useUpdateInstitution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: institutionService.update,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institution'] }),
    });
}