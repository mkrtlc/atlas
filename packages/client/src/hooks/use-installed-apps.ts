import { useMyTenants, useInstallations, useCatalog } from './use-platform';

/**
 * Returns installed apps for the current user's first tenant (MVP: single tenant).
 * Used by the home page to render installed app cards.
 */
export function useInstalledApps() {
  const { data: tenants } = useMyTenants();
  const activeTenant = tenants?.[0]; // MVP: use first tenant

  const { data: installations, isLoading } = useInstallations(activeTenant?.id);
  const { data: catalogApps } = useCatalog();

  // Enrich installations with catalog metadata (name, icon, color)
  const enriched = installations?.map((inst) => {
    const catalog = catalogApps?.find((c) => c.id === inst.catalogAppId);
    return {
      ...inst,
      name: catalog?.name ?? inst.subdomain,
      iconUrl: catalog?.iconUrl ?? null,
      color: catalog?.color ?? '#666',
    };
  });

  return {
    installations: enriched ?? [],
    tenant: activeTenant ?? null,
    isLoading,
  };
}
