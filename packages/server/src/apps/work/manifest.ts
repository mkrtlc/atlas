import workRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';

export const workServerManifest: ServerAppManifest = {
  id: 'work',
  name: 'Work',
  labelKey: 'sidebar.work',
  iconName: 'Briefcase',
  color: '#6366f1',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: workRouter,
  routePrefix: '/work',
  tables: ['tasks', 'task_activities', 'task_projects', 'task_comments', 'task_attachments', 'task_dependencies', 'project_projects', 'project_members', 'project_time_entries'],
};
