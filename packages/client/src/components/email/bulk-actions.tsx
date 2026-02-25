import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, Trash2, Star, Mail, MailOpen, Check, Minus } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';
import { ConfirmDialog } from '../ui/confirm-dialog';

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onStar: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onClearSelection: () => void;
  /** Disable action buttons while a mutation is in-flight */
  busy?: boolean;
}

interface BulkActionButtonProps {
  icon: typeof Archive;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

function BulkActionButton({ icon: Icon, label, onClick, destructive = false, disabled = false }: BulkActionButtonProps) {
  return (
    <Tooltip content={label} side="bottom">
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-label={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          border: 'none',
          borderRadius: 'var(--radius-md)',
          background: 'transparent',
          color: destructive ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          flexShrink: 0,
          transition: 'background var(--transition-normal), color var(--transition-normal)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-surface-hover)';
          e.currentTarget.style.color = destructive
            ? 'var(--color-error)'
            : 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = destructive
            ? 'var(--color-text-tertiary)'
            : 'var(--color-text-secondary)';
        }}
      >
        <Icon size={16} />
      </button>
    </Tooltip>
  );
}

export function BulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onArchive,
  onTrash,
  onStar,
  onMarkRead,
  onMarkUnread,
  onClearSelection,
  busy = false,
}: BulkActionsProps) {
  const { t } = useTranslation();
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;
  const [confirmTrash, setConfirmTrash] = useState(false);

  return (
    <>
      {/* Select all checkbox */}
      <Tooltip content={allSelected ? t('bulk.deselectAll') : t('bulk.selectAll')} side="bottom">
        <button
          onClick={onSelectAll}
          aria-label={allSelected ? t('bulk.deselectAllConversations') : t('bulk.selectAllConversations')}
          aria-pressed={allSelected}
          style={{
            width: 16,
            height: 16,
            border: allSelected || isIndeterminate
              ? 'none'
              : '1.5px solid var(--color-border-primary)',
            borderRadius: 4,
            background: allSelected || isIndeterminate
              ? 'var(--color-accent-primary)'
              : 'transparent',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background var(--transition-normal), border-color var(--transition-normal)',
          }}
          onMouseEnter={(e) => {
            if (!allSelected && !isIndeterminate) {
              e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!allSelected && !isIndeterminate) {
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
            }
          }}
        >
          {allSelected && <Check size={10} color="#ffffff" strokeWidth={3} />}
          {isIndeterminate && <Minus size={10} color="#ffffff" strokeWidth={3} />}
        </button>
      </Tooltip>

      {/* Selected count label */}
      <span
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-family)',
        }}
      >
        {t('common.selected', { count: selectedCount })}
      </span>

      {/* Divider */}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 18,
          background: 'var(--color-border-primary)',
          flexShrink: 0,
        }}
      />

      <BulkActionButton icon={Archive} label={t('bulk.archiveSelected')} onClick={onArchive} disabled={busy} />
      <BulkActionButton icon={Trash2} label={t('bulk.trashSelected')} onClick={() => setConfirmTrash(true)} destructive disabled={busy} />
      <BulkActionButton icon={Star} label={t('bulk.starSelected')} onClick={onStar} disabled={busy} />
      <BulkActionButton icon={Mail} label={t('bulk.markAsUnread')} onClick={onMarkUnread} disabled={busy} />
      <BulkActionButton icon={MailOpen} label={t('bulk.markAsRead')} onClick={onMarkRead} disabled={busy} />

      <ConfirmDialog
        open={confirmTrash}
        onOpenChange={setConfirmTrash}
        title={t('bulk.trashConfirm', { count: selectedCount })}
        description={t('bulk.trashDescription')}
        confirmLabel={t('bulk.moveToTrash')}
        onConfirm={onTrash}
      />
    </>
  );
}
