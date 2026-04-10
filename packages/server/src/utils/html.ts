/**
 * Shared HTML escaping helpers used by email templates and any other
 * place we inject user/tenant-provided text into HTML bodies.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeHtmlMultiline(str: string): string {
  return escapeHtml(str).replace(/\n/g, '<br />');
}
