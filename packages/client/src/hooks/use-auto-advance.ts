import { useCallback, useRef } from 'react';
import { useEmailStore } from '../stores/email-store';
import { useSettingsStore } from '../stores/settings-store';
import type { Thread } from '@atlasmail/shared';

/**
 * Returns an `advanceAfterRemoval` function that moves the cursor and active
 * thread after a thread is removed from the list (archive / trash / spam).
 *
 * Pass the current `displayThreads` array.  Internally the hook keeps a ref
 * so the deferred callback always reads the post-removal list.
 *
 * Call `advanceAfterRemoval(removedThreadId, currentCursorIndex)` immediately
 * before (or after) the undo-hook call.  The actual store update is deferred
 * one tick so it fires after the optimistic cache removal propagates and the
 * component re-renders with the shorter list.
 *
 * Usage:
 *   const advanceAfterRemoval = useAutoAdvance(displayThreads);
 *   advanceAfterRemoval(threadId, cursorIndex);
 *   archiveWithUndo(threadId, listKey);  // removes thread from cache
 */
export function useAutoAdvance(displayThreads: Thread[]) {
  const { setActiveThread, setCursorIndex } = useEmailStore();
  const autoAdvance = useSettingsStore((s) => s.autoAdvance);

  // Keep a stable ref so the setTimeout closure always sees the latest list
  const threadsRef = useRef<Thread[]>(displayThreads);
  threadsRef.current = displayThreads;

  return useCallback(
    (removedThreadId: string, currentCursorIndex: number) => {
      // Only advance when the removed thread is the currently active one
      const { activeThreadId } = useEmailStore.getState();
      if (activeThreadId !== removedThreadId) return;

      setTimeout(() => {
        // Re-check: the user may have manually selected another thread
        // between the removal and this deferred callback.
        const { activeThreadId: currentActive } = useEmailStore.getState();
        if (currentActive && currentActive !== removedThreadId) return;

        const threads = threadsRef.current;
        const nextLength = threads.length;

        if (autoAdvance === 'list' || nextLength === 0) {
          setActiveThread(null);
          return;
        }

        let nextIndex: number;

        if (autoAdvance === 'next') {
          // Stay at same index slot (now the next thread after removal).
          // If we were at the last item, clamp to the new last position.
          nextIndex = Math.min(currentCursorIndex, nextLength - 1);
        } else {
          // 'previous': move back one slot; clamp to 0 if at the top
          nextIndex = Math.max(0, currentCursorIndex - 1);
        }

        const nextThread = threads[nextIndex];
        if (nextThread) {
          document.dispatchEvent(new CustomEvent('atlasmail:keyboard-cursor-move'));
          setCursorIndex(nextIndex);
          setActiveThread(nextThread.id);
        }
      }, 0);
    },
    [autoAdvance, setActiveThread, setCursorIndex],
  );
}
