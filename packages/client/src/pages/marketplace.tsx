import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
import { CatalogGrid } from '../components/marketplace/catalog-grid';
import { AppDetailModal } from '../components/marketplace/app-detail-modal';
import { InstallConfirmModal } from '../components/marketplace/install-confirm-modal';
import { useCatalog, useMyTenants, useInstallApp, useInstallations } from '../hooks/use-platform';
import { ROUTES } from '../config/routes';
import type { CatalogApp } from '@atlasmail/shared';

export function MarketplacePage() {
  const navigate = useNavigate();
  const { data: apps = [], isLoading } = useCatalog();
  const { data: tenants } = useMyTenants();
  const activeTenant = tenants?.[0];

  const { data: installations } = useInstallations(activeTenant?.id);
  const installApp = useInstallApp(activeTenant?.id ?? '');

  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  const installedAppIds = new Set(installations?.map((i) => i.catalogAppId) ?? []);

  const handleSelect = (app: CatalogApp) => {
    setSelectedApp(app);
    setDetailOpen(true);
  };

  const handleInstallClick = (app: CatalogApp) => {
    setSelectedApp(app);
    setDetailOpen(false);
    setInstallOpen(true);
  };

  const handleConfirmInstall = (subdomain: string) => {
    if (!selectedApp || !activeTenant) return;
    installApp.mutate(
      { catalogAppId: selectedApp.id, subdomain },
      {
        onSuccess: () => {
          setInstallOpen(false);
          setSelectedApp(null);
        },
      },
    );
  };

  return (
    <div style={{
      height: '100vh',
      background: 'var(--color-bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 24px',
        borderBottom: '1px solid var(--color-border-primary)',
      }}>
        <button
          onClick={() => navigate(ROUTES.HOME)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid var(--color-border-primary)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <Store size={22} color="var(--color-text-primary)" />
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            App marketplace
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            Browse and install business apps for your organization
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {!activeTenant && (
          <div style={{
            padding: 24,
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
            color: 'var(--color-text-secondary)',
          }}>
            Create an organization to start installing apps. Organizations let you manage apps and team access.
          </div>
        )}

        {isLoading ? (
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: 'var(--color-text-tertiary)',
            fontSize: 14,
          }}>
            Loading catalog...
          </div>
        ) : (
          <CatalogGrid apps={apps} onSelect={handleSelect} />
        )}
      </div>

      {/* Modals */}
      <AppDetailModal
        app={selectedApp}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onInstall={handleInstallClick}
        isInstalled={selectedApp ? installedAppIds.has(selectedApp.id) : false}
      />

      <InstallConfirmModal
        app={selectedApp}
        open={installOpen}
        onOpenChange={setInstallOpen}
        onConfirm={handleConfirmInstall}
        isLoading={installApp.isPending}
        tenantSlug={activeTenant?.slug}
      />
    </div>
  );
}
