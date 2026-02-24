import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
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

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AccountSwitchListener />
      {children}
    </QueryClientProvider>
  );
}
