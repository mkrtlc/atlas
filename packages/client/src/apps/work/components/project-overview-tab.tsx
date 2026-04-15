import { Users, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { StatusDot } from '../../../components/ui/status-dot';
import { formatCurrency, formatNumber, formatDate } from '../../../lib/format';
import type { WorkProject } from '../hooks';

interface Props {
  project: WorkProject;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: 'var(--spacing-lg)',
      background: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border-secondary)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-xs)',
    }}>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'var(--font-weight-medium)' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{sub}</span>
      )}
    </div>
  );
}

function ProgressBar({ pct, warn }: { pct: number; warn?: boolean }) {
  const color = pct > 90 ? 'var(--color-error)' : pct > 70 ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: warn ? color : 'var(--color-accent-primary)', borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

export function ProjectOverviewTab({ project }: Props) {
  const hoursPct = project.budgetHours ? (project.totalHours / project.budgetHours) * 100 : 0;
  const amountPct = project.budgetAmount ? (project.totalAmount / project.budgetAmount) * 100 : 0;
  const statusVariant = project.status === 'active' ? 'success' : project.status === 'paused' ? 'warning' : project.status === 'completed' ? 'primary' : 'default';

  return (
    <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)', maxWidth: 860 }}>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <StatusDot color={project.color} size={12} />
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
            {project.name}
          </h2>
          <Badge variant={statusVariant}>
            {project.status}
          </Badge>
          {project.isBillable && (
            <Badge variant="primary">Billable</Badge>
          )}
        </div>
        {project.companyName && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <Users size={13} />
            {project.companyName}
          </span>
        )}
        {project.description && (
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 'var(--spacing-xs)' }}>
            {project.description}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--spacing-md)' }}>
        <StatCard
          label="Total hours"
          value={`${formatNumber(project.totalHours, 1)}h`}
          sub={project.budgetHours ? `of ${formatNumber(project.budgetHours, 0)}h budget` : undefined}
        />
        <StatCard
          label="Billable hours"
          value={`${formatNumber(project.billableHours, 1)}h`}
          sub={`${formatNumber(project.billedHours, 1)}h billed`}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(project.totalAmount)}
          sub={project.budgetAmount ? `of ${formatCurrency(project.budgetAmount)} budget` : undefined}
        />
        <StatCard
          label="Unbilled"
          value={`${formatNumber(project.unbilledHours, 1)}h`}
          sub="needs invoicing"
        />
      </div>

      {/* Budget progress */}
      {(project.budgetHours || project.budgetAmount) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-secondary)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>Budget</span>
          {project.budgetHours && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                <span>Hours</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                  {formatNumber(project.totalHours, 1)}h / {formatNumber(project.budgetHours, 0)}h ({Math.round(hoursPct)}%)
                </span>
              </div>
              <ProgressBar pct={hoursPct} warn />
            </div>
          )}
          {project.budgetAmount != null && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                <span>Amount</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <DollarSign size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                  {formatCurrency(project.totalAmount)} / {formatCurrency(project.budgetAmount)} ({Math.round(amountPct)}%)
                </span>
              </div>
              <ProgressBar pct={amountPct} warn />
            </div>
          )}
        </div>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', gap: 'var(--spacing-2xl)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
        <span>
          <CheckCircle size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Created {formatDate(project.createdAt)}
        </span>
        <span>
          Updated {formatDate(project.updatedAt)}
        </span>
        {project.hourlyRate > 0 && (
          <span>Rate: {formatCurrency(project.hourlyRate)}/h</span>
        )}
      </div>
    </div>
  );
}
