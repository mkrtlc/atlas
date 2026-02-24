import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailMinus } from 'lucide-react';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useUnsubscribe } from '../../hooks/use-threads';
import { useToastStore } from '../../stores/toast-store';
import type { Email } from '@atlasmail/shared';

interface UnsubscribeButtonProps {
  emails: Email[];
  threadId: string;
}

export function UnsubscribeButton({ emails, threadId }: UnsubscribeButtonProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { mutate: unsubscribe } = useUnsubscribe();
  const { addToast } = useToastStore();

  const hasListUnsubscribe = emails.some((e) => !!e.listUnsubscribe);

  if (!hasListUnsubscribe) {
    return null;
  }

  const handleConfirm = () => {
    unsubscribe(threadId, {
      onSuccess: () => {
        addToast({
          type: 'success',
          message: t('email.unsubscribed'),
          duration: 3000,
        });
      },
      onError: () => {
        addToast({
          type: 'error',
          message: t('common.somethingWentWrong'),
          duration: 4000,
        });
      },
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={t('email.unsubscribe')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          marginTop: 'var(--spacing-xs)',
          marginLeft: 'var(--spacing-xs)',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          background: hovered ? 'var(--color-surface-hover)' : 'transparent',
          border: '1px solid var(--color-border-primary)',
          borderRadius: 'var(--radius-lg)',
          color: hovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-family)',
          cursor: 'pointer',
          transition: 'background var(--transition-normal), color var(--transition-normal)',
        }}
      >
        <MailMinus size={13} />
        {t('email.unsubscribe')}
      </button>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={t('email.unsubscribeConfirm')}
        description={t('email.unsubscribeDescription')}
        confirmLabel={t('email.unsubscribe')}
        destructive={false}
        onConfirm={handleConfirm}
      />
    </>
  );
}
