import path from 'node:path';

/**
 * Shared sandbox guard for any disk path derived from a user-influenced
 * `storagePath` (DB column, multipart filename, etc.). Resolves the path
 * against UPLOADS_DIR and asserts the result stays inside that directory.
 *
 * Throws if the resolved path escapes the sandbox — which means a tampered
 * storagePath (e.g. "../../etc/passwd") never reaches the filesystem.
 *
 * Use this in every place that does `path.join(UPLOADS_DIR, item.storagePath)`
 * before the resulting path is passed to fs / sendFile / createReadStream.
 */
export const UPLOADS_DIR = path.join(__dirname, '../../../../uploads');

export function safeFilePath(storagePath: string, baseDir: string = UPLOADS_DIR): string {
  if (!storagePath || typeof storagePath !== 'string') {
    throw new Error('storagePath required');
  }
  const resolvedBase = path.resolve(baseDir);
  const resolved = path.resolve(baseDir, storagePath);
  // Ensure the resolved path is inside the sandbox. Compare with a trailing
  // separator on the base so a sibling like `<base>-evil/x` cannot match.
  if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
    throw new Error(`Path traversal blocked: ${storagePath}`);
  }
  return resolved;
}

/**
 * Sanitize a user-supplied filename (e.g. multipart upload `originalname`).
 * Strips path separators, NULL bytes, and characters likely to cause issues
 * across filesystems. Mirrors the policy used by the authenticated upload's
 * multer storage config so every upload surface produces consistent names.
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') return 'file';
  // Re-decode latin1 -> utf8 because multer hands us raw bytes for non-ASCII.
  let decoded: string;
  try {
    decoded = Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    decoded = name;
  }
  // Strip everything except safe ASCII, basic Unicode letters/digits, dot, dash, underscore.
  return decoded.replace(/[^a-zA-Z0-9._\-À-ɏͰ-ϿЀ-ӿ]/g, '_');
}
