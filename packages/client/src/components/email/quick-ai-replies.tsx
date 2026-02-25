import { useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useQuickReplies } from '../../hooks/use-ai';
import { injectAISparkle } from '../../lib/animations';

// Inject a shimmer keyframe for the loading text
const injectShimmer = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    injected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes atlasmail-ai-shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
    `;
    document.head.appendChild(style);
  };
})();

interface QuickAIRepliesProps {
  threadId: string;
  onSelectReply: (body: string) => void;
}

export function QuickAIReplies({ threadId, onSelectReply }: QuickAIRepliesProps) {
  const { replies, loading, error, generate, clear, enabled } = useQuickReplies();
  const prevThreadIdRef = useRef<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Auto-generate when thread changes
  useEffect(() => {
    if (!enabled) return;
    if (prevThreadIdRef.current === threadId) return;
    prevThreadIdRef.current = threadId;
    setSelectedIndex(null);
    generate(threadId);
  }, [enabled, threadId, generate]);

  useEffect(() => {
    return () => clear();
  }, [threadId, clear]);

  // Inject animation keyframes on mount
  useEffect(() => {
    injectAISparkle();
    injectShimmer();
  }, []);

  if (!enabled) return null;
  if (!loading && replies.length === 0 && !error) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: '0 var(--spacing-lg)',
        marginTop: 8,
        marginBottom: 'var(--spacing-sm)',
        flexWrap: 'wrap',
      }}
    >
      <Sparkles
        size={12}
        style={{
          flexShrink: 0,
          animation: loading
            ? 'atlasmail-ai-sparkle-color 2s ease-in-out infinite, atlasmail-ai-sparkle-rotate 0.8s ease-in-out infinite'
            : undefined,
          color: loading ? undefined : 'var(--color-accent-primary)',
        }}
      />

      {loading && (
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-family)',
            fontWeight: 500,
            background: 'linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #10b981, #f59e0b)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'atlasmail-ai-shimmer 2s linear infinite',
          }}
        >
          Generating replies...
        </span>
      )}

      {error && (
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-error, #ef4444)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {error}
        </span>
      )}

      {replies.map((reply, i) => (
        <button
          key={i}
          onClick={() => {
            setSelectedIndex(i);
            onSelectReply(reply.body);
          }}
          style={{
            padding: '4px 12px',
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-family)',
            fontWeight: 500,
            borderRadius: 'var(--radius-full)',
            border: selectedIndex === i
              ? '1px solid var(--color-accent-primary)'
              : '1px solid var(--color-border-secondary)',
            background: selectedIndex === i
              ? 'color-mix(in srgb, var(--color-accent-primary) 10%, transparent)'
              : 'var(--color-bg-tertiary)',
            color: selectedIndex === i
              ? 'var(--color-accent-primary)'
              : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (selectedIndex !== i) {
              e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
              e.currentTarget.style.color = 'var(--color-accent-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedIndex !== i) {
              e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
        >
          {reply.label}
        </button>
      ))}

      {replies.length > 0 && !loading && (
        <button
          onClick={() => {
            setSelectedIndex(null);
            clear();
            generate(threadId);
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
          aria-label="Regenerate replies"
        >
          <RefreshCw size={11} />
        </button>
      )}
    </div>
  );
}
