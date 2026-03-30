import { useTranslation } from 'react-i18next';
import { MemoryStick } from 'lucide-react';
import { useSystemMetrics } from '../hooks';
import { formatBytes } from '../../../lib/format';
import type { AppWidgetProps } from '../../../config/app-manifest.client';

function gaugeColor(percent: number): string {
  if (percent >= 85) return '#ef4444';
  if (percent >= 60) return '#f59e0b';
  return '#10b981';
}

export function MemoryWidget(_props: AppWidgetProps) {
  const { t } = useTranslation();
  const { data: metrics } = useSystemMetrics();
  const usage = metrics?.memory.usagePercent ?? 0;
  const color = gaugeColor(usage);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--spacing-lg)',
        gap: 'var(--spacing-sm)',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <MemoryStick size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
          {t('system.memoryUsage')}
        </span>
      </div>

      {/* Big number */}
      <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', lineHeight: 1 }}>
        {usage.toFixed(1)}%
      </div>

      {/* Progress bar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 'var(--spacing-xs)' }}>
        <div style={{
          height: 8,
          background: 'var(--color-bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          border: '1px solid var(--color-border-secondary)',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, usage)}%`,
            background: color,
            borderRadius: 'var(--radius-sm)',
            transition: 'width 0.5s ease',
          }} />
        </div>
        {metrics && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
          </div>
        )}
      </div>
    </div>
  );
}
