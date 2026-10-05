import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherSubjectService } from '../services/teacherSubject.service';

export function useTeacherSubjectDetail(id) {
    return useQuery({
        queryKey: ['teacher-subject', id],
        queryFn: () => teacherSubjectService.getDetail(id),
        enabled: Boolean(id),
    });
}

export function useAssignableActivities(id) {
    return useQuery({
        queryKey: ['assignable-activities', id],
        queryFn: () => teacherSubjectService.listAssignable(id),
        enabled: Boolean(id),
    });
}

export function useSaveTeacherSubject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, changes, files }) => teacherSubjectService.save(id, { changes, files }),
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['teacher-subject', id] });
            queryClient.invalidateQueries({ queryKey: ['assignable-activities', id] });
        },
    });
}