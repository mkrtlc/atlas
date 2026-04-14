/**
 * Sentinel prefix identifying a translation key stored in workflow fields
 * (name, actionConfig.taskTitle, actionConfig.body, actionConfig.tag).
 * Must stay in sync with `I18N_KEY_PREFIX` in `packages/server/src/utils/i18n.ts`.
 */
export const I18N_KEY_PREFIX = '__i18n:';

/**
 * If `str` is a translation key (starts with `__i18n:`), resolve it.
 * Otherwise return the original string. User-entered workflow text has
 * no prefix and passes through untouched.
 *
 * The `t` parameter is deliberately typed loosely (`any`) because this helper
 * is called from sites that pass both the full react-i18next `TFunction` and
 * the narrowed `(key: string) => string` wrapper used elsewhere in the CRM.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveMaybeKey(str: string | null | undefined, t: any): string {
  if (!str) return '';
  if (!str.startsWith(I18N_KEY_PREFIX)) return str;
  const key = str.slice(I18N_KEY_PREFIX.length);
  // Fall back to the raw key if the translation is missing, so missing keys
  // are visible during development instead of rendering as empty text.
  const translated = t(key, { defaultValue: str });
  return typeof translated === 'string' ? translated : str;
}

// Convenience wrappers so call sites read naturally.
export const translateWorkflowName = resolveMaybeKey;
export const translateWorkflowTaskTitle = resolveMaybeKey;
export const translateWorkflowBody = resolveMaybeKey;
export const translateWorkflowTag = resolveMaybeKey;
