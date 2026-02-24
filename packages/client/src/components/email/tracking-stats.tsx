import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, MousePointerClick, ChevronDown, ChevronUp } from 'lucide-react';
import type { EmailTrackingRecord, TrackingEvent } from '@atlasmail/shared';
import type { CSSProperties } from 'react';

interface TrackingStatsProps {
  record: EmailTrackingRecord;
  events: TrackingEvent[];
}

function formatTrackingDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  }) + ' at ' + d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncateUrl(url: string, max = 40): string {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + '...' : display;
  } catch {
    return url.length > max ? url.slice(0, max) + '...' : url;
  }
}

export function TrackingStats({ record, events }: TrackingStatsProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (record.openCount === 0 && record.clickCount === 0) return null;

  const relevantEvents = events.filter((e) => e.trackingId === record.trackingId);

  return (
    <div
      style={{
        marginTop: 'var(--spacing-md)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-secondary)',
      }}
    >
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'var(--font-family)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <Eye size={13} style={{ color: 'var(--color-accent-primary)' }} />
          <span style={statTextStyle}>
            {t('tracking.opened', { count: record.openCount })}
          </span>
        </div>

        {record.firstOpenedAt && (
          <>
            <span style={dotStyle} aria-hidden="true">&middot;</span>
            <span style={statTextStyle}>
              {t('tracking.firstOpened', { date: formatTrackingDate(record.firstOpenedAt) })}
            </span>
          </>
        )}

        {record.clickCount > 0 && (
          <>
            <span style={dotStyle} aria-hidden="true">&middot;</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <MousePointerClick size={12} style={{ color: 'var(--color-accent-primary)' }} />
              <span style={statTextStyle}>
                {t('tracking.linkClick', { count: record.clickCount })}
              </span>
            </div>
          </>
        )}

        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {expanded
            ? <ChevronUp size={13} style={{ color: 'var(--color-text-tertiary)' }} />
            : <ChevronDown size={13} style={{ color: 'var(--color-text-tertiary)' }} />}
        </div>
      </button>

      {/* Expanded event timeline */}
      {expanded && relevantEvents.length > 0 && (
        <div
          style={{
            marginTop: 'var(--spacing-sm)',
            paddingTop: 'var(--spacing-sm)',
            borderTop: '1px solid var(--color-border-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-xs)',
          }}
        >
          {relevantEvents.map((event) => (
            <div
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              {event.eventType === 'open' ? (
                <Eye size={11} style={{ flexShrink: 0, color: 'var(--color-text-tertiary)' }} />
              ) : (
                <MousePointerClick size={11} style={{ flexShrink: 0, color: 'var(--color-text-tertiary)' }} />
              )}
              <span>
                {event.eventType === 'open' ? t('tracking.openedEvent') : t('tracking.clicked')}
                {event.eventType === 'click' && event.linkUrl && (
                  <> &ldquo;{truncateUrl(event.linkUrl)}&rdquo;</>
                )}
              </span>
              <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                {formatTrackingDate(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const statTextStyle: CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family)',
  whiteSpace: 'nowrap',
};

const dotStyle: CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontSize: 'var(--font-size-xs)',
};
