import { useQuery } from '@tanstack/react-query';
import { academicService } from '../services/academic.service';

export function useInstitutions() {
    return useQuery({
        queryKey: ['institutions'],
        queryFn: academicService.listInstitutions,
    });
}

export function useCareers(institutionId) {
    return useQuery({
        queryKey: ['careers', institutionId],
        queryFn: () => academicService.listCareers(institutionId),
        enabled: Boolean(institutionId),
    });
}

export function useCoursesByCareer(careerId) {
    return useQuery({
        queryKey: ['courses', careerId],
        queryFn: () => academicService.listCoursesByCareer(careerId),
        enabled: Boolean(careerId),
    });
}