import drawingsRouter from '../../routes/drawings.routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';

export const drawServerManifest: ServerAppManifest = {
  id: 'draw',
  name: 'Draw',
  labelKey: 'sidebar.draw',
  iconName: 'Pencil',
  color: '#e06c9f',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: drawingsRouter,
  routePrefix: '/drawings',
  tables: ['drawings'],
};
