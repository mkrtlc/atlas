const ATTACHMENT_PATTERNS = [
  /\battach(ed|ment|ments|ing)?\b/i,
  /\bpfa\b/i,
  /\bfind attached\b/i,
  /\benclosed\b/i,
  /\bsee attached\b/i,
  /\bherewith\b/i,
];

export function bodyMentionsAttachments(text: string): boolean {
  // Cap input length to prevent regex backtracking on very large bodies
  const sample = text.slice(0, 10_000);
  return ATTACHMENT_PATTERNS.some(pattern => pattern.test(sample));
}
