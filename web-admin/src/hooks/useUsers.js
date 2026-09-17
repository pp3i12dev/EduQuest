import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services/users.service';

export function useUsersByRole(role) {
    return useQuery({
        queryKey: ['users', role],
        queryFn: () => usersService.list(role),
    });
}

export function useCreateUser(role) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => usersService.create(role, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', role] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}

export function useUpdateUser(role) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }) => usersService.update(role, id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', role] }),
    });
}

export function useToggleUserActive(role) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isActive }) => usersService.toggleStatus(role, id, isActive),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', role] }),
    });
}

export function useDeleteUser(role) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => usersService.remove(role, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', role] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}

export function useUserRoles(id) {
    return useQuery({
        queryKey: ['user-roles', id],
        queryFn: () => usersService.getRoles(id),
        enabled: Boolean(id),
    });
}

export function useUpdateUserRoles() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, roles }) => usersService.updateRoles(id, roles),
        onSuccess: (_, { }) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user-roles'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}