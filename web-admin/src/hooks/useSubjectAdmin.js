
import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';

import { subjectAdminService } from '../services/subjectAdmin.service';

function invalidateSubjectData(queryClient) {
    queryClient.invalidateQueries({
        queryKey: ['subjects-admin'],
    });

    queryClient.invalidateQueries({
        queryKey: ['dashboard-summary'],
    });

    queryClient.invalidateQueries({
        queryKey: ['teacher-subjects'],
    });

    queryClient.invalidateQueries({
        queryKey: ['subject-schedules'],
    });

    queryClient.invalidateQueries({
        queryKey: ['early-notices'],
    });
}

export function useSubjectsAdmin() {
    return useQuery({
        queryKey: ['subjects-admin'],
        queryFn: subjectAdminService.list,
    });
}

export function useCreateSubject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: subjectAdminService.create,
        onSuccess: () => {
            invalidateSubjectData(queryClient);
        },
    });
}

export function useUpdateSubject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...payload }) =>
            subjectAdminService.update(id, payload),
        onSuccess: () => {
            invalidateSubjectData(queryClient);
        },
    });
}

export function useDeleteSubject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: subjectAdminService.remove,
        onSuccess: () => {
            invalidateSubjectData(queryClient);
        },
    });
}
