/**
 * Shared animation utilities for Atlas.
 *
 * Currently just the CSS-keyframe-injection helpers used by empty-state
 * components. The broader email-era animation helpers (star pop, inbox
 * zero, compose transition, AI sparkle, etc.) were removed when Atlas
 * stopped being an email client.
 */

// Each keyframe string is injected once into <head>.
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

/** Inbox-zero confetti burst — used by empty-state components. */
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
