import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';

export interface TenantFormatSettings {
  id: string;
  tenantId: string;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export function useTenantFormatSettings() {
  return useQuery({
    queryKey: queryKeys.settings.tenantFormats,
    queryFn: async () => {
      const { data } = await api.get('/settings/formats-tenant');
      return data.data as TenantFormatSettings;
    },
    staleTime: 60_000,
  });
}

export function useUpdateTenantFormatSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { defaultCurrency: string }) => {
      const { data } = await api.put('/settings/formats-tenant', input);
      return data.data as TenantFormatSettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.tenantFormats });
    },
  });
}
