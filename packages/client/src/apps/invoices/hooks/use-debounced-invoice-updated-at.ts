import { useEffect, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 1500;

/**
 * Debounce an invoice's `updatedAt` timestamp by `ms` milliseconds. Consumers
 * key the PDF iframe blob fetch on the debounced value so that bursty edits
 * (e.g. typing in a notes field) trigger at most one PDF regeneration.
 */
export function useDebouncedInvoiceUpdatedAt(
  updatedAt: string | undefined,
  ms: number = DEFAULT_DEBOUNCE_MS,
): string | undefined {
  const [debounced, setDebounced] = useState<string | undefined>(updatedAt);

  useEffect(() => {
    if (updatedAt === debounced) return;
    const handle = window.setTimeout(() => setDebounced(updatedAt), ms);
    return () => window.clearTimeout(handle);
  }, [updatedAt, ms, debounced]);

  return debounced;
}
