import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invitationsService } from '../services/invitations.service';

export function useInvitations() {
    return useQuery({
        queryKey: ['invitations'],
        queryFn: invitationsService.list,
    });
}

export function useCreateInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: invitationsService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}

export function useCancelInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: invitationsService.cancel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}