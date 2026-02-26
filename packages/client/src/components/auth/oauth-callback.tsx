import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { ROUTES } from '../../config/routes';
import { Mail } from 'lucide-react';
import type { Account } from '@atlasmail/shared';

export function OAuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addAccount } = useAuthStore();
  const hasRun = useRef(false);
  // Capture the flag at mount time — before the effect clears it from sessionStorage
  const [isAddingAccount] = useState(
    () => sessionStorage.getItem('atlasmail_adding_account') === 'true',
  );

  useEffect(() => {
    // Prevent double-execution in React StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      sessionStorage.removeItem('atlasmail_adding_account');
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!code) {
      sessionStorage.removeItem('atlasmail_adding_account');
      navigate(ROUTES.LOGIN);
      return;
    }

    async function exchangeCode() {
      try {
        const redirectUri = `${window.location.origin}/auth/callback`;

        // When adding an account, send the current refresh token so the server
        // can link the new account under the same user.
        const body: Record<string, string> = { code: code!, redirectUri };
        if (isAddingAccount) {
          const existingRefresh = localStorage.getItem('atlasmail_refresh_token');
          if (existingRefresh) {
            body.existingToken = existingRefresh;
          }
        }

        const { data } = await api.post('/auth/callback', body);
        const { accessToken, refreshToken, account } = data.data as {
          accessToken: string;
          refreshToken: string;
          account: Account;
        };

        sessionStorage.removeItem('atlasmail_adding_account');

        // addAccount handles both first-login and add-account flows:
        // it merges into the accounts list and makes this account active.
        addAccount(account, accessToken, refreshToken);

        navigate(ROUTES.INBOX, { replace: true });
      } catch (err) {
        console.error('OAuth callback failed:', err);
        sessionStorage.removeItem('atlasmail_adding_account');
        navigate(ROUTES.LOGIN);
      }
    }

    exchangeCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-family)',
        gap: 'var(--spacing-lg)',
      }}
    >
      {/* Animated brand icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        <Mail size={28} color="#ffffff" />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {isAddingAccount ? t('auth.addingAccount') : t('auth.signingIn')}
        </p>
        <p
          style={{
            margin: 'var(--spacing-xs) 0 0',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          {t('auth.connectingToGmail')}
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.96); }
        }
      `}</style>
    </div>
  );
}
