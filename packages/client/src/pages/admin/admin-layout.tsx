import { useRef, type ReactNode } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../../stores/admin-auth-store';
import { ROUTES } from '../../config/routes';

const NAV_ITEMS = [
  { to: ROUTES.ADMIN_OVERVIEW, label: 'Overview', end: true },
  { to: ROUTES.ADMIN_TENANTS, label: 'Tenants' },
  { to: ROUTES.ADMIN_INSTALLATIONS, label: 'Installations' },
  { to: ROUTES.ADMIN_CONTAINERS, label: 'Containers' },
] as const;

export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const hydrate = useAdminAuthStore((s) => s.hydrate);
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  const hydrated = useRef(false);

  // Hydrate synchronously on first render to avoid redirect flash
  if (!hydrated.current) {
    hydrated.current = true;
    hydrate();
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
  }

  return <>{children}</>;
}

export function AdminLayout() {
  const username = useAdminAuthStore((s) => s.username);
  const logout = useAdminAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.ADMIN_LOGIN, { replace: true });
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'var(--font-family)',
      background: 'var(--color-bg-secondary)',
      color: 'var(--color-text-primary)',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-primary)',
        borderRight: '1px solid var(--color-border-primary)',
      }}>
        <div style={{
          padding: 'var(--spacing-lg)',
          borderBottom: '1px solid var(--color-border-secondary)',
        }}>
          <div style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
          }}>
            Atlas Admin
          </div>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            marginTop: 2,
          }}>
            System management
          </div>
        </div>

        <nav style={{ flex: 1, padding: 'var(--spacing-sm)' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              style={({ isActive }) => ({
                display: 'block',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-normal)',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'var(--color-surface-hover)' : 'transparent',
                textDecoration: 'none',
                marginBottom: 2,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{
          padding: 'var(--spacing-md)',
          borderTop: '1px solid var(--color-border-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            {username}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)' }}>
        <Outlet />
      </main>
    </div>
  );
}
