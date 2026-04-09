import { useTranslation } from 'react-i18next';
import { DollarSign, Clock, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { useExpenseDashboard } from '../../hooks';
import { Skeleton } from '../../../../components/ui/skeleton';
import { StatCard } from '../../../../components/ui/stat-card';
import { Avatar } from '../../../../components/ui/avatar';
import { Badge } from '../../../../components/ui/badge';
import { formatCurrency, formatDate } from '../../../../lib/format';

export function ExpenseDashboardSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useExpenseDashboard();

  if (isLoading || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)' }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
          <Skeleton style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
          <Skeleton style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  const {
    totalExpenses = 0,
    totalChange = 0,
    pendingCount = 0,
    unpaidAmount = 0,
    reimbursedThisMonth = 0,
    byCategory = [],
    monthlyTrend = [],
    topSpenders = [],
    policyViolations = { count: 0, reasons: [] },
    pendingPayments = [],
  } = data as {
    totalExpenses: number;
    totalChange: number;
    pendingCount: number;
    unpaidAmount: number;
    reimbursedThisMonth: number;
    byCategory: Array<{ name: string; color: string; amount: number }>;
    monthlyTrend: Array<{ month: string; amount: number }>;
    topSpenders: Array<{ name: string; amount: number }>;
    policyViolations: { count: number; reasons: string[] };
    pendingPayments: Array<{ employeeName: string; amount: number; date: string }>;
  };

  const maxCategoryAmount = Math.max(...byCategory.map((c) => c.amount), 1);
  const maxTrendAmount = Math.max(...monthlyTrend.map((m) => m.amount), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Summary cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 'var(--spacing-md)',
      }}>
        <StatCard
          label={t('hr.expenses.dashboard.totalExpenses')}
          value={formatCurrency(totalExpenses)}
          subtitle={totalChange !== 0 ? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}%` : undefined}
          icon={DollarSign}
          color="var(--color-accent-primary)"
        />
        <StatCard
          label={t('hr.expenses.dashboard.pendingApprovals')}
          value={String(pendingCount)}
          icon={Clock}
          color="var(--color-warning)"
        />
        <StatCard
          label={t('hr.expenses.dashboard.unpaidAmount')}
          value={formatCurrency(unpaidAmount)}
          icon={CreditCard}
          color="var(--color-error)"
        />
        <StatCard
          label={t('hr.expenses.dashboard.reimbursedMonth')}
          value={formatCurrency(reimbursedThisMonth)}
          icon={CheckCircle}
          color="var(--color-success)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        {/* Spend by category */}
        <DashboardCard title={t('hr.expenses.dashboard.byCategory')}>
          {byCategory.length === 0 ? (
            <EmptyHint text={t('hr.expenses.dashboard.noData')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {byCategory.map((cat) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <span style={{
                    width: 100, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {cat.name}
                  </span>
                  <div style={{ flex: 1, height: 8, background: 'var(--color-bg-tertiary)', borderRadius: 4 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.max((cat.amount / maxCategoryAmount) * 100, cat.amount > 0 ? 4 : 0)}%`,
                      background: cat.color,
                      borderRadius: 4,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{
                    minWidth: 70, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-family)', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatCurrency(cat.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Monthly trend */}
        <DashboardCard title={t('hr.expenses.dashboard.monthlyTrend')}>
          {monthlyTrend.length === 0 ? (
            <EmptyHint text={t('hr.expenses.dashboard.noData')} />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 'var(--spacing-sm)',
              height: 120,
              paddingTop: 'var(--spacing-sm)',
            }}>
              {monthlyTrend.map((m) => {
                const heightPct = maxTrendAmount > 0 ? (m.amount / maxTrendAmount) * 100 : 0;
                return (
                  <div key={m.month} style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-family)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {formatCurrency(m.amount)}
                    </span>
                    <div style={{
                      width: '100%',
                      maxWidth: 40,
                      height: `${Math.max(heightPct, m.amount > 0 ? 4 : 0)}%`,
                      background: 'var(--color-accent-primary)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s',
                      minHeight: 2,
                    }} />
                    <span style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-family)',
                    }}>
                      {m.month}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>

        {/* Top spenders */}
        <DashboardCard title={t('hr.expenses.dashboard.topSpenders')}>
          {topSpenders.length === 0 ? (
            <EmptyHint text={t('hr.expenses.dashboard.noData')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {topSpenders.slice(0, 5).map((spender, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Avatar name={spender.name} size={24} />
                  <span style={{
                    flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {spender.name}
                  </span>
                  <span style={{
                    fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatCurrency(spender.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Policy violations + Pending payments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {/* Policy violations */}
          <DashboardCard title={t('hr.expenses.dashboard.policyViolations')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
              <AlertTriangle size={14} style={{ color: policyViolations.count > 0 ? 'var(--color-warning)' : 'var(--color-text-tertiary)' }} />
              <Badge variant={policyViolations.count > 0 ? 'warning' : 'default'}>
                {policyViolations.count}
              </Badge>
            </div>
            {policyViolations.reasons.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                {policyViolations.reasons.map((reason, idx) => (
                  <span key={idx} style={{
                    fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-family)',
                  }}>
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </DashboardCard>

          {/* Pending payments */}
          <DashboardCard title={t('hr.expenses.dashboard.pendingPayments')}>
            {pendingPayments.length === 0 ? (
              <EmptyHint text={t('hr.expenses.dashboard.noPendingPayments')} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {pendingPayments.slice(0, 5).map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <span style={{
                      flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.employeeName}
                    </span>
                    <span style={{
                      fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {formatCurrency(p.amount)}
                    </span>
                    <span style={{
                      fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-family)',
                    }}>
                      {formatDate(p.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function DashboardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: 'var(--spacing-lg)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border-primary)',
      background: 'var(--color-bg-primary)',
    }}>
      <h3 style={{
        fontSize: 'var(--font-size-md)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-primary)',
        marginBottom: 'var(--spacing-md)',
        fontFamily: 'var(--font-family)',
        margin: '0 0 var(--spacing-md) 0',
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-text-tertiary)',
      fontFamily: 'var(--font-family)',
    }}>
      {text}
    </div>
  );
}
