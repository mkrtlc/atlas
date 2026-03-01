import { useState } from 'react';
import { useAdminInstallations, useInstallationAction } from '../../hooks/use-admin';

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

const STATUS_FILTERS = ['all', 'running', 'stopped', 'error', 'installing'] as const;

export function AdminInstallationsPage() {
  const { data: installations, isLoading } = useAdminInstallations();
  const installAction = useInstallationAction();
  const [filter, setFilter] = useState<string>('all');

  if (isLoading) {
    return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>Loading...</div>;
  }

  const filtered = filter === 'all'
    ? installations
    : installations?.filter((i) => i.status === filter);

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-xl)',
      }}>
        <h1 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
        }}>
          Installations
        </h1>

        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border-primary)',
                background: filter === s ? 'var(--color-accent-primary)' : 'var(--color-bg-primary)',
                color: filter === s ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-primary)',
        overflow: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>App</th>
              <th style={thStyle}>Tenant</th>
              <th style={thStyle}>Subdomain</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Health</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((inst) => (
              <tr key={inst.id}>
                <td style={{ ...tdStyle, fontWeight: 'var(--font-weight-medium)' }}>{inst.appName ?? inst.catalogAppId}</td>
                <td style={tdStyle}>{inst.tenantName ?? inst.tenantId}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{inst.subdomain}</td>
                <td style={tdStyle}><StatusBadge status={inst.status} /></td>
                <td style={tdStyle}>{inst.lastHealthStatus ? <StatusBadge status={inst.lastHealthStatus} /> : '—'}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>{new Date(inst.createdAt).toLocaleDateString()}</td>
                <td style={tdStyle}>
                  {inst.status === 'stopped' && (
                    <button style={actionBtnStyle} onClick={() => installAction.mutate({ id: inst.id, action: 'start' })}>Start</button>
                  )}
                  {inst.status === 'running' && (
                    <>
                      <button style={actionBtnStyle} onClick={() => installAction.mutate({ id: inst.id, action: 'stop' })}>Stop</button>
                      <button style={actionBtnStyle} onClick={() => installAction.mutate({ id: inst.id, action: 'restart' })}>Restart</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {(!filtered || filtered.length === 0) && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                  No installations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
