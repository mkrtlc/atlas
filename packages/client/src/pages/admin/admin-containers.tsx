import { useAdminContainers } from '../../hooks/use-admin';

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

function StateBadge({ state }: { state: string }) {
  const color = state === 'running' ? 'var(--color-success)' : 'var(--color-warning)';
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
      {state}
    </span>
  );
}

export function AdminContainersPage() {
  const { data: containers, isLoading } = useAdminContainers();

  if (isLoading) {
    return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'var(--font-weight-semibold)',
        marginBottom: 'var(--spacing-xl)',
      }}>
        Docker containers
      </h1>

      <div style={{
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-primary)',
        overflow: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Image</th>
              <th style={thStyle}>State</th>
              <th style={thStyle}>Tenant</th>
              <th style={thStyle}>App ID</th>
              <th style={thStyle}>Installation ID</th>
            </tr>
          </thead>
          <tbody>
            {containers?.map((c) => (
              <tr key={c.id}>
                <td style={{ ...tdStyle, fontWeight: 'var(--font-weight-medium)' }}>{c.name}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{c.image}</td>
                <td style={tdStyle}><StateBadge state={c.state} /></td>
                <td style={tdStyle}>{c.tenant}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{c.appId}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{c.installationId}</td>
              </tr>
            ))}
            {(!containers || containers.length === 0) && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                  No containers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 'var(--spacing-md)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
      }}>
        Auto-refreshes every 10 seconds
      </div>
    </div>
  );
}
