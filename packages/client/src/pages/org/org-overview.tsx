import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AppWindow, Plus } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useTenantUsers, useMyTenants } from '../../hooks/use-platform';
import { useInstalledApps } from '../../hooks/use-installed-apps';
import { ROUTES } from '../../config/routes';
import { AppIcon } from '../../components/marketplace/app-icons';

export function OrgOverviewPage() {
  const tenantId = useAuthStore((s) => s.tenantId);
  const { data: tenants } = useMyTenants();
  const effectiveTenantId = tenantId ?? tenants?.[0]?.id;
  const navigate = useNavigate();

  const { data: users } = useTenantUsers(effectiveTenantId ?? undefined);
  const { installations: activeInstallations } = useInstalledApps();

  // -------------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------------

  const cardStyle: CSSProperties = {
    padding: 20,
    background: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border-primary)',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const statValueStyle: CSSProperties = {
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    lineHeight: 1.2,
  };

  const statLabelStyle: CSSProperties = {
    fontSize: 13,
    color: 'var(--color-text-tertiary)',
  };

  const iconCircleStyle: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'color-mix(in srgb, var(--color-accent-primary) 10%, transparent)',
    color: 'var(--color-accent-primary)',
    flexShrink: 0,
  };

  const actionBtnStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 14px',
    height: 34,
    background: '#13715B',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
  };

  const secondaryBtnStyle: CSSProperties = {
    ...actionBtnStyle,
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    border: '1px solid #d0d5dd',
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 24 }}>
        Overview
      </h2>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={iconCircleStyle}><Users size={18} /></div>
          </div>
          <div style={statValueStyle}>{users?.length ?? 0}</div>
          <div style={statLabelStyle}>Team members</div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={iconCircleStyle}><AppWindow size={18} /></div>
          </div>
          <div style={statValueStyle}>{activeInstallations?.length ?? 0}</div>
          <div style={statLabelStyle}>Installed apps</div>
        </div>
      </div>

      {/* Quick actions */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>
        Quick actions
      </h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
        <button onClick={() => navigate(ROUTES.ORG_MEMBERS)} style={secondaryBtnStyle}>
          <Plus size={14} />
          Add member
        </button>
        <button onClick={() => navigate(ROUTES.ORG_APPS)} style={actionBtnStyle}>
          <Plus size={14} />
          Install app
        </button>
      </div>

      {/* Installed apps list */}
      {activeInstallations && activeInstallations.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>
            Installed apps
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeInstallations.map((inst) => (
              <div
                key={inst.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: inst.color || '#666',
                  }}
                >
                  {inst.manifestId && <AppIcon manifestId={inst.manifestId} size={18} color="#fff" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {inst.name ?? inst.catalogAppId}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    {inst.subdomain}
                  </div>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 10,
                    background: inst.status === 'running'
                      ? 'color-mix(in srgb, #16a34a 12%, transparent)'
                      : 'color-mix(in srgb, #6b7280 12%, transparent)',
                    color: inst.status === 'running' ? '#16a34a' : '#6b7280',
                  }}
                >
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: inst.status === 'running' ? '#16a34a' : '#6b7280',
                  }} />
                  {inst.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
