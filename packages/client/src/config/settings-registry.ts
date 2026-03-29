import type { ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Globe,
  Settings,
  Palette,
  Info,
  Image,
  LayoutGrid,
} from 'lucide-react';

import {
  MailGeneralPanel,
  MailAppearancePanel,
  MailAboutPanel,
} from '../components/settings/settings-modal';

import {
  HomeBackgroundPanel,
  HomeWidgetsPanel,
} from '../components/home/home-settings-modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettingsPanel {
  id: string;
  label: string;
  icon: LucideIcon;
  component: () => ReactElement;
}

export interface SettingsCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  color?: string;
  panels: SettingsPanel[];
}

// ---------------------------------------------------------------------------
// Global settings (not app-specific)
// ---------------------------------------------------------------------------

export const globalSettingsCategory: SettingsCategory = {
  id: 'global',
  label: 'Global',
  icon: Globe,
  color: '#6b7280',
  panels: [
    { id: 'general', label: 'General', icon: Settings, component: MailGeneralPanel },
    { id: 'appearance', label: 'Appearance', icon: Palette, component: MailAppearancePanel },
    { id: 'home-background', label: 'Home background', icon: Image, component: HomeBackgroundPanel },
    { id: 'home-widgets', label: 'Widgets', icon: LayoutGrid, component: HomeWidgetsPanel },
    { id: 'about', label: 'About', icon: Info, component: MailAboutPanel },
  ],
};

// ---------------------------------------------------------------------------
// Build full settings categories (global + app-contributed)
// ---------------------------------------------------------------------------

export function getSettingsCategories(appCategories: SettingsCategory[] = []): SettingsCategory[] {
  return [globalSettingsCategory, ...appCategories];
}
