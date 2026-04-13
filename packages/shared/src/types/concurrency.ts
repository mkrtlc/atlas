/**
 * Optimistic concurrency control types shared between client and server.
 * When a client PATCH sends If-Unmodified-Since with a stale timestamp,
 * the server responds with 409 and this body shape.
 */

export const STALE_RESOURCE_CODE = 'STALE_RESOURCE' as const;

export interface ConflictResponse {
  success: false;
  error: 'conflict';
  code: typeof STALE_RESOURCE_CODE;
  current: {
    updatedAt: string;
  };
}
