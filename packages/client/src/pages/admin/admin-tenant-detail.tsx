import { useParams, useNavigate } from 'react-router-dom';
import { useAdminTenant, useUpdateTenantStatus, useUpdateTenantPlan, useInstallationAction } from '../../hooks/use-admin';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../config/query-keys';

const PLANS = ['starter', 'pro', 'enterprise'];

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'var(--color-text-tertiary)',
  borderBottom: '1px solid var(--color-border-primary)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 'var(--font-size-sm)',
  borderBottom: '1px solid var(--color-border-secondary)',
  whiteSpace: 'nowrap',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 'var(--spacing-xl)',
  background: 'var(--color-bg-primary)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-primary)',
  overflow: 'auto',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--color-border-primary)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-bg-primary)',
  fontSize: 'var(--font-size-xs)',
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
  marginRight: 4,
  color: 'var(--color-text-secondary)',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: 'var(--color-success)',
    stopped: 'var(--color-warning)',
    error: 'var(--color-error)',
    installing: 'var(--color-info)',
    healthy: 'var(--color-success)',
    unhealthy: 'var(--color-error)',
  };
  const color = map[status] ?? 'var(--color-text-tertiary)';

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-weight-medium)',
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color,
    }}>
      {status}
    </span>
  );
}

export function AdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading } = useAdminTenant(id!);
  const statusMutation = useUpdateTenantStatus();
  const planMutation = useUpdateTenantPlan();
  const installAction = useInstallationAction();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.admin.tenant(id!) });
  };

  if (isLoading) {
    return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>Loading...</div>;
  }

  if (!tenant) {
    return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>Tenant not found</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate('/admin/tenants')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--font-size-sm)',
          cursor: 'pointer',
          fontFamily: 'var(--font-family)',
          padding: 0,
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        &larr; Back to tenants
      </button>

      {/* Header */}
      <div style={{
        ...sectionStyle,
        padding: 'var(--spacing-xl)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xl)',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-xs)',
          }}>
            {tenant.name}
          </h1>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}>
            {tenant.slug}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 2 }}>Plan</label>
            <select
              value={tenant.plan}
              onChange={(e) => {
                planMutation.mutate({ id: tenant.id, plan: e.target.value }, { onSuccess: invalidate });
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
              }}
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 2 }}>Status</label>
            <button
              onClick={() => {
                statusMutation.mutate(
                  { id: tenant.id, status: tenant.status === 'active' ? 'suspended' : 'active' },
                  { onSuccess: invalidate },
                );
              }}
              style={{
                ...actionBtnStyle,
                color: tenant.status === 'active' ? 'var(--color-error)' : 'var(--color-success)',
                marginRight: 0,
              }}
            >
              {tenant.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
          </div>

          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            <div>CPU: {tenant.quotaCpu}m</div>
            <div>Memory: {tenant.quotaMemoryMb}MB</div>
            <div>Storage: {tenant.quotaStorageMb}MB</div>
          </div>
        </div>
      </div>

      {/* Members */}
      <h2 style={{
        fontSize: 'var(--font-size-lg)',
        fontWeight: 'var(--font-weight-semibold)',
        marginBottom: 'var(--spacing-md)',
      }}>
        Members ({tenant.members.length})
      </h2>
      <div style={sectionStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>User ID</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {tenant.members.map((m) => (
              <tr key={m.userId}>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{m.userId}</td>
                <td style={tdStyle}>{m.role}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>{new Date(m.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Installations */}
      <h2 style={{
        fontSize: 'var(--font-size-lg)',
        fontWeight: 'var(--font-weight-semibold)',
        marginBottom: 'var(--spacing-md)',
      }}>
        Installations ({tenant.installations.length})
      </h2>
      <div style={sectionStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>App</th>
              <th style={thStyle}>Subdomain</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Health</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenant.installations.map((inst) => (
              <tr key={inst.id}>
                <td style={{ ...tdStyle, fontWeight: 'var(--font-weight-medium)' }}>{inst.appName ?? inst.catalogAppId}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{inst.subdomain}</td>
                <td style={tdStyle}><StatusBadge status={inst.status} /></td>
                <td style={tdStyle}>{inst.lastHealthStatus ? <StatusBadge status={inst.lastHealthStatus} /> : '—'}</td>
                <td style={tdStyle}>
                  {inst.status === 'stopped' && (
                    <button style={actionBtnStyle} onClick={() => installAction.mutate({ id: inst.id, action: 'start' }, { onSuccess: invalidate })}>Start</button>
                  )}
                  {inst.status === 'running' && (
                    <>
                      <button style={actionBtnStyle} onClick={() => installAction.mutate({ id: inst.id, action: 'stop' }, { onSuccess: invalidate })}>Stop</button>
                      <button style={actionBtnStyle} onClick={() => installAction.mutate({ id: inst.id, action: 'restart' }, { onSuccess: invalidate })}>Restart</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {tenant.installations.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                  No installations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
