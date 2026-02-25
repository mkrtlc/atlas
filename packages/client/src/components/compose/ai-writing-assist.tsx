import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Check, RotateCcw } from 'lucide-react';
import { useWritingAssist } from '../../hooks/use-ai';
import type { CSSProperties } from 'react';

interface AIWritingAssistProps {
  subject?: string;
  existingDraft?: string;
  threadSnippet?: string;
  onAccept: (text: string) => void;
  onClose: () => void;
}

export function AIWritingAssist({
  subject,
  existingDraft,
  threadSnippet,
  onAccept,
  onClose,
}: AIWritingAssistProps) {
  const { output, loading, error, assist, clear, enabled } = useWritingAssist();
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll output as it streams
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  if (!enabled) return null;

  const handleSubmit = () => {
    if (!prompt.trim() || loading) return;
    assist(prompt.trim(), { subject, existingDraft, threadSnippet });
  };

  const handleAccept = () => {
    if (output) {
      onAccept(output);
      onClose();
    }
  };

  const handleRegenerate = () => {
    if (!prompt.trim() || loading) return;
    clear();
    assist(prompt.trim(), { subject, existingDraft, threadSnippet });
  };

  return (
    <div
      style={{
        border: '1px solid color-mix(in srgb, var(--color-accent-primary) 30%, var(--color-border-secondary))',
        borderRadius: 'var(--radius-lg)',
        background: 'color-mix(in srgb, var(--color-accent-primary) 3%, var(--color-bg-secondary))',
        overflow: 'hidden',
        fontFamily: 'var(--font-family)',
        marginBottom: 'var(--spacing-md)',
      }}
    >
      {/* Prompt input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          borderBottom: output || loading || error
            ? '1px solid color-mix(in srgb, var(--color-accent-primary) 15%, var(--color-border-secondary))'
            : 'none',
        }}
      >
        <Sparkles
          size={14}
          style={{
            color: 'var(--color-accent-primary)',
            flexShrink: 0,
            animation: loading ? 'pulse 1.5s ease-in-out infinite' : undefined,
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === 'Escape') {
              onClose();
            }
          }}
          placeholder="Describe what to write... (e.g. 'follow up on the proposal')"
          disabled={loading}
          style={{
            flex: 1,
            padding: '6px 0',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
        />
        {!output && (
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: !prompt.trim() || loading ? 'not-allowed' : 'pointer',
              padding: 4,
              color: prompt.trim() && !loading
                ? 'var(--color-accent-primary)'
                : 'var(--color-text-quaternary)',
              display: 'flex',
              alignItems: 'center',
              transition: 'color var(--transition-fast)',
            }}
            aria-label="Generate"
          >
            <Send size={14} />
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--color-text-tertiary)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Close AI assist"
        >
          <X size={14} />
        </button>
      </div>

      {/* Output area */}
      {(output || loading || error) && (
        <div style={{ padding: 'var(--spacing-md)' }}>
          {error && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error, #ef4444)' }}>
              {error}
            </div>
          )}
          {(output || loading) && (
            <div
              ref={outputRef}
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                lineHeight: 'var(--line-height-normal)',
                whiteSpace: 'pre-wrap',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {output}
              {loading && !output && (
                <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                  Writing...
                </span>
              )}
              {loading && output && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 14,
                    background: 'var(--color-accent-primary)',
                    marginLeft: 2,
                    animation: 'pulse 1s ease-in-out infinite',
                    verticalAlign: 'text-bottom',
                    borderRadius: 1,
                  }}
                />
              )}
            </div>
          )}

          {/* Action buttons */}
          {output && !loading && (
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-sm)',
                marginTop: 'var(--spacing-md)',
              }}
            >
              <button
                onClick={handleAccept}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  padding: '5px 14px',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-accent-primary)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'opacity var(--transition-fast)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Check size={13} />
                Accept
              </button>
              <button
                onClick={handleRegenerate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  padding: '5px 14px',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-secondary)',
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <RotateCcw size={13} />
                Regenerate
              </button>
              <button
                onClick={() => { clear(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  padding: '5px 14px',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-secondary)',
                  background: 'transparent',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                }}
              >
                Discard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
