import { Settings, FileSignature } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { SignIcon } from '../../components/icons/app-icons';
import { SignPage } from './page';
import { SignGeneralPanel } from './components/settings/general-panel';

export const signManifest: ClientAppManifest = {
  id: 'sign',
  name: 'Agreements',
  labelKey: 'sidebar.sign',
  iconName: 'FileSignature',
  icon: SignIcon,
  color: '#8b5cf6',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 30,
  routes: [
    { path: '/sign-app', component: SignPage },
    { path: '/sign-app/:id', component: SignPage },
  ],
  settingsCategory: {
    id: 'sign',
    label: 'Sign',
    icon: FileSignature,
    color: '#8b5cf6',
    panels: [
      { id: 'general', label: 'General', icon: Settings, component: SignGeneralPanel, adminOnly: true },
    ],
  },
};
