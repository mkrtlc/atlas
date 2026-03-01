import type { CSSProperties, ReactNode } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppWindow,
  ArrowLeft,
  Building2,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useMyTenants } from '../../hooks/use-platform';
import { ROUTES } from '../../config/routes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.ORG, label: 'Overview', icon: <LayoutDashboard size={16} />, end: true },
  { to: ROUTES.ORG_MEMBERS, label: 'Members', icon: <Users size={16} /> },
  { to: ROUTES.ORG_APPS, label: 'Apps', icon: <AppWindow size={16} /> },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPageTitle(pathname: string): string {
  if (pathname === ROUTES.ORG) return 'Overview';
  if (pathname.startsWith(ROUTES.ORG_MEMBERS)) return 'Members';
  if (pathname.startsWith(ROUTES.ORG_APPS)) return 'Apps';
  return 'Organization';
}

// ---------------------------------------------------------------------------
// OrgLayout
// ---------------------------------------------------------------------------

export function OrgLayout() {
  const tenantId = useAuthStore((s) => s.tenantId);
  const { data: tenants } = useMyTenants();
  const activeTenant = tenants?.[0];
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!tenantId) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  const pageTitle = getPageTitle(pathname);

  // -------------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------------

  const shellStyle: CSSProperties = {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: 'var(--font-family)',
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
  };

  const sidebarStyle: CSSProperties = {
    width: 240,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-bg-primary)',
    borderRight: '1px solid var(--color-border-primary)',
  };

  const sidebarHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-lg)',
    borderBottom: '1px solid var(--color-border-secondary)',
    minHeight: 56,
  };

  const iconWrapStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 'var(--radius-sm)',
    background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)',
    color: 'var(--color-accent-primary)',
    flexShrink: 0,
  };

  const logoTextStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    overflow: 'hidden',
  };

  const logoTitleStyle: CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
    color: 'var(--color-text-primary)',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const logoSubtitleStyle: CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-tertiary)',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
  };

  const navStyle: CSSProperties = {
    flex: 1,
    padding: 'var(--spacing-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflowY: 'auto',
  };

  const sidebarFooterStyle: CSSProperties = {
    padding: 'var(--spacing-md)',
    borderTop: '1px solid var(--color-border-secondary)',
  };

  const contentAreaStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  };

  const topBarStyle: CSSProperties = {
    height: 56,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: '0 var(--spacing-xl)',
    borderBottom: '1px solid var(--color-border-primary)',
    background: 'var(--color-bg-primary)',
  };

  const breadcrumbLabelStyle: CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-tertiary)',
    fontWeight: 'var(--font-weight-normal)' as CSSProperties['fontWeight'],
  };

  const breadcrumbSepStyle: CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-tertiary)',
    userSelect: 'none',
  };

  const pageTitleStyle: CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
    color: 'var(--color-text-primary)',
  };

  const mainStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--spacing-xl)',
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={shellStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        {/* Header */}
        <div style={sidebarHeaderStyle}>
          <div style={iconWrapStyle}>
            <Building2 size={16} strokeWidth={2} />
          </div>
          <div style={logoTextStyle}>
            <span style={logoTitleStyle}>{activeTenant?.name ?? 'Organization'}</span>
            <span style={logoSubtitleStyle}>Organization settings</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={navStyle} aria-label="Organization navigation">
          {NAV_ITEMS.map((item) => (
            <NavLinkItem key={item.to} item={item} />
          ))}
        </nav>

        {/* Footer — back to home */}
        <div style={sidebarFooterStyle}>
          <button
            onClick={() => navigate(ROUTES.HOME)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              width: '100%',
              padding: '0 var(--spacing-sm)',
              height: 34,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              transition: 'background var(--transition-fast), color var(--transition-fast)',
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
            <ArrowLeft size={14} />
            Back to home
          </button>
        </div>
      </aside>

      {/* Content area */}
      <div style={contentAreaStyle}>
        {/* Top bar */}
        <header style={topBarStyle}>
          <span style={breadcrumbLabelStyle}>Organization</span>
          <span style={breadcrumbSepStyle}>/</span>
          <span style={pageTitleStyle}>{pageTitle}</span>
        </header>

        {/* Page content */}
        <main style={mainStyle}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavLinkItem
// ---------------------------------------------------------------------------

function NavLinkItem({ item }: { item: NavItem }) {
  const baseItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: '0 var(--spacing-sm)',
    height: 34,
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-normal)' as CSSProperties['fontWeight'],
    textDecoration: 'none',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
    cursor: 'pointer',
    userSelect: 'none',
    borderLeft: '2px solid transparent',
    boxSizing: 'border-box',
  };

  return (
    <NavLink
      to={item.to}
      end={item.end ?? false}
      style={({ isActive }) => ({
        ...baseItemStyle,
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        background: isActive ? 'var(--color-surface-active)' : 'transparent',
        borderLeft: isActive
          ? '2px solid var(--color-accent-primary)'
          : '2px solid transparent',
        fontWeight: isActive
          ? ('var(--font-weight-medium)' as CSSProperties['fontWeight'])
          : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
      })}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (!el.getAttribute('aria-current')) {
          el.style.background = 'var(--color-surface-hover)';
          el.style.color = 'var(--color-text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (!el.getAttribute('aria-current')) {
          el.style.background = 'transparent';
          el.style.color = 'var(--color-text-secondary)';
        }
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          flexShrink: 0,
          opacity: 0.8,
        }}
        aria-hidden="true"
      >
        {item.icon}
      </span>
      {item.label}
    </NavLink>
  );
}
