import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatCurrency } from '../../../lib/format';
import {
  FileText, Building2, Plus, DollarSign, Hash, Calendar, Link2,
} from 'lucide-react';
import type { Invoice } from '@atlasmail/shared';
import { getInvoiceStatusVariant } from '@atlasmail/shared';
import { Badge } from '../../../components/ui/badge';
import { DataTable, type DataTableColumn } from '../../../components/ui/data-table';
import { FeatureEmptyState } from '../../../components/ui/feature-empty-state';
import { Tooltip } from '../../../components/ui/tooltip';

export function InvoicesListView({ invoices, searchQuery, onSelect, selectedId, onAdd }: {
  invoices: Invoice[];
  searchQuery: string;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onAdd: () => void;
}) {
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter((inv) =>
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.companyName?.toLowerCase().includes(q)),
    );
  }, [invoices, searchQuery]);

  if (filtered.length === 0 && !searchQuery) {
    return (
      <FeatureEmptyState
        illustration="documents"
        title={t('invoices.empty.noInvoices')}
        description={t('invoices.empty.noInvoicesDescription')}
        highlights={[
          { icon: <FileText size={14} />, title: t('invoices.empty.createTitle'), description: t('invoices.empty.createDesc') },
          { icon: <DollarSign size={14} />, title: t('invoices.empty.trackTitle'), description: t('invoices.empty.trackDesc') },
          { icon: <Building2 size={14} />, title: t('invoices.empty.companyTitle'), description: t('invoices.empty.companyDesc') },
        ]}
        actionLabel={t('invoices.builder.createInvoice')}
        actionIcon={<Plus size={14} />}
        onAction={onAdd}
      />
    );
  }

  const totalAmount = filtered.reduce((sum, inv) => sum + inv.total, 0);

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: 'invoiceNumber',
      label: t('invoices.list.invoiceNumber'),
      icon: <Hash size={12} />,
      width: 120,
      sortable: true,
      render: (invoice) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{invoice.invoiceNumber}</span>
      ),
    },
    {
      key: 'companyName',
      label: t('invoices.list.company'),
      icon: <Building2 size={12} />,
      width: 160,
      sortable: true,
      render: (invoice) => (
        <span className="dt-cell-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {invoice.companyName || '-'}
        </span>
      ),
    },
    {
      key: 'source',
      label: '',
      width: 32,
      render: (invoice) =>
        invoice.dealId ? (
          <Tooltip content={invoice.dealTitle || t('invoices.detail.fromDeal')}>
            <Link2 size={12} style={{ color: 'var(--color-text-tertiary)' }} />
          </Tooltip>
        ) : null,
    },
    {
      key: 'total',
      label: t('invoices.list.amount'),
      icon: <DollarSign size={12} />,
      width: 110,
      sortable: true,
      align: 'right',
      render: (invoice) => (
        <span style={{ fontWeight: 'var(--font-weight-semibold)', fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(invoice.total)}
        </span>
      ),
    },
    {
      key: 'lineItemCount',
      label: t('invoices.list.items'),
      icon: <Hash size={12} />,
      width: 70,
      sortable: true,
      align: 'right',
      render: (invoice) => (
        <span className="dt-cell-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {invoice.lineItemCount ?? invoice.lineItems?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('invoices.list.status'),
      width: 100,
      sortable: true,
      render: (invoice) => (
        <Badge variant={getInvoiceStatusVariant(invoice.status)}>
          {t(`invoices.status.${invoice.status}`)}
        </Badge>
      ),
    },
    {
      key: 'issueDate',
      label: t('invoices.list.issueDate'),
      icon: <Calendar size={12} />,
      sortable: true,
      render: (invoice) => (
        <span className="dt-cell-secondary">{formatDate(invoice.issueDate)}</span>
      ),
    },
    {
      key: 'dueDate',
      label: t('invoices.list.dueDate'),
      icon: <Calendar size={12} />,
      sortable: true,
      render: (invoice) => (
        <span className="dt-cell-secondary">{formatDate(invoice.dueDate)}</span>
      ),
    },
  ];

  return (
    <DataTable
      data={filtered}
      columns={columns}
      activeRowId={selectedId}
      onRowClick={(invoice) => onSelect(invoice.id)}
      onAddRow={onAdd}
      addRowLabel={t('invoices.builder.createInvoice')}
      emptyTitle={t('invoices.empty.noMatchingInvoices')}
      emptyDescription={t('invoices.empty.tryDifferentSearch')}
      emptyIcon={<FileText size={48} />}
      aggregations={[
        {
          label: t('invoices.list.totalAmount'),
          compute: () => formatCurrency(totalAmount),
        },
      ]}
    />
  );
}
