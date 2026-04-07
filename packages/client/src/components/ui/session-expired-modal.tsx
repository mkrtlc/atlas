import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth-store';
import { Button } from './button';

export function SessionExpiredModal() {
  const { t } = useTranslation();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const logout = useAuthStore((s) => s.logout);

  if (!sessionExpired) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: '90vw',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: 'var(--color-bg-primary)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {/* Gradient header with lock icon */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)',
            padding: '40px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={32} color="#fff" strokeWidth={2} />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px 32px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
            }}
          >
            {t('auth.sessionExpiredTitle')}
          </h2>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--line-height-normal)',
            }}
          >
            {t('auth.sessionExpiredMessage')}
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--line-height-normal)',
            }}
          >
            {t('auth.sessionExpiredPickUp')}
          </p>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={logout}>
              {t('auth.signBackIn')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
