import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminLogin } from '../../hooks/use-admin';
import { ROUTES } from '../../config/routes';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const loginMutation = useAdminLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { username, password },
      { onSuccess: () => navigate(ROUTES.ADMIN, { replace: true }) },
    );
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-bg-secondary)',
      fontFamily: 'var(--font-family)',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          padding: 'var(--spacing-2xl)',
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h1 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--spacing-xs)',
        }}>
          System admin
        </h1>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          marginBottom: 'var(--spacing-xl)',
        }}>
          Sign in to manage the platform
        </p>

        {loginMutation.isError && (
          <div style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            marginBottom: 'var(--spacing-lg)',
            background: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-sm)',
          }}>
            Invalid credentials
          </div>
        )}

        <label style={{
          display: 'block',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--spacing-xs)',
        }}>
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            marginBottom: 'var(--spacing-lg)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-md)',
            fontFamily: 'var(--font-family)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <label style={{
          display: 'block',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--spacing-xs)',
        }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            marginBottom: 'var(--spacing-xl)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-md)',
            fontFamily: 'var(--font-family)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <button
          type="submit"
          disabled={loginMutation.isPending}
          style={{
            width: '100%',
            height: 34,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent-primary)',
            color: 'var(--color-text-inverse)',
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-medium)',
            fontFamily: 'var(--font-family)',
            cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: loginMutation.isPending ? 0.7 : 1,
          }}
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
