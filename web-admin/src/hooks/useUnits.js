import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitService } from '../services/unit.service';

export function useUnits(teacherSubjectId) {
    return useQuery({
        queryKey: ['units', teacherSubjectId],
        queryFn: () => unitService.list(teacherSubjectId),
        enabled: Boolean(teacherSubjectId),
    });
}

export function useCreateUnit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: unitService.create,
        onSuccess: (_data, { teacherSubjectId }) => {
            // refresca la tabla sin recargar la página
            queryClient.invalidateQueries({ queryKey: ['units', teacherSubjectId] });
        },
    });
}
