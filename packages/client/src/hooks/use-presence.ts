import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';

interface Viewer {
  userId: string;
  name: string | null;
  email: string | null;
}

export function usePresence(appId: string, recordId: string | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // POST heartbeat every 10s (fire-and-forget)
  useEffect(() => {
    if (!recordId) return;

    const sendHeartbeat = () => {
      api.post('/presence/heartbeat', { appId, recordId }).catch(() => {
        // fire-and-forget — ignore errors
      });
    };

    // Send immediately on mount
    sendHeartbeat();

    intervalRef.current = setInterval(sendHeartbeat, 10_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [appId, recordId]);

  // GET viewers every 10s
  const { data } = useQuery({
    queryKey: queryKeys.presence.viewers(appId, recordId ?? ''),
    queryFn: async () => {
      const { data: resp } = await api.get(`/presence/${appId}/${recordId}`);
      return resp.data as Viewer[];
    },
    enabled: !!recordId,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  return { viewers: data ?? [] };
}
