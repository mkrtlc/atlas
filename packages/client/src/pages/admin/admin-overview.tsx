import { useAdminOverview } from '../../hooks/use-admin';

const cardStyle: React.CSSProperties = {
  padding: 'var(--spacing-xl)',
  background: 'var(--color-bg-primary)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-primary)',
};

export function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();

  if (isLoading) {
    return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>Loading...</div>;
  }

  if (!data) return null;

  const stats = [
    { label: 'Tenants', value: data.tenants, color: 'var(--color-accent-primary)' },
    { label: 'Running apps', value: data.installations.running, color: 'var(--color-success)' },
    { label: 'Stopped', value: data.installations.stopped, color: 'var(--color-warning)' },
    { label: 'Errors', value: data.installations.error, color: 'var(--color-error)' },
    { label: 'Docker containers', value: data.containers, color: 'var(--color-info)' },
  ];

  return (
    <div>
      <h1 style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'var(--font-weight-semibold)',
        marginBottom: 'var(--spacing-xl)',
      }}>
        Overview
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 'var(--spacing-lg)',
      }}>
        {stats.map((stat) => (
          <div key={stat.label} style={cardStyle}>
            <div style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: stat.color,
              marginBottom: 'var(--spacing-xs)',
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
