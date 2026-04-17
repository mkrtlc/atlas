import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, AlertTriangle, Trash2, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import { getExpenseStatusVariant } from '@atlas-platform/shared';
import {
  useExpenseReport,
  useSubmitExpenseReport,
  useDeleteExpenseReport,
  useApproveExpenseReport,
  useRefuseExpenseReport,
  useMyExpenses,
  useUpdateExpense,
} from '../../hooks';
import { useMyAppPermission } from '../../../../hooks/use-app-permissions';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { IconButton } from '../../../../components/ui/icon-button';
import { Skeleton } from '../../../../components/ui/skeleton';
import { QueryErrorState } from '../../../../components/ui/query-error-state';
import { StatusDot } from '../../../../components/ui/status-dot';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';
import { Modal } from '../../../../components/ui/modal';
import { Input } from '../../../../components/ui/input';
import { useToastStore } from '../../../../stores/toast-store';
import { formatDate, formatCurrency } from '../../../../lib/format';

interface ExpenseReportDetailProps {
  reportId: string;
  onBack: () => void;
}

const STATUS_STEPS = ['draft', 'submitted', 'approved', 'paid'] as const;

export function ExpenseReportDetail({ reportId, onBack }: ExpenseReportDetailProps) {
  const { t } = useTranslation();
  const { data: report, isLoading, isError, refetch } = useExpenseReport(reportId);
  const submitReport = useSubmitExpenseReport();
  const deleteReport = useDeleteExpenseReport();
  const approveReport = useApproveExpenseReport();
  const refuseReport = useRefuseExpenseReport();
  const updateExpense = useUpdateExpense();
  const { data: hrPerm } = useMyAppPermission('hr');
  const canApprove = hrPerm?.role === 'admin' || hrPerm?.role === 'editor';
  const addToast = useToastStore((s) => s.addToast);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseComment, setRefuseComment] = useState('');
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  const handleSubmit = () => {
    submitReport.mutate(reportId, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('hr.expenses.reports.submitted') });
      },
      onError: () => {
        addToast({ type: 'error', message: t('hr.expenses.reports.submitFailed') });
      },
    });
  };

  const handleDelete = () => {
    deleteReport.mutate(reportId, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('hr.expenses.reports.deleted') });
        setConfirmDeleteOpen(false);
        onBack();
      },
      onError: () => {
        addToast({ type: 'error', message: t('hr.expenses.reports.deleteFailed') });
        setConfirmDeleteOpen(false);
      },
    });
  };

  const handleApprove = () => {
    approveReport.mutate(reportId, {
      onSuccess: () => addToast({ type: 'success', message: t('hr.expenses.reports.approved') }),
      onError: () => addToast({ type: 'error', message: t('hr.expenses.reports.approveFailed') }),
    });
  };

  const handleRefuse = () => {
    refuseReport.mutate({ id: reportId, comment: refuseComment || undefined }, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('hr.expenses.reports.refused') });
        setRefuseOpen(false);
        setRefuseComment('');
      },
      onError: () => addToast({ type: 'error', message: t('hr.expenses.reports.refuseFailed') }),
    });
  };

  const handleAddExpense = (expenseId: string) => {
    updateExpense.mutate(
      { id: expenseId, reportId },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: t('hr.expenses.reports.expenseAdded') });
          setAddExpenseOpen(false);
        },
        onError: () => addToast({ type: 'error', message: t('hr.expenses.reports.expenseAddFailed') }),
      },
    );
  };

  const handleRemoveExpense = (expenseId: string) => {
    updateExpense.mutate(
      { id: expenseId, reportId: null },
      {
        onSuccess: () => addToast({ type: 'success', message: t('hr.expenses.reports.expenseRemoved') }),
        onError: () => addToast({ type: 'error', message: t('hr.expenses.reports.expenseRemoveFailed') }),
      },
    );
  };

  if (isError) return <QueryErrorState onRetry={refetch} />;
  if (isLoading || !report) {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <Skeleton height={300} />
      </div>
    );
  }

  const isRefused = report.status === 'refused';
  const isDraft = report.status === 'draft';
  const isSubmitted = report.status === 'submitted';
  const currentStepIndex = isRefused
    ? 1
    : STATUS_STEPS.indexOf(report.status as typeof STATUS_STEPS[number]);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)', maxWidth: 800 }}>
      {/* Back + title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-xl)',
      }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack}>
          {t('common.back')}
        </Button>
      </div>

      {/* Report header card */}
      <div style={{
        padding: 'var(--spacing-lg)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-primary)',
        marginBottom: 'var(--spacing-lg)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-md)',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
            }}>
              {report.title}
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              marginTop: 'var(--spacing-xs)',
            }}>
              <Badge variant={getExpenseStatusVariant(report.status)}>
                {t(`hr.expenses.status.${report.status}`)}
              </Badge>
              <span style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
              }}>
                {t('hr.expenses.reports.created')}: {formatDate(report.createdAt)}
              </span>
            </div>
          </div>

          <div style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatCurrency(report.totalAmount)}
          </div>
        </div>

        {/* Refused comment */}
        {isRefused && report.approverComment && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-md)',
            background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-md)',
          }}>
            <AlertTriangle size={14} style={{ color: 'var(--color-error)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-error)',
                fontFamily: 'var(--font-family)',
                marginBottom: 2,
              }}>
                {t('hr.expenses.reports.refusedReason')}
              </div>
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}>
                {report.approverComment}
              </div>
            </div>
          </div>
        )}

        {/* Status timeline */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          marginBottom: 'var(--spacing-md)',
        }}>
          {STATUS_STEPS.map((step, idx) => {
            const isActive = idx <= currentStepIndex && !isRefused;
            const isCurrent = idx === currentStepIndex && !isRefused;
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flex: 1 }}>
                <div style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: isActive ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)',
                  border: isCurrent ? '2px solid var(--color-accent-primary)' : 'none',
                  boxSizing: 'content-box',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  fontWeight: isCurrent ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                  fontFamily: 'var(--font-family)',
                }}>
                  {t(`hr.expenses.status.${step}`)}
                </span>
                {idx < STATUS_STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 1,
                    background: isActive ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {isDraft && (
            <>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleteReport.isPending}
              >
                {t('common.delete')}
              </Button>
              <div style={{ flex: 1 }} />
              <Button
                variant="primary"
                size="sm"
                icon={<Send size={14} />}
                onClick={handleSubmit}
                disabled={submitReport.isPending || (report.expenses?.length ?? 0) === 0}
              >
                {t('hr.expenses.reports.submit')}
              </Button>
            </>
          )}

          {isSubmitted && canApprove && (
            <>
              <div style={{ flex: 1 }} />
              <Button
                variant="secondary"
                size="sm"
                icon={<XCircle size={14} />}
                onClick={() => setRefuseOpen(true)}
                disabled={refuseReport.isPending}
              >
                {t('hr.expenses.reports.refuse')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle size={14} />}
                onClick={handleApprove}
                disabled={approveReport.isPending}
                style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
              >
                {t('hr.expenses.reports.approve')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Expenses list */}
      <div style={{
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-primary)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 'var(--spacing-md) var(--spacing-lg)',
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-sm)',
        }}>
          <span style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
          }}>
            {t('hr.expenses.reports.expenses')} ({report.expenses?.length ?? 0})
          </span>
          {isDraft && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setAddExpenseOpen(true)}
            >
              {t('hr.expenses.reports.addExpense')}
            </Button>
          )}
        </div>

        {(!report.expenses || report.expenses.length === 0) ? (
          <div style={{
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
          }}>
            {t('hr.expenses.reports.noExpenses')}
          </div>
        ) : (
          report.expenses.map((expense, idx) => (
            <div
              key={expense.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                borderBottom: idx < report.expenses!.length - 1 ? '1px solid var(--color-border-secondary)' : 'none',
              }}
            >
              <span style={{
                width: 80, flexShrink: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
              }}>
                {formatDate(expense.expenseDate)}
              </span>

              <span style={{
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
                width: 110, flexShrink: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}>
                {expense.categoryColor && <StatusDot color={expense.categoryColor} size={8} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {expense.categoryName || '\u2014'}
                </span>
              </span>

              <span style={{
                flex: 1, minWidth: 0,
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {expense.description}
              </span>

              <span style={{
                width: 90, flexShrink: 0,
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
                textAlign: 'right',
              }}>
                {formatCurrency(expense.amount)}
              </span>

              <span style={{ width: 80, flexShrink: 0 }}>
                <Badge variant={getExpenseStatusVariant(expense.status)}>
                  {t(`hr.expenses.status.${expense.status}`)}
                </Badge>
              </span>

              {isDraft && (
                <IconButton
                  icon={<X size={14} />}
                  label={t('hr.expenses.reports.removeExpense')}
                  size={24}
                  onClick={() => handleRemoveExpense(expense.id)}
                />
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t('hr.expenses.reports.confirmDeleteTitle')}
        description={t('hr.expenses.reports.confirmDeleteDesc')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={handleDelete}
      />

      {refuseOpen && (
        <Modal
          open={refuseOpen}
          onOpenChange={setRefuseOpen}
          width={420}
          title={t('hr.expenses.reports.refuseTitle')}
        >
          <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
              {t('hr.expenses.reports.refuseDesc')}
            </p>
            <Input
              value={refuseComment}
              onChange={(e) => setRefuseComment(e.target.value)}
              placeholder={t('hr.expenses.approvals.refuseComment')}
              size="sm"
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
              <Button variant="ghost" size="sm" onClick={() => setRefuseOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRefuse}
                disabled={refuseReport.isPending}
              >
                {t('hr.expenses.reports.refuse')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {addExpenseOpen && (
        <AddExpenseToReportModal
          open={addExpenseOpen}
          onOpenChange={setAddExpenseOpen}
          onPick={handleAddExpense}
        />
      )}
    </div>
  );
}

// ─── Add Expense picker modal ─────────────────────────────────────

function AddExpenseToReportModal({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (expenseId: string) => void;
}) {
  const { t } = useTranslation();
  const { data: allMyExpenses, isLoading } = useMyExpenses();

  // Only show expenses that are in draft status AND not already in a report.
  // Draft-only because adding a submitted expense to a fresh report is confusing —
  // the expense is already in the approval pipeline on its own.
  const assignableExpenses = useMemo(() => {
    if (!allMyExpenses) return [];
    return allMyExpenses.filter((e) => e.status === 'draft' && !e.reportId);
  }, [allMyExpenses]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      width={560}
      title={t('hr.expenses.reports.addExpenseTitle')}
    >
      <div style={{ padding: 'var(--spacing-lg)', maxHeight: 480, overflow: 'auto' }}>
        {isLoading ? (
          <Skeleton height={200} />
        ) : assignableExpenses.length === 0 ? (
          <div style={{
            padding: 'var(--spacing-xl)',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
          }}>
            {t('hr.expenses.reports.noAssignableExpenses')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {assignableExpenses.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() => onPick(expense.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-md)',
                  padding: 'var(--spacing-md)',
                  background: 'transparent',
                  border: '1px solid var(--color-border-secondary)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-family)',
                  color: 'var(--color-text-primary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  width: 90,
                  flexShrink: 0,
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-tertiary)',
                }}>
                  {formatDate(expense.expenseDate)}
                </span>
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 'var(--font-size-sm)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {expense.description}
                </span>
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatCurrency(expense.amount)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
