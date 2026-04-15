import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { useProjectFinancials } from '../hooks';
import { getInvoiceStatusVariant } from '@atlas-platform/shared';
import type { InvoiceStatus } from '@atlas-platform/shared';

interface Project { id: string; companyId?: string | null; }
interface Props { projectId: string; project: Project; }

function fmt(n: number, currency: string) {
  if (currency === 'MIXED') return `${n.toFixed(2)} (mixed)`;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}

export function ProjectFinancialsTab({ projectId, project }: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useProjectFinancials(projectId);

  if (isLoading || !data) return <div style={{ padding: 'var(--spacing-md)' }}>Loading…</div>;
  const { summary, invoices } = data;

  const newInvoice = () => {
    const qs = new URLSearchParams();
    qs.set('new', 'true');
    qs.set('projectId', projectId);
    if (project.companyId) qs.set('companyId', project.companyId);
    navigate(`/invoices?${qs.toString()}`);
  };

  return (
    <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
        <SummaryCard label="Total billed" value={fmt(summary.totalBilled, summary.currency)} />
        <SummaryCard label="Total paid" value={fmt(summary.totalPaid, summary.currency)} />
        <SummaryCard label="Outstanding" value={fmt(summary.outstanding, summary.currency)} />
      </div>

      <div>
        <Button variant="primary" size="sm" onClick={newInvoice}>+ New invoice</Button>
      </div>

      {invoices.length === 0 ? (
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>No invoices for this project yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--color-text-tertiary)', borderBottom: '1px solid var(--color-border-secondary)' }}>
              <th style={{ padding: 'var(--spacing-sm)' }}>Number</th>
              <th style={{ padding: 'var(--spacing-sm)' }}>Issued</th>
              <th style={{ padding: 'var(--spacing-sm)' }}>Due</th>
              <th style={{ padding: 'var(--spacing-sm)' }}>Total</th>
              <th style={{ padding: 'var(--spacing-sm)' }}>Balance</th>
              <th style={{ padding: 'var(--spacing-sm)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}
                  onClick={() => navigate(`/invoices?view=invoice-detail&invoiceId=${inv.id}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border-secondary)' }}>
                <td style={{ padding: 'var(--spacing-sm)' }}>{inv.invoiceNumber}</td>
                <td style={{ padding: 'var(--spacing-sm)' }}>{String(inv.issueDate).slice(0, 10)}</td>
                <td style={{ padding: 'var(--spacing-sm)' }}>{String(inv.dueDate).slice(0, 10)}</td>
                <td style={{ padding: 'var(--spacing-sm)' }}>{fmt(inv.total, inv.currency)}</td>
                <td style={{ padding: 'var(--spacing-sm)' }}>{fmt(inv.balanceDue, inv.currency)}</td>
                <td style={{ padding: 'var(--spacing-sm)' }}>
                  <Badge variant={getInvoiceStatusVariant(inv.status as InvoiceStatus)}>{inv.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: 'var(--spacing-md)',
      border: '1px solid var(--color-border-secondary)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-secondary)',
    }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginTop: 'var(--spacing-xs)' }}>{value}</div>
    </div>
  );
}
