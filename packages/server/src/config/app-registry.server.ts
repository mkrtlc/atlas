import type { Router } from 'express';
import type { ServerAppManifest } from './app-manifest.server';

class ServerAppRegistry {
  private apps: Map<string, ServerAppManifest> = new Map();

  register(manifest: ServerAppManifest): void {
    if (this.apps.has(manifest.id)) {
      console.warn(`Server app "${manifest.id}" already registered`);
      return;
    }
    this.apps.set(manifest.id, manifest);
  }

  get(id: string): ServerAppManifest | undefined {
    return this.apps.get(id);
  }

  getAll(): ServerAppManifest[] {
    return Array.from(this.apps.values());
  }

  mountAll(parentRouter: Router): void {
    for (const app of this.getAll()) {
      const prefix = app.routePrefix ?? `/${app.id}`;
      parentRouter.use(prefix, app.router);
    }
  }
}

export const serverAppRegistry = new ServerAppRegistry();
