import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';

/**
 * Fallback shown when a list/dashboard query fails.
 * Use: `if (isError) return <QueryErrorState onRetry={refetch} />`
 */
export function QueryErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-2xl)',
        gap: 'var(--spacing-md)',
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-family)',
        textAlign: 'center',
      }}
    >
      <AlertCircle size={32} style={{ color: 'var(--color-error)' }} />
      <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
        {title ?? t('common.loadFailed', 'Could not load')}
      </span>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', maxWidth: 320 }}>
        {description ?? t('common.loadFailedDescription', 'Something went wrong while loading this data. Check your connection and try again.')}
      </span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry', 'Retry')}
        </Button>
      )}
    </div>
  );
}
