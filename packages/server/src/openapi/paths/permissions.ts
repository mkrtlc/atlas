import { z } from 'zod';
import { register, envelope, Uuid } from '../_helpers';

const TAG = 'App permissions';

const AppPermission = z.object({
  appId: z.string(),
  userId: Uuid,
  role: z.string(),
  canRead: z.boolean(),
  canWrite: z.boolean(),
  canDelete: z.boolean(),
  canAdmin: z.boolean(),
});

register({
  method: 'get', path: '/permissions/my-apps', tags: [TAG],
  summary: 'List apps the current user has permission to use',
  response: envelope(z.array(z.object({
    appId: z.string(),
    canRead: z.boolean(),
    canWrite: z.boolean(),
  }))),
});

register({
  method: 'get', path: '/permissions/all', tags: [TAG],
  summary: 'List all app permissions (admin)',
  response: envelope(z.array(AppPermission)),
});

register({
  method: 'get', path: '/permissions/:appId', tags: [TAG],
  summary: 'List permissions for a specific app (admin)',
  params: z.object({ appId: z.string() }),
  response: envelope(z.array(AppPermission)),
});

register({
  method: 'get', path: '/permissions/:appId/me', tags: [TAG],
  summary: 'Get current user’s permission for a specific app',
  params: z.object({ appId: z.string() }),
  response: envelope(AppPermission),
});

register({
  method: 'put', path: '/permissions/:appId/:userId', tags: [TAG],
  summary: 'Set a user’s permission for an app (admin)',
  params: z.object({ appId: z.string(), userId: Uuid }),
  body: AppPermission.omit({ appId: true, userId: true }).partial(),
});

register({
  method: 'delete', path: '/permissions/:appId/:userId', tags: [TAG],
  summary: 'Revoke a user’s permission for an app (admin)',
  params: z.object({ appId: z.string(), userId: Uuid }),
});
