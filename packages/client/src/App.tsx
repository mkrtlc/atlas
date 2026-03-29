import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from './providers/theme-provider';
import { QueryProvider } from './providers/query-provider';
import { ShortcutProvider } from './providers/shortcut-provider';
import { TooltipProvider } from './components/ui/tooltip';
import { useAuthStore } from './stores/auth-store';
import { ROUTES } from './config/routes';
import { appRegistry } from './apps';
import { LoginPage } from './pages/login';
import { InvitationPage } from './pages/invitation';
import { SettingsPage, SettingsModal } from './pages/settings';
import { HomePage } from './pages/home';
import { CommandPalette } from './components/ui/command-palette';
import { ErrorBoundary } from './components/ui/error-boundary';
import { type ReactNode } from 'react';
import { OrgLayout } from './pages/org/org-layout';
import { OrgOverviewPage } from './pages/org/org-overview';
import { OrgMembersPage } from './pages/org/org-members';
import { OrgSettingsPage } from './pages/org/org-settings';
import { ForgotPasswordPage } from './pages/forgot-password';
import { ResetPasswordPage } from './pages/reset-password';
import { AdminLayout, AdminProtectedRoute } from './pages/admin/admin-layout';
import { AdminOverviewPage } from './pages/admin/admin-overview';
import { AdminTenantsPage } from './pages/admin/admin-tenants';
import { AdminTenantDetailPage } from './pages/admin/admin-tenant-detail';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--font-size-md)',
        }}
      >
        {t('common.loading')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
}

export function App() {
  const appRoutes = appRegistry.getRoutes();

  return (
    <QueryProvider>
      <ThemeProvider>
        <TooltipProvider>
          <ShortcutProvider>
            <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route path={ROUTES.INVITATION} element={<InvitationPage />} />
                <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
                <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
                <Route
                  path={ROUTES.HOME}
                  element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.SETTINGS}
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* App routes from registry */}
                {appRoutes.map(({ path, component: Component }) => (
                  <Route
                    key={path}
                    path={path}
                    element={<ProtectedRoute><Component /></ProtectedRoute>}
                  />
                ))}

                <Route
                  path={ROUTES.TENANT_USERS}
                  element={<Navigate to={ROUTES.ORG_MEMBERS} replace />}
                />
                {/* Org routes */}
                <Route
                  path={ROUTES.ORG}
                  element={<ProtectedRoute><OrgLayout /></ProtectedRoute>}
                >
                  <Route index element={<OrgOverviewPage />} />
                  <Route path="members" element={<OrgMembersPage />} />
                  <Route path="settings" element={<OrgSettingsPage />} />
                </Route>
                {/* Admin routes */}
                <Route path={ROUTES.ADMIN_LOGIN} element={<Navigate to={ROUTES.LOGIN} replace />} />
                <Route
                  path={ROUTES.ADMIN}
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout />
                    </AdminProtectedRoute>
                  }
                >
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="tenants" element={<AdminTenantsPage />} />
                  <Route path="tenants/:id" element={<AdminTenantDetailPage />} />
                </Route>

                <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
              </Routes>
              <CommandPalette />
              <SettingsModal />
            </ErrorBoundary>
            </BrowserRouter>
          </ShortcutProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
