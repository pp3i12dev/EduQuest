import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionCommunicationService as api } from '../services/institutionCommunication.service';
export function useInstitutionCommunications(token) {
  return useQuery({ queryKey: ['institution-communications', token], queryFn: () => api.list(token), enabled: Boolean(token) });
}
export function useInstitutionCommunicationOptions(token, enabled) {
  return useQuery({ queryKey: ['institution-communication-options', token], queryFn: () => api.options(token), enabled: Boolean(token && enabled), retry: false });
}
export function useInstitutionCommunicationActions(token) {
  const qc = useQueryClient();
  const make = fn => useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['institution-communications'] }) });
  return {
    create: make(data => api.create(token, data)),
    update: make(({ id, data }) => api.update(token, id, data)),
    cancel: make(({ id, reason }) => api.cancel(token, id, reason)),
    remove: make(id => api.removeFromHistory(token, id)),
  };
}
