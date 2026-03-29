import driveRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';

export const driveServerManifest: ServerAppManifest = {
  id: 'drive',
  name: 'Drive',
  labelKey: 'sidebar.drive',
  iconName: 'HardDrive',
  color: '#64748b',
  minPlan: 'starter',
  category: 'storage',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: driveRouter,
  routePrefix: '/drive',
  tables: ['drive_items', 'drive_versions', 'drive_share_links'],
};
