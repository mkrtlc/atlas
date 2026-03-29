import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { GlobalSearchResult } from '@atlasmail/shared';

export function useGlobalSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.search.global(trimmed),
    queryFn: async () => {
      const { data } = await api.get('/search', { params: { q: trimmed } });
      return data.data as GlobalSearchResult[];
    },
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
  });
}
