import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, GripVertical } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { IconButton } from '../../../components/ui/icon-button';
import { Button } from '../../../components/ui/button';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

interface Props {
  lineItems: LineItem[];
  /** Full replacement — parent sends this whole array to the server. */
  onReplaceLineItems: (next: LineItem[]) => void;
}

function rowTotal(li: LineItem): number {
  const tax = li.taxRate ?? 0;
  return (li.quantity || 0) * (li.unitPrice || 0) * (1 + tax / 100);
}

export function InvoiceLineItemsTable({ lineItems, onReplaceLineItems }: Props) {
  const { t } = useTranslation();
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);

  const patchRow = (index: number, patch: Partial<LineItem>) => {
    const next = lineItems.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onReplaceLineItems(next);
  };

  const addRow = () => {
    onReplaceLineItems([
      ...lineItems,
      { description: '', quantity: 1, unitPrice: 0, taxRate: 0 },
    ]);
  };

  const deleteRow = (index: number) => {
    onReplaceLineItems(lineItems.filter((_, i) => i !== index));
  };

  const moveRow = (from: number, to: number) => {
    if (from === to || to < 0 || to >= lineItems.length) return;
    const next = [...lineItems];
    const [picked] = next.splice(from, 1);
    next.splice(to, 0, picked);
    onReplaceLineItems(next);
  };

  return (
    <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border-secondary)' }}>
      <div style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 'var(--spacing-sm)',
      }}>
        {t('invoices.detail.sectionLineItems')}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '24px minmax(140px, 1fr) 70px 90px 60px 90px 28px',
        columnGap: 'var(--spacing-xs)',
        rowGap: 'var(--spacing-xs)',
        alignItems: 'center',
      }}>
        <span />
        <HeaderCell>{t('invoices.detail.colDescription')}</HeaderCell>
        <HeaderCell align="right">{t('invoices.detail.colQuantity')}</HeaderCell>
        <HeaderCell align="right">{t('invoices.detail.colUnitPrice')}</HeaderCell>
        <HeaderCell align="right">{t('invoices.detail.colTaxRate')}</HeaderCell>
        <HeaderCell align="right">{t('invoices.detail.colRowTotal')}</HeaderCell>
        <span />

        {lineItems.map((row, i) => (
          <Row
            key={i}
            row={row}
            index={i}
            isDragSource={dragFromIndex === i}
            onDragStart={() => setDragFromIndex(i)}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => { if (dragFromIndex != null) moveRow(dragFromIndex, i); setDragFromIndex(null); }}
            onDragEnd={() => setDragFromIndex(null)}
            onDescriptionBlur={(v) => { if (v !== row.description) patchRow(i, { description: v }); }}
            onQuantityBlur={(v) => { if (v !== row.quantity) patchRow(i, { quantity: v }); }}
            onUnitPriceBlur={(v) => { if (v !== row.unitPrice) patchRow(i, { unitPrice: v }); }}
            onTaxRateBlur={(v) => { if (v !== (row.taxRate ?? 0)) patchRow(i, { taxRate: v }); }}
            onDelete={() => deleteRow(i)}
            reorderLabel={t('invoices.detail.reorderLine')}
            deleteLabel={t('invoices.detail.deleteLine')}
          />
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={addRow} style={{ marginTop: 'var(--spacing-sm)' }}>
        {t('invoices.detail.addLine')}
      </Button>
    </div>
  );
}

function HeaderCell({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <span style={{
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-tertiary)',
      fontWeight: 'var(--font-weight-medium)',
      textAlign: align,
    }}>
      {children}
    </span>
  );
}

interface RowProps {
  row: LineItem;
  index: number;
  isDragSource: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onDescriptionBlur: (v: string) => void;
  onQuantityBlur: (v: number) => void;
  onUnitPriceBlur: (v: number) => void;
  onTaxRateBlur: (v: number) => void;
  onDelete: () => void;
  reorderLabel: string;
  deleteLabel: string;
}

function Row(p: RowProps) {
  return (
    <>
      <span
        draggable
        onDragStart={p.onDragStart}
        onDragOver={p.onDragOver}
        onDrop={p.onDrop}
        onDragEnd={p.onDragEnd}
        aria-label={p.reorderLabel}
        style={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
          opacity: p.isDragSource ? 0.4 : 1,
        }}
      >
        <GripVertical size={13} />
      </span>
      <Input
        size="sm"
        defaultValue={p.row.description}
        onBlur={(e) => p.onDescriptionBlur(e.currentTarget.value)}
      />
      <Input
        size="sm"
        type="number"
        defaultValue={String(p.row.quantity ?? 0)}
        style={{ textAlign: 'right' }}
        onBlur={(e) => p.onQuantityBlur(Number(e.currentTarget.value) || 0)}
      />
      <Input
        size="sm"
        type="number"
        defaultValue={String(p.row.unitPrice ?? 0)}
        style={{ textAlign: 'right' }}
        onBlur={(e) => p.onUnitPriceBlur(Number(e.currentTarget.value) || 0)}
      />
      <Input
        size="sm"
        type="number"
        defaultValue={String(p.row.taxRate ?? 0)}
        style={{ textAlign: 'right' }}
        onBlur={(e) => p.onTaxRateBlur(Number(e.currentTarget.value) || 0)}
      />
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
        paddingInline: 'var(--spacing-xs)',
      }}>
        {rowTotal(p.row).toFixed(2)}
      </span>
      <IconButton
        icon={<Trash2 size={13} />}
        label={p.deleteLabel}
        size={22}
        onClick={p.onDelete}
      />
    </>
  );
}
