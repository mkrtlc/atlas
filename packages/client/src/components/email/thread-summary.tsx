import { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react';
import { useThreadSummary } from '../../hooks/use-ai';
import type { CSSProperties } from 'react';

interface ThreadSummaryProps {
  threadId: string;
  messageCount: number;
}

export function ThreadSummary({ threadId, messageCount }: ThreadSummaryProps) {
  const { summary, loading, error, summarize, clear, enabled } = useThreadSummary();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevThreadIdRef = useRef<string | null>(null);

  // Auto-summarize when thread changes (3+ messages)
  useEffect(() => {
    if (!enabled || messageCount < 3) return;
    if (prevThreadIdRef.current === threadId) return;
    prevThreadIdRef.current = threadId;
    setDismissed(false);
    setCollapsed(false);
    summarize(threadId);
  }, [enabled, threadId, messageCount, summarize]);

  // Clear when thread changes
  useEffect(() => {
    return () => clear();
  }, [threadId, clear]);

  if (!enabled || messageCount < 3 || dismissed) return null;
  if (!summary && !loading && !error) return null;

  return (
    <div
      style={{
        margin: 'var(--spacing-md) var(--spacing-lg) 0',
        padding: 'var(--spacing-md) var(--spacing-lg)',
        background: 'color-mix(in srgb, var(--color-accent-primary) 5%, var(--color-bg-tertiary))',
        border: '1px solid color-mix(in srgb, var(--color-accent-primary) 15%, var(--color-border-secondary))',
        borderRadius: 'var(--radius-lg)',
        fontFamily: 'var(--font-family)',
        transition: 'all var(--transition-normal)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          cursor: summary ? 'pointer' : 'default',
          userSelect: 'none',
        }}
        onClick={() => summary && setCollapsed(!collapsed)}
      >
        <Sparkles
          size={14}
          style={{
            color: 'var(--color-accent-primary)',
            flexShrink: 0,
            animation: loading ? 'pulse 1.5s ease-in-out infinite' : undefined,
          }}
        />
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            color: 'var(--color-accent-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          AI summary
        </span>
        <div style={{ flex: 1 }} />
        {summary && !loading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clear();
              summarize(threadId);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: 'var(--color-text-tertiary)',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Regenerate summary"
          >
            <RefreshCw size={12} />
          </button>
        )}
        {summary && (
          collapsed
            ? <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            : <ChevronUp size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
            clear();
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            color: 'var(--color-text-tertiary)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Dismiss summary"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div style={{ marginTop: 'var(--spacing-sm)' }}>
          {loading && (
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontStyle: 'italic',
              }}
            >
              Summarizing thread...
            </div>
          )}
          {error && (
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-error, #ef4444)',
              }}
            >
              {error}
            </div>
          )}
          {summary && (
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 'var(--line-height-normal)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {summary}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
