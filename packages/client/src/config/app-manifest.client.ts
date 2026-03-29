import type { ComponentType, LazyExoticComponent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AppManifestBase } from '@atlasmail/shared';
import type { SettingsCategory } from './settings-registry';

export interface AppRoute {
  path: string;
  component: ComponentType | LazyExoticComponent<ComponentType>;
}

export interface ClientAppManifest extends AppManifestBase {
  /** Lucide icon component for rendering */
  icon: LucideIcon;

  /** Client routes this app registers */
  routes: AppRoute[];

  /** Settings panels this app contributes */
  settingsCategory?: SettingsCategory;

  /** Sidebar sort order (lower = higher) */
  sidebarOrder: number;
}
