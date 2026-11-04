import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';

import { assignmentsService } from '../services/assignments.service';

export function useAssignmentOptions() {
    return useQuery({
        queryKey: ['assignment-options'],
        queryFn: assignmentsService.options,
    });
}

export function useStudentsForCourse(courseId) {
    return useQuery({
        queryKey: ['assignment-students', courseId],
        queryFn: () => assignmentsService.students(courseId),
        enabled: Number.isSafeInteger(Number(courseId)) && Number(courseId) > 0,
        retry: (failureCount, error) => {
            const status = error?.response?.status;
            return (!status || status >= 500) && failureCount < 2;
        },
        refetchOnWindowFocus: false,
        staleTime: 15_000,
    });
}

export function useAssignStudent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: assignmentsService.assignStudent,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['assignment-students'],
            });

            queryClient.invalidateQueries({
                queryKey: ['assignment-options'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}

export function useRemoveStudent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: assignmentsService.removeStudent,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['assignment-students'],
            });

            queryClient.invalidateQueries({
                queryKey: ['assignment-options'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}

export function useTeachersForCourseSubject(
    courseId,
    subjectId
) {
    return useQuery({
        queryKey: [
            'assignment-teachers',
            courseId,
            subjectId,
        ],
        queryFn: () =>
            assignmentsService.teachers(
                courseId,
                subjectId
            ),
        enabled: Boolean(courseId && subjectId),
    });
}

export function useAssignTeacher() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: assignmentsService.assignTeacher,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: [
                    'assignment-teachers',
                    Number(variables.courseId),
                    Number(variables.subjectId),
                ],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}

export function useRemoveTeacher() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: assignmentsService.removeTeacher,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['assignment-teachers'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}

export function useSchedules(courseId, subjectId) {
    return useQuery({
        queryKey: [
            'assignment-schedules',
            courseId,
            subjectId,
        ],
        queryFn: () =>
            assignmentsService.schedules(
                courseId,
                subjectId
            ),
        enabled: Boolean(courseId && subjectId),
    });
}

export function useCreateSchedule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: assignmentsService.createSchedule,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: [
                    'assignment-schedules',
                    Number(variables.courseId),
                    Number(variables.subjectId),
                ],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}

export function useUpdateSchedule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...payload }) =>
            assignmentsService.updateSchedule(
                id,
                payload
            ),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: [
                    'assignment-schedules',
                    Number(variables.courseId),
                    Number(variables.subjectId),
                ],
            });

            queryClient.invalidateQueries({
                queryKey: ['assignment-schedules'],
            });
        },
    });
}

export function useDeleteSchedule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: assignmentsService.removeSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['assignment-schedules'],
            });

            queryClient.invalidateQueries({
                queryKey: ['dashboard-summary'],
            });
        },
    });
}