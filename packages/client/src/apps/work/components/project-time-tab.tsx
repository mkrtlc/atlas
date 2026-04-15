import { Clock, Trash2, Pencil, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useTimeEntries, useUpdateTimeEntry, useDeleteTimeEntry } from '../hooks';
import { IconButton } from '../../../components/ui/icon-button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { formatDate, formatNumber } from '../../../lib/format';
import { useToastStore } from '../../../stores/toast-store';
import { useAppActions } from '../../../hooks/use-app-permissions';
import { useAuthStore } from '../../../stores/auth-store';
import type { TimeEntry } from '../hooks';

interface Props {
  projectId: string;
}

export function ProjectTimeTab({ projectId }: Props) {
  const { canDelete, canEdit } = useAppActions('work');
  const currentUserId = useAuthStore((s) => s.account?.userId ?? null);
  const { addToast } = useToastStore();
  const { data, isLoading } = useTimeEntries({ projectId });
  const updateTimeEntry = useUpdateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const entries = data?.entries ?? [];

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const billableHours = entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hours, 0);

  const handleStartEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditHours(String(entry.hours));
    setEditDescription(entry.description || '');
  };

  const handleSaveEdit = (entryId: string, updatedAt: string) => {
    updateTimeEntry.mutate(
      { id: entryId, updatedAt, hours: parseFloat(editHours) || 0, description: editDescription.trim() || null },
      {
        onSuccess: () => {
          setEditingId(null);
          addToast({ type: 'success', message: 'Time entry saved' });
        },
      },
    );
  };

  const handleDelete = (entryId: string) => {
    deleteTimeEntry.mutate(entryId, {
      onSuccess: () => {
        setConfirmDeleteId(null);
        addToast({ type: 'success', message: 'Time entry deleted' });
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={44} borderRadius="var(--radius-md)" />)}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--color-text-tertiary)' }}>
        <Clock size={32} />
        <span style={{ fontSize: 'var(--font-size-sm)' }}>No time entries for this project</span>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: 860 }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        <span>
          <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          <strong style={{ color: 'var(--color-text-primary)' }}>{formatNumber(totalHours, 1)}h</strong> total
        </span>
        <span>
          <strong style={{ color: 'var(--color-text-primary)' }}>{formatNumber(billableHours, 1)}h</strong> billable
        </span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>{entries.length} entries</span>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px 60px', gap: 'var(--spacing-sm)', padding: '4px var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'var(--font-weight-medium)' }}>
        <span>Description</span>
        <span style={{ textAlign: 'right' }}>Hours</span>
        <span>Date</span>
        <span>Billing</span>
        <span />
      </div>

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 90px 90px 60px',
              gap: 'var(--spacing-sm)',
              alignItems: 'center',
              padding: '6px var(--spacing-sm)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-secondary)',
            }}
          >
            {editingId === entry.id ? (
              <>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  size="sm"
                />
                <Input
                  type="number"
                  step="0.25"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  size="sm"
                  style={{ textAlign: 'right' }}
                />
                <span />
                <span />
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconButton icon={<Check size={12} />} label="Save" size={22} onClick={() => handleSaveEdit(entry.id, entry.updatedAt)} />
                  <IconButton icon={<X size={12} />} label="Cancel" size={22} onClick={() => setEditingId(null)} />
                </div>
              </>
            ) : (
              <>
                <span style={{ fontSize: 'var(--font-size-sm)', color: entry.description ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.description || 'No description'}
                </span>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                  {formatNumber(entry.hours, 1)}h
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  {formatDate(entry.date)}
                </span>
                <span>
                  <Badge variant={entry.billingStatus === 'paid' ? 'success' : entry.billingStatus === 'billed' ? 'primary' : entry.isBillable ? 'warning' : 'default'}>
                    {entry.billingStatus === 'unbilled' && entry.isBillable ? 'unbilled' : entry.billingStatus}
                  </Badge>
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {(canDelete || (canEdit && entry.userId === currentUserId)) && (
                    <>
                      <IconButton icon={<Pencil size={11} />} label="Edit" size={20} onClick={() => handleStartEdit(entry)} />
                      <IconButton icon={<Trash2 size={11} />} label="Delete" size={20} destructive onClick={() => setConfirmDeleteId(entry.id)} />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        title="Delete time entry"
        description="Are you sure you want to delete this time entry? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
      />
    </div>
  );
}
