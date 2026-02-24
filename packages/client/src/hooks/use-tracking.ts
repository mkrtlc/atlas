import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { ThreadTrackingStats } from '@atlasmail/shared';

const USE_MOCK = import.meta.env.DEV && !import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function useThreadTracking(threadId: string | null) {
  return useQuery({
    queryKey: queryKeys.tracking.thread(threadId!),
    queryFn: async () => {
      if (USE_MOCK) {
        return { totalOpens: 0, totalClicks: 0, uniqueRecipients: 0, records: [], events: [] } as ThreadTrackingStats;
      }
      const { data } = await api.get(`/threads/${threadId}/tracking`);
      return data.data as ThreadTrackingStats;
    },
    enabled: !!threadId,
    staleTime: 30_000,
  });
}
