import type { LucideIcon } from 'lucide-react';
import type { ClientAppManifest, AppRoute } from './app-manifest.client';
import type { SettingsCategory } from './settings-registry';

class AppRegistry {
  private apps: Map<string, ClientAppManifest> = new Map();

  register(manifest: ClientAppManifest): void {
    if (this.apps.has(manifest.id)) {
      console.warn(`App "${manifest.id}" already registered`);
      return;
    }
    this.apps.set(manifest.id, manifest);
  }

  get(id: string): ClientAppManifest | undefined {
    return this.apps.get(id);
  }

  getAll(): ClientAppManifest[] {
    return Array.from(this.apps.values())
      .sort((a, b) => a.sidebarOrder - b.sidebarOrder);
  }

  getEnabled(enabledAppIds: Set<string>): ClientAppManifest[] {
    return this.getAll().filter(app => enabledAppIds.has(app.id));
  }

  getRoutes(): AppRoute[] {
    return this.getAll().flatMap(app => app.routes);
  }

  getNavItems(): Array<{ id: string; labelKey: string; icon: LucideIcon; color: string; route: string }> {
    return this.getAll().map(app => ({
      id: app.id,
      labelKey: app.labelKey,
      icon: app.icon,
      color: app.color,
      route: app.routes[0]?.path ?? `/${app.id}`,
    }));
  }

  getSettingsCategories(): SettingsCategory[] {
    return this.getAll()
      .map(app => app.settingsCategory)
      .filter((c): c is SettingsCategory => c !== undefined);
  }
}

export const appRegistry = new AppRegistry();
