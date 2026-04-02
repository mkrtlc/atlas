import { useTranslation } from 'react-i18next';
import { usePresence } from '../../hooks/use-presence';
import { Avatar } from '../ui/avatar';
import { Tooltip } from '../ui/tooltip';

const MAX_VISIBLE = 5;
const AVATAR_SIZE = 24;

export function PresenceAvatars({ appId, recordId }: { appId: string; recordId: string | undefined }) {
  const { t } = useTranslation();
  const { viewers } = usePresence(appId, recordId);

  if (!recordId || viewers.length === 0) return null;

  const visible = viewers.slice(0, MAX_VISIBLE);
  const overflow = viewers.length - MAX_VISIBLE;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <Tooltip
        content={
          <div style={{ fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 2 }}>
              {t('presence.viewing')}
            </div>
            {viewers.map((v) => (
              <div key={v.userId}>{v.name || v.email || 'Unknown'}</div>
            ))}
          </div>
        }
        side="bottom"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'default',
          }}
        >
          {visible.map((viewer, i) => (
            <div
              key={viewer.userId}
              style={{
                marginLeft: i === 0 ? 0 : -6,
                borderRadius: '50%',
                border: '2px solid var(--color-bg-primary)',
                lineHeight: 0,
                position: 'relative',
                zIndex: MAX_VISIBLE - i,
              }}
            >
              <Avatar
                name={viewer.name}
                email={viewer.email ?? undefined}
                size={AVATAR_SIZE}
              />
            </div>
          ))}
          {overflow > 0 && (
            <div
              style={{
                marginLeft: -6,
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: '50%',
                border: '2px solid var(--color-bg-primary)',
                background: 'var(--color-bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
                position: 'relative',
                zIndex: 0,
              }}
            >
              {t('presence.andMore', { count: overflow })}
            </div>
          )}
        </div>
      </Tooltip>
    </div>
  );
}
