import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Square, RotateCw, Trash2, Users, Plus } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import {
  useCatalog,
  useInstallations,
  useInstallApp,
  useUninstallApp,
  useStartApp,
  useStopApp,
  useAppAssignments,
  useAssignUser,
  useRemoveAssignment,
  useTenantUsers,
} from '../../hooks/use-platform';
import { queryKeys } from '../../config/query-keys';
import { AppIcon } from '../../components/marketplace/app-icons';
import { InstallConfirmModal } from '../../components/marketplace/install-confirm-modal';
import type { CatalogApp, AppInstallation } from '@atlasmail/shared';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  running: { bg: 'color-mix(in srgb, #16a34a 12%, transparent)', text: '#16a34a' },
  stopped: { bg: 'color-mix(in srgb, #6b7280 12%, transparent)', text: '#6b7280' },
  installing: { bg: 'color-mix(in srgb, #2563eb 12%, transparent)', text: '#2563eb' },
  uninstalling: { bg: 'color-mix(in srgb, #dc2626 12%, transparent)', text: '#dc2626' },
  error: { bg: 'color-mix(in srgb, #dc2626 12%, transparent)', text: '#dc2626' },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.stopped;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        borderRadius: 10,
        background: colors.bg,
        color: colors.text,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.text }} />
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// OrgAppsPage
// ---------------------------------------------------------------------------

export function OrgAppsPage() {
  const tenantId = useAuthStore((s) => s.tenantId);
  const queryClient = useQueryClient();

  const { data: catalogApps = [] } = useCatalog();
  const { data: installations } = useInstallations(tenantId ?? undefined);
  const installApp = useInstallApp(tenantId ?? '');
  const uninstallApp = useUninstallApp(tenantId ?? '');
  const startApp = useStartApp(tenantId ?? '');
  const stopApp = useStopApp(tenantId ?? '');

  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [assignModalInstallation, setAssignModalInstallation] = useState<AppInstallation | null>(null);

  // Enrich installations with catalog metadata
  const enrichedInstallations = useMemo(() => {
    return installations?.map((inst) => {
      const catalog = catalogApps.find((c) => c.id === inst.catalogAppId);
      return {
        ...inst,
        appName: catalog?.name ?? inst.subdomain,
        manifestId: catalog?.manifestId ?? null,
        color: catalog?.color ?? '#666',
      };
    });
  }, [installations, catalogApps]);

  const activeInstallations = enrichedInstallations?.filter(
    (i) => i.status === 'running' || i.status === 'stopped',
  );
  const transitionalInstallations = enrichedInstallations?.filter(
    (i) => i.status === 'installing' || i.status === 'uninstalling',
  );

  // Available = catalog apps not yet installed
  const installedCatalogIds = useMemo(
    () => new Set(installations?.map((i) => i.catalogAppId) ?? []),
    [installations],
  );
  const availableApps = catalogApps.filter((a) => !installedCatalogIds.has(a.id));

  // Find the installation status for the currently selected app (for install modal)
  const currentInstallation = useMemo(
    () => selectedApp ? installations?.find((i) => i.catalogAppId === selectedApp.id) : undefined,
    [installations, selectedApp],
  );

  const handleInstallClick = (app: CatalogApp) => {
    setSelectedApp(app);
    setInstallOpen(true);
  };

  const handleConfirmInstall = (subdomain: string) => {
    if (!selectedApp || !tenantId) return;
    installApp.mutate(
      { catalogAppId: selectedApp.id, subdomain },
      { onSuccess: () => setIsInstalling(true) },
    );
  };

  const handleInstallDone = useCallback(() => {
    setIsInstalling(false);
    setInstallOpen(false);
    setSelectedApp(null);
    queryClient.invalidateQueries({ queryKey: queryKeys.platform.all });
  }, [queryClient]);

  const handleUninstall = (installation: AppInstallation & { appName: string }) => {
    if (!confirm(`Uninstall ${installation.appName}? This will remove all data.`)) return;
    uninstallApp.mutate(installation.id, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.platform.all }),
    });
  };

  const tenant = useMemo(() => ({ slug: '' }), []); // placeholder for install modal

  if (!tenantId) {
    return (
      <div style={{ padding: 32, fontFamily: 'var(--font-family)', color: 'var(--color-text-secondary)' }}>
        <h2 style={{ fontSize: 20, marginBottom: 12, color: 'var(--color-text-primary)' }}>Apps</h2>
        <p>App management requires a company account.</p>
      </div>
    );
  }

  const actionBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid #d0d5dd',
    borderRadius: 4,
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-family)',
  };

  return (
    <div style={{ maxWidth: 900, fontFamily: 'var(--font-family)' }}>
      {/* Installed apps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>Installed apps</h2>
      </div>

      {(!activeInstallations || activeInstallations.length === 0) && (!transitionalInstallations || transitionalInstallations.length === 0) ? (
        <div style={{
          padding: 24,
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: 8,
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
          marginBottom: 32,
        }}>
          No apps installed yet. Browse the catalog below to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
          {/* Transitional (installing/uninstalling) */}
          {transitionalInstallations?.map((inst) => (
            <div
              key={inst.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 6,
                opacity: 0.7,
              }}
            >
              <AppIconBadge manifestId={inst.manifestId} color={inst.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{inst.appName}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{inst.subdomain}</div>
              </div>
              <StatusBadge status={inst.status} />
            </div>
          ))}

          {/* Active (running/stopped) */}
          {activeInstallations?.map((inst) => (
            <div
              key={inst.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 6,
              }}
            >
              <AppIconBadge manifestId={inst.manifestId} color={inst.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{inst.appName}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{inst.subdomain}</div>
              </div>
              <StatusBadge status={inst.status} />
              <div style={{ display: 'flex', gap: 4 }}>
                {inst.status === 'stopped' && (
                  <button onClick={() => startApp.mutate(inst.id)} style={actionBtnStyle} title="Start">
                    <Play size={12} />
                  </button>
                )}
                {inst.status === 'running' && (
                  <button onClick={() => stopApp.mutate(inst.id)} style={actionBtnStyle} title="Stop">
                    <Square size={12} />
                  </button>
                )}
                <button
                  onClick={() => {
                    stopApp.mutate(inst.id, {
                      onSuccess: () => startApp.mutate(inst.id),
                    });
                  }}
                  style={actionBtnStyle}
                  title="Restart"
                >
                  <RotateCw size={12} />
                </button>
                <button onClick={() => setAssignModalInstallation(inst)} style={actionBtnStyle} title="Manage users">
                  <Users size={12} />
                </button>
                <button
                  onClick={() => handleUninstall(inst)}
                  style={{ ...actionBtnStyle, color: '#dc2626', borderColor: '#fecaca' }}
                  title="Uninstall"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available apps catalog */}
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>Available apps</h2>
      {availableApps.length === 0 ? (
        <div style={{
          padding: 24,
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: 8,
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}>
          All available apps are already installed.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {availableApps.map((app) => (
            <div
              key={app.id}
              style={{
                padding: 16,
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onClick={() => handleInstallClick(app)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-primary)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: app.color || '#666',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon manifestId={app.manifestId} size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{app.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{app.category}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {app.description}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstallClick(app);
                }}
                style={{
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 14px',
                  height: 34,
                  background: '#13715B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                }}
              >
                <Plus size={14} />
                Install
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Install modal */}
      <InstallConfirmModal
        app={selectedApp}
        open={installOpen}
        onOpenChange={(open) => {
          setInstallOpen(open);
          if (!open) setIsInstalling(false);
        }}
        onConfirm={handleConfirmInstall}
        isLoading={installApp.isPending}
        tenantSlug={undefined}
        installationStatus={currentInstallation?.status}
        onDone={handleInstallDone}
      />

      {/* User assignment modal */}
      {assignModalInstallation && tenantId && (
        <AssignUsersModal
          tenantId={tenantId}
          installation={assignModalInstallation}
          onClose={() => setAssignModalInstallation(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppIconBadge — small helper
// ---------------------------------------------------------------------------

function AppIconBadge({ manifestId, color }: { manifestId: string | null; color: string }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {manifestId && <AppIcon manifestId={manifestId} size={20} color="#fff" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssignUsersModal
// ---------------------------------------------------------------------------

function AssignUsersModal({
  tenantId,
  installation,
  onClose,
}: {
  tenantId: string;
  installation: AppInstallation;
  onClose: () => void;
}) {
  const { data: assignments } = useAppAssignments(tenantId, installation.id);
  const { data: tenantUsers } = useTenantUsers(tenantId);
  const assignUser = useAssignUser(tenantId, installation.id);
  const removeAssignment = useRemoveAssignment(tenantId, installation.id);

  const assignedUserIds = new Set(assignments?.map((a) => a.userId) ?? []);
  const unassignedUsers = tenantUsers?.filter((u) => !assignedUserIds.has(u.userId)) ?? [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 480,
          maxHeight: '70vh',
          overflow: 'auto',
          padding: 24,
          background: 'var(--color-bg-secondary)',
          border: '1px solid #d0d5dd',
          borderRadius: 8,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--color-text-primary)' }}>
          Manage users — {installation.name ?? installation.subdomain}
        </h3>

        {/* Assigned users */}
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          Assigned users ({assignments?.length ?? 0})
        </div>
        {(!assignments || assignments.length === 0) ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>No users assigned yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {assignments.map((a) => (
              <div key={a.userId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 4,
                fontSize: 13,
              }}>
                <span style={{ flex: 1, color: 'var(--color-text-primary)' }}>{a.name || a.email || a.userId}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{a.appRole}</span>
                <button
                  onClick={() => removeAssignment.mutate(a.userId)}
                  style={{
                    padding: '2px 8px',
                    fontSize: 11,
                    background: 'transparent',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add users */}
        {unassignedUsers.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              Add users
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {unassignedUsers.map((u) => (
                <div key={u.userId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 4,
                  fontSize: 13,
                }}>
                  <span style={{ flex: 1, color: 'var(--color-text-primary)' }}>{u.name || u.email}</span>
                  <button
                    onClick={() => assignUser.mutate({ userId: u.userId, appRole: 'member' })}
                    disabled={assignUser.isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 500,
                      background: '#13715B',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family)',
                    }}
                  >
                    <Plus size={10} />
                    Assign
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              height: 34,
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              border: '1px solid #d0d5dd',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
