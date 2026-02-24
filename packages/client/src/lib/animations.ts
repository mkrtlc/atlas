/**
 * Shared animation utilities for AtlasMail.
 *
 * Provides:
 * - CSS keyframe injection (deduped, one-time)
 * - useAnimationClass hook for triggering transient CSS animations
 * - Reusable animation name constants
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';

// ---------------------------------------------------------------------------
// CSS keyframe injection — each keyframe string is injected once into <head>
// ---------------------------------------------------------------------------

const injectedIds = new Set<string>();

/**
 * Inject a CSS keyframe block into the document <head> exactly once.
 * Safe to call multiple times with the same id — subsequent calls are no-ops.
 */
export function injectKeyframes(id: string, css: string): void {
  if (typeof document === 'undefined') return;
  if (injectedIds.has(id)) return;
  injectedIds.add(id);
  const style = document.createElement('style');
  style.id = `atlasmail-anim-${id}`;
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// useAnimationClass — triggers a CSS animation for a fixed duration
// ---------------------------------------------------------------------------

/**
 * Returns a boolean that is `true` for `duration` ms after `trigger()` is called.
 * Respects the global `sendAnimation` setting (animations master switch).
 *
 * Usage:
 *   const [animating, trigger] = useAnimationClass(400);
 *   <div style={{ animation: animating ? 'myAnim 400ms ease' : 'none' }} />
 *   <button onClick={trigger}>Go</button>
 */
export function useAnimationClass(durationMs: number): [boolean, () => void] {
  const enabled = useSettingsStore((s) => s.sendAnimation);
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const trigger = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setActive(false);
    // Force a re-render cycle so the animation restarts cleanly
    requestAnimationFrame(() => {
      setActive(true);
      timerRef.current = setTimeout(() => setActive(false), durationMs);
    });
  }, [enabled, durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return [active, trigger];
}

// ---------------------------------------------------------------------------
// useValueChangeAnimation — animates when a value transitions to a target
// ---------------------------------------------------------------------------

/**
 * Returns true for `durationMs` whenever `value` transitions to `targetValue`.
 * Skips the initial mount. Respects the global animations toggle.
 *
 * Usage:
 *   const starAnimating = useValueChangeAnimation(thread.isStarred, true, 500);
 */
export function useValueChangeAnimation<T>(
  value: T,
  targetValue: T,
  durationMs: number,
): boolean {
  const enabled = useSettingsStore((s) => s.sendAnimation);
  const prevRef = useRef(value);
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const changed = value === targetValue && prevRef.current !== targetValue;
    prevRef.current = value;
    if (changed && enabled) {
      setActive(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setActive(false), durationMs);
    }
  }, [value, targetValue, durationMs, enabled]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return active;
}

// ---------------------------------------------------------------------------
// Keyframe definitions — injected lazily on first use
// ---------------------------------------------------------------------------

/** Star pop: scale up + rotate then settle */
export function injectStarPop(): void {
  injectKeyframes(
    'star-pop',
    `@keyframes atlasmail-star-pop {
      0%   { transform: scale(1) rotate(0deg); }
      30%  { transform: scale(1.35) rotate(-12deg); }
      50%  { transform: scale(0.9) rotate(5deg); }
      70%  { transform: scale(1.1) rotate(-3deg); }
      100% { transform: scale(1) rotate(0deg); }
    }`,
  );
}

/** Inbox-zero confetti burst */
export function injectInboxZero(): void {
  injectKeyframes(
    'inbox-zero-rise',
    `@keyframes atlasmail-inbox-zero-rise {
      0%   { transform: translateY(0) scale(1); opacity: 1; }
      60%  { opacity: 0.8; }
      100% { transform: translateY(-80px) scale(0); opacity: 0; }
    }
    @keyframes atlasmail-inbox-zero-check {
      0%   { transform: scale(0); opacity: 0; }
      50%  { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }`,
  );
}

/** Compose slide-up entrance */
export function injectComposeTransition(): void {
  injectKeyframes(
    'compose-transition',
    `@keyframes atlasmail-compose-enter {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes atlasmail-compose-overlay-enter {
      from { opacity: 0; }
      to   { opacity: 1; }
    }`,
  );
}

/** Thread message expand/collapse */
export function injectThreadExpand(): void {
  injectKeyframes(
    'thread-expand',
    `@keyframes atlasmail-thread-expand {
      from {
        opacity: 0;
        max-height: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        max-height: 2000px;
        transform: translateY(0);
      }
    }`,
  );
}

/** New email arrival slide-in */
export function injectNewEmailArrival(): void {
  injectKeyframes(
    'new-email-arrival',
    `@keyframes atlasmail-new-email-enter {
      from {
        opacity: 0;
        transform: translateX(-12px);
        background: color-mix(in srgb, var(--color-accent-primary) 8%, transparent);
      }
      to {
        opacity: 1;
        transform: translateX(0);
        background: transparent;
      }
    }`,
  );
}
