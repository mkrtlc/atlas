import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { ContactByEmailResponse } from '@atlasmail/shared';

export function useContactByEmail(email: string | null) {
  return useQuery({
    queryKey: queryKeys.contacts.byEmail(email!),
    queryFn: async () => {
      const { data } = await api.get(`/contacts/by-email/${encodeURIComponent(email!)}`);
      return data.data as ContactByEmailResponse;
    },
    enabled: !!email,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateContactNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, notes }: { email: string; notes: string }) => {
      await api.patch(`/contacts/by-email/${encodeURIComponent(email)}/notes`, { notes });
    },
    onSuccess: (_data, variables) => {
      // Invalidate the contact query so the panel shows the updated notes
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.byEmail(variables.email),
      });
    },
  });
}
