/**
 * Generate a URL-safe slug from a string (e.g. company name → tenant slug).
 * Keeps only alphanumeric chars and hyphens, max 63 chars.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 63);
}
