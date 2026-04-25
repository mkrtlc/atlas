import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { useUpdateTimeEntry, useDeleteTimeEntry } from '../hooks';
import type { RecentTimeEntry } from '../hooks';
import { useToastStore } from '../../../stores/toast-store';
import { useAppActions } from '../../../hooks/use-app-permissions';
import { useAuthStore } from '../../../stores/auth-store';

export function TimeEntryDetailModal({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: RecentTimeEntry | null;
}) {
  const { t } = useTranslation();
  const updateTimeEntry = useUpdateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();
  const { addToast } = useToastStore();
  const { canDelete, canEdit } = useAppActions('work');
  const currentUserId = useAuthStore((s) => s.account?.userId ?? null);

  // Parent remounts this component via `key={entry.id}`, so initial state
  // is always in sync with the entry prop without a useEffect.
  const [hours, setHours] = useState(entry ? String(entry.hours) : '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [isBillable, setIsBillable] = useState(entry?.isBillable ?? true);
  const [date, setDate] = useState(entry?.date ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!entry) return null;

  const canEditThis = canDelete || (canEdit && entry.userId === currentUserId);

  const handleSave = () => {
    const parsed = parseFloat(hours);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    updateTimeEntry.mutate(
      {
        id: entry.id,
        updatedAt: entry.updatedAt,
        hours: parsed,
        description: description.trim() || null,
        date,
        isBillable,
      },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: t('work.time.saved') });
          onOpenChange(false);
        },
      },
    );
  };

  const handleDelete = () => {
    deleteTimeEntry.mutate(entry.id, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('work.time.deleted') });
        setConfirmDelete(false);
        onOpenChange(false);
      },
    });
  };

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} width={460} title={t('work.time.editTitle')}>
        <Modal.Header title={`${t('work.time.editTitle')} — ${entry.projectName}`} />
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <Input
              label={t('work.time.hoursLabel')}
              type="number"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              size="md"
              autoFocus
              disabled={!canEditThis}
            />
            <Input
              label={t('work.time.descriptionLabel')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="md"
              disabled={!canEditThis}
            />
            <Input
              label={t('work.time.dateLabel')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              size="md"
              disabled={!canEditThis}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
              <input
                type="checkbox"
                checked={isBillable}
                onChange={(e) => setIsBillable(e.target.checked)}
                disabled={!canEditThis}
              />
              {t('work.time.billableLabel')}
            </label>
          </div>
        </Modal.Body>
        <Modal.Footer>
          {canEditThis && (
            <Button variant="danger" size="md" onClick={() => setConfirmDelete(true)} style={{ marginRight: 'auto' }}>
              {t('common.delete')}
            </Button>
          )}
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!canEditThis || updateTimeEntry.isPending}
          >
            {t('common.save')}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('work.time.deleteConfirmTitle')}
        description={t('work.time.deleteConfirmDescription')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
