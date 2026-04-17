import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, type ReactNode } from 'react';
import { STALE_RESOURCE_CODE } from '@atlas-platform/shared';
import { useToastStore } from '../stores/toast-store';

/**
 * Extract a user-visible error message from a mutation failure.
 * Prefers the server's `error` field, then axios message, then a generic fallback.
 */
function messageFromError(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

/**
 * Default mutation error handler — shows a toast so failures are never silent.
 * Skips 401 (auth refresh flow handles it) and 409 STALE_RESOURCE (conflict dialog handles it).
 * Per-call-site `onError` still runs; this is a safety net, not a replacement.
 */
function defaultMutationErrorHandler(error: unknown) {
  document.dispatchEvent(new CustomEvent('atlasmail:query-error'));
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    if (status === 401) return;
    if (status === 409 && code === STALE_RESOURCE_CODE) return;
  }
  useToastStore.getState().addToast({
    type: 'error',
    message: messageFromError(error),
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: defaultMutationErrorHandler,
    },
  },
});

// When any query fails (after retries exhausted), notify the network status
// hook so it can run an immediate health check and show the connection banner.
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.action.type === 'error') {
    document.dispatchEvent(new CustomEvent('atlasmail:query-error'));
  }
});

function AccountSwitchListener() {
  useEffect(() => {
    async function handleAccountSwitch() {
      // Cancel in-flight queries first so a slow response from the previous
      // account cannot land and re-populate the cache after it has been cleared.
      await queryClient.cancelQueries();
      // Remove all cached data so the new account's data loads fresh
      queryClient.clear();
    }
    window.addEventListener('atlasmail:account-switch', handleAccountSwitch);
    return () => window.removeEventListener('atlasmail:account-switch', handleAccountSwitch);
  }, []);

  return null;
}

/** Auto-retry all active queries when the network connection is restored. */
function ConnectionRestoredListener() {
  useEffect(() => {
    function handleRestored() {
      queryClient.refetchQueries({ type: 'active' });
    }
    document.addEventListener('atlasmail:connection-restored', handleRestored);
    return () => document.removeEventListener('atlasmail:connection-restored', handleRestored);
  }, []);

  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AccountSwitchListener />
      <ConnectionRestoredListener />
      {children}
    </QueryClientProvider>
  );
}
