import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { endImpersonation, getImpersonationTarget } from '../impersonation';

const BANNER_HEIGHT = 36;

function decodeJwt(token: string): { impersonatedBy?: string; exp?: number } | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

/**
 * Renders a fixed warning banner pinned to the top of the viewport whenever
 * the active JWT carries an impersonatedBy claim, plus an app-wide orange
 * inset outline and a [IMPERSONATING …] document-title prefix. The banner
 * reserves its own space via a body padding-top so it never overlaps the app.
 * Returns null otherwise — zero cost in the normal case.
 */
export function ImpersonationBanner() {
  const [token, setToken] = useState(() => localStorage.getItem('atlasmail_token'));

  useEffect(() => {
    const id = setInterval(() => {
      setToken(localStorage.getItem('atlasmail_token'));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const payload = token ? decodeJwt(token) : null;
  const impersonating = !!payload?.impersonatedBy;
  const target = impersonating ? getImpersonationTarget() : null;

  useEffect(() => {
    if (!impersonating) return;
    const originalTitle = document.title;
    const originalPadding = document.body.style.paddingTop;
    const originalOutline = document.body.style.boxShadow;

    const slug = target?.slug ?? 'tenant';
    document.title = `[IMPERSONATING ${slug}] ${originalTitle.replace(/^\[IMPERSONATING [^\]]+\]\s*/, '')}`;
    document.body.style.paddingTop = `${BANNER_HEIGHT}px`;
    document.body.style.boxShadow = 'inset 0 0 0 3px #b45309';

    return () => {
      document.title = originalTitle;
      document.body.style.paddingTop = originalPadding;
      document.body.style.boxShadow = originalOutline;
    };
  }, [impersonating, target?.slug]);

  if (!impersonating) return null;

  const handleExit = () => {
    endImpersonation();
    window.location.href = '/system?view=tenants';
  };

  const expiresAt = payload?.exp ? new Date(payload.exp * 1000) : null;
  const minutesLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60000)) : null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: BANNER_HEIGHT,
        zIndex: 100000,
        background: '#b45309',
        color: 'white',
        padding: '0 16px',
        fontSize: 'var(--font-size-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontFamily: 'var(--font-family)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <strong>Impersonating</strong>
          {target ? <> tenant <strong>{target.name}</strong> ({target.slug})</> : null}
          {minutesLeft !== null ? <> — expires in {minutesLeft}m</> : null}
        </span>
      </div>
      <button
        onClick={handleExit}
        style={{
          background: 'white',
          color: '#b45309',
          border: 'none',
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Exit impersonation
      </button>
    </div>
  );
}
