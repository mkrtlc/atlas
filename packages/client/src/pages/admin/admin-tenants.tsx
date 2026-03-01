import { useNavigate } from 'react-router-dom';
import { useAdminTenants, useUpdateTenantStatus } from '../../hooks/use-admin';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)', text: 'var(--color-success)' },
    suspended: { bg: 'color-mix(in srgb, var(--color-error) 15%, transparent)', text: 'var(--color-error)' },
  };
  const c = colors[status] ?? { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-tertiary)' };

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-weight-medium)',
      background: c.bg,
      color: c.text,
    }}>
      {status}
    </span>
  );
}

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

export function AdminTenantsPage() {
  const navigate = useNavigate();
  const { data: tenants, isLoading } = useAdminTenants();
  const statusMutation = useUpdateTenantStatus();

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
        Tenants
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
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Members</th>
              <th style={thStyle}>Apps</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants?.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/admin/tenants/${t.id}`)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <td style={{ ...tdStyle, fontWeight: 'var(--font-weight-medium)' }}>{t.name}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>{t.slug}</td>
                <td style={tdStyle}>{t.plan}</td>
                <td style={tdStyle}><StatusBadge status={t.status} /></td>
                <td style={tdStyle}>{t.memberCount}</td>
                <td style={tdStyle}>{t.installationCount}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                <td style={tdStyle}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      statusMutation.mutate({
                        id: t.id,
                        status: t.status === 'active' ? 'suspended' : 'active',
                      });
                    }}
                    style={{
                      padding: '4px 10px',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-primary)',
                      color: t.status === 'active' ? 'var(--color-error)' : 'var(--color-success)',
                      fontSize: 'var(--font-size-xs)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family)',
                    }}
                  >
                    {t.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {(!tenants || tenants.length === 0) && (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                  No tenants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
