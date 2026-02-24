import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEmailStore } from '../../stores/email-store';
import { useThread } from '../../hooks/use-threads';
import { useThreadTracking } from '../../hooks/use-tracking';
import { useMediaQuery } from '../../hooks/use-media-query';
import { EmailActions } from '../email/email-actions';
import { EmailMessage } from '../email/email-message';
import { InlineReply } from '../email/inline-reply';
import { UnsubscribeButton } from '../email/unsubscribe-button';
import { Kbd } from '../ui/kbd';
import { EmptyState } from '../ui/empty-state';
import { ReadingPaneSkeleton } from '../ui/skeleton';
import type { CSSProperties } from 'react';

// Number of collapsed earlier messages above which we show "Show N earlier messages" toggle
const COLLAPSED_PREVIEW_THRESHOLD = 3;

function ReadingPaneEmptyState() {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--spacing-md)',
        fontFamily: 'var(--font-family)',
        userSelect: 'none',
      }}
    >
      <EmptyState
        type="inbox"
        title={t('inbox.selectConversation')}
        description={t('inbox.chooseThread')}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          marginTop: 'calc(var(--spacing-xs) * -1)',
        }}
      >
        <span>{t('inbox.useNavigationHint')}</span>
        <Kbd shortcut="j" variant="inline" />
        <span>/</span>
        <Kbd shortcut="k" variant="inline" />
        <span>{t('inbox.toNavigate')}</span>
        <Kbd shortcut="Enter" variant="inline" />
        <span>{t('inbox.toOpen')}</span>
      </div>
    </div>
  );
}

export function ReadingPane() {
  const { activeThreadId, setActiveThread } = useEmailStore();
  const { data: thread, isLoading } = useThread(activeThreadId);
  const { data: trackingStats } = useThreadTracking(activeThreadId);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t } = useTranslation();

  // Set of expanded email IDs — initialised with only the last email's ID
  const [expandedEmailIds, setExpandedEmailIds] = useState<Set<string>>(new Set());

  // Whether the "show earlier messages" fold has been opened
  const [showEarlierMessages, setShowEarlierMessages] = useState(false);

  // Re-initialise collapse state whenever the active thread changes
  useEffect(() => {
    if (!thread?.emails?.length) {
      setExpandedEmailIds(new Set());
      setShowEarlierMessages(false);
      return;
    }
    const lastEmail = thread.emails[thread.emails.length - 1];
    setExpandedEmailIds(new Set([lastEmail.id]));
    setShowEarlierMessages(false);
    // We only want this to run when the thread ID changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id]);

  const handleToggleExpand = useCallback((emailId: string) => {
    setExpandedEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }, []);

  const emails = thread?.emails || [];

  const handleExpandAll = useCallback(() => {
    setExpandedEmailIds(new Set(emails.map(e => e.id)));
    setShowEarlierMessages(true);
  }, [emails]);

  const handleCollapseAll = useCallback(() => {
    // Keep only the latest message expanded
    const last = emails[emails.length - 1];
    setExpandedEmailIds(last ? new Set([last.id]) : new Set());
  }, [emails]);

  if (!activeThreadId) {
    return <ReadingPaneEmptyState />;
  }

  if (isLoading || !thread) {
    return <ReadingPaneSkeleton />;
  }

  const earlierEmails = emails.slice(0, -1);
  const lastEmail = emails[emails.length - 1];

  // How many collapsed earlier messages exist
  const collapsedEarlierCount = earlierEmails.filter((e) => !expandedEmailIds.has(e.id)).length;

  const allExpanded = emails.length > 1 && emails.every(e => expandedEmailIds.has(e.id));

  // When there are more than COLLAPSED_PREVIEW_THRESHOLD earlier messages we hide
  // all but the last COLLAPSED_PREVIEW_THRESHOLD behind a "Show N earlier" button.
  const hasHiddenEarlier =
    !showEarlierMessages && earlierEmails.length > COLLAPSED_PREVIEW_THRESHOLD;

  // The index from which we start showing earlier emails (0 = show all)
  const earlierStartIndex = hasHiddenEarlier
    ? earlierEmails.length - COLLAPSED_PREVIEW_THRESHOLD
    : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Thread subject header */}
      <div
        style={{
          padding: 'var(--spacing-lg) var(--spacing-xl)',
          borderBottom: '1px solid var(--color-border-primary)',
          background: 'var(--color-bg-secondary)',
          flexShrink: 0,
        }}
      >
        {/* Mobile back button — only visible on mobile */}
        {isMobile && (
          <button
            onClick={() => setActiveThread(null)}
            aria-label={t('inbox.backToInbox')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: '0 0 var(--spacing-sm)',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              transition: 'color var(--transition-normal)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
        )}

        <h1
          style={{
            margin: 0,
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            lineHeight: 'var(--line-height-tight)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {thread.subject || t('common.noSubject')}
        </h1>
        {thread.messageCount > 1 && (
          <p
            style={{
              margin: 'var(--spacing-xs) 0 0',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {t('common.messages', { count: thread.messageCount })}
          </p>
        )}
        {thread.messageCount > 1 && (
          <button
            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
            aria-label={allExpanded ? t('inbox.collapseAll') : t('inbox.expandAll')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              marginTop: 'var(--spacing-xs)',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              background: 'transparent',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              transition: 'background var(--transition-normal), color var(--transition-normal)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            {allExpanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
            {allExpanded ? t('inbox.collapseAll') : t('inbox.expandAll')}
          </button>
        )}
        <UnsubscribeButton emails={emails} threadId={thread.id} />
      </div>

      {/* Action toolbar */}
      <EmailActions thread={thread} />

      {/* Message list with scroll shadow */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Subtle inset top shadow indicates scrollable content above */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            zIndex: 1,
            pointerEvents: 'none',
            boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.08)',
          }}
        />
        <div
          aria-label={t('inbox.emailContent')}
          style={{
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {emails.length === 0 ? (
            <div
              style={{
                padding: 'var(--spacing-xl)',
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-md)',
                fontFamily: 'var(--font-family)',
                textAlign: 'center',
              }}
            >
              {t('inbox.noMessages')}
            </div>
          ) : (
            <>
              {/* "Show N earlier messages" toggle */}
              {emails.length > 1 && hasHiddenEarlier && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: 'var(--spacing-sm) var(--spacing-lg)',
                    borderBottom: '1px solid var(--color-border-primary)',
                  }}
                >
                  <button
                    onClick={() => setShowEarlierMessages(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      padding: 'var(--spacing-xs) var(--spacing-md)',
                      background: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: 'var(--radius-lg)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                      fontFamily: 'var(--font-family)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-normal), color var(--transition-normal)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface-hover)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                  >
                    {t('inbox.showEarlier', { count: collapsedEarlierCount })}
                  </button>
                </div>
              )}

              {/* Earlier emails (all except last) */}
              {emails.length > 1 &&
                earlierEmails.map((email, index) => {
                  if (index < earlierStartIndex) return null;
                  const trackingRecord = trackingStats?.records.find(
                    (r) => r.emailId === email.id,
                  ) ?? null;
                  return (
                    <EmailMessage
                      key={email.id}
                      email={email}
                      isLatest={false}
                      isExpanded={expandedEmailIds.has(email.id)}
                      onToggleExpand={() => handleToggleExpand(email.id)}
                      trackingRecord={trackingRecord}
                      trackingEvents={trackingStats?.events}
                    />
                  );
                })}

              {/* Latest email — always rendered, starts expanded */}
              {lastEmail && (
                <EmailMessage
                  key={lastEmail.id}
                  email={lastEmail}
                  isLatest={true}
                  isExpanded={expandedEmailIds.has(lastEmail.id)}
                  onToggleExpand={() => handleToggleExpand(lastEmail.id)}
                  trackingRecord={
                    trackingStats?.records.find((r) => r.emailId === lastEmail.id) ?? null
                  }
                  trackingEvents={trackingStats?.events}
                />
              )}
            </>
          )}

          {/* Inline reply composer — only shown when there are messages */}
          {emails.length > 0 && (
            <InlineReply
              threadId={thread.id}
              threadSubject={thread.subject}
              lastEmail={emails[emails.length - 1]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
