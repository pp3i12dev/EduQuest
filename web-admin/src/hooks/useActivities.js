import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveActivityDraft } from '../services/activity.service';

export const useSaveActivityDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveActivityDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};