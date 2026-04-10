import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import type { InvoicePayment } from '@atlas-platform/shared';
import { formatDate } from '../../../lib/format';
import { Badge } from '../../../components/ui/badge';
import { IconButton } from '../../../components/ui/icon-button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { useInvoicePayments, useDeletePayment } from '../hooks';
import { useToastStore } from '../../../stores/toast-store';
import { RecordPaymentModal } from './record-payment-modal';

interface InvoicePaymentsListProps {
  invoiceId: string;
  invoiceNumber: string;
  currency: string;
  total: number;
  balanceDue: number;
  isDraft?: boolean;
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getMethodLabel(method: string | null | undefined, t: (k: string) => string): string {
  if (!method) return '';
  switch (method) {
    case 'cash': return t('invoices.payments.methodCash');
    case 'check': return t('invoices.payments.methodCheck');
    case 'bank_transfer': return t('invoices.payments.methodBankTransfer');
    case 'card': return t('invoices.payments.methodCard');
    case 'other': return t('invoices.payments.methodOther');
    default: return method;
  }
}

export function InvoicePaymentsList({
  invoiceId,
  invoiceNumber,
  currency,
  total,
  balanceDue,
  isDraft = false,
}: InvoicePaymentsListProps) {
  const { t } = useTranslation();
  const { data: payments, isLoading } = useInvoicePayments(invoiceId);
  const deletePayment = useDeletePayment();
  const addToast = useToastStore((s) => s.addToast);
  const [editingPayment, setEditingPayment] = useState<InvoicePayment | undefined>(undefined);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<InvoicePayment | undefined>(undefined);

  const totalPaid = useMemo(() => {
    if (!payments) return 0;
    return payments.reduce((sum, p) => {
      const amt = Number(p.amount) || 0;
      return p.type === 'refund' ? sum - amt : sum + amt;
    }, 0);
  }, [payments]);

  // Don't render if draft and no payments yet
  if (isDraft && (!payments || payments.length === 0)) {
    return null;
  }

  const sectionHeaderLabel: CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
    color: 'var(--color-text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontFamily: 'var(--font-family)',
  };

  const handleEdit = (payment: InvoicePayment) => {
    setEditingPayment(payment);
    setEditModalOpen(true);
  };

  const handleEditModalClose = (open: boolean) => {
    setEditModalOpen(open);
    if (!open) {
      // Clear after close animation; simple clear is fine
      setTimeout(() => setEditingPayment(undefined), 0);
    }
  };

  const handleConfirmDelete = () => {
    if (!paymentToDelete) return;
    deletePayment.mutate(
      { paymentId: paymentToDelete.id, invoiceId },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: t('invoices.payments.deleteSuccess') });
        },
        onError: (err: unknown) => {
          const e = err as { response?: { data?: { error?: string } }; message?: string };
          addToast({
            type: 'error',
            message: e?.response?.data?.error ?? e?.message ?? t('common.error'),
          });
        },
      },
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={sectionHeaderLabel}>
          {payments && payments.length > 0
            ? t('invoices.payments.sectionTitleCount', { count: payments.length })
            : t('invoices.payments.sectionTitle')}
        </span>
        {payments && payments.length > 0 && (
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t('invoices.payments.totalPaidLabel')}: {formatAmount(totalPaid, currency)}
          </span>
        )}
      </div>

      <div style={{ marginTop: 'var(--spacing-sm)' }}>
        {isLoading ? (
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              padding: 'var(--spacing-sm) 0',
            }}
          >
            {t('common.loading')}
          </div>
        ) : !payments || payments.length === 0 ? (
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              padding: 'var(--spacing-sm) 0',
            }}
          >
            {t('invoices.payments.emptyState')}
          </div>
        ) : (
          payments.map((p) => {
            const amountNum = Number(p.amount) || 0;
            const isRefund = p.type === 'refund';
            const methodLabel = getMethodLabel(p.method, t);
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  padding: 'var(--spacing-xs) 0',
                  borderBottom: '1px solid var(--color-border-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-text-secondary)',
                    width: 100,
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatDate(p.paymentDate)}
                </span>
                <span style={{ flexShrink: 0 }}>
                  <Badge variant={isRefund ? 'warning' : 'success'}>
                    {isRefund
                      ? t('invoices.payments.refundLabel')
                      : t('invoices.payments.paymentLabel')}
                  </Badge>
                </span>
                <span
                  style={{
                    color: 'var(--color-text-primary)',
                    fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                    flex: 1,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {isRefund ? '-' : ''}
                  {formatAmount(amountNum, currency)}
                </span>
                <span
                  style={{
                    color: 'var(--color-text-tertiary)',
                    width: 110,
                    flexShrink: 0,
                    textAlign: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={methodLabel}
                >
                  {methodLabel}
                </span>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <IconButton
                    icon={<Pencil size={13} />}
                    label={t('invoices.payments.editAction')}
                    size={26}
                    onClick={() => handleEdit(p)}
                  />
                  <IconButton
                    icon={<Trash2 size={13} />}
                    label={t('invoices.payments.deleteAction')}
                    size={26}
                    destructive
                    onClick={() => setPaymentToDelete(p)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <RecordPaymentModal
        open={editModalOpen}
        onOpenChange={handleEditModalClose}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        currency={currency}
        total={total}
        balanceDue={balanceDue}
        editingPayment={editingPayment}
      />

      <ConfirmDialog
        open={!!paymentToDelete}
        onOpenChange={(open) => {
          if (!open) setPaymentToDelete(undefined);
        }}
        title={t('invoices.payments.deleteConfirmTitle')}
        description={t('invoices.payments.deleteConfirmMessage')}
        confirmLabel={t('invoices.payments.deleteConfirmButton')}
        destructive
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
