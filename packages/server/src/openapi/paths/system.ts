import { z } from 'zod';
import { openApiRegistry, register, envelope, Uuid, IsoDateTime } from '../_helpers';

const TAG = 'System';

openApiRegistry.registerPath({
  method: 'get',
  path: '/health',
  tags: [TAG],
  summary: 'Health check (no auth)',
  responses: {
    200: {
      description: 'OK',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok'),
            uptime: z.number(),
            memory: z.object({ rss: z.number(), heapUsed: z.number() }),
            version: z.string(),
          }),
        },
      },
    },
  },
});

register({
  method: 'get', path: '/system/metrics', tags: [TAG],
  summary: 'System metrics (admin only)',
  response: envelope(z.record(z.string(), z.unknown())),
});

register({
  method: 'get', path: '/system/email-settings', tags: [TAG],
  summary: 'Get SMTP email configuration (admin only)',
  response: envelope(z.record(z.string(), z.unknown())),
});

register({
  method: 'put', path: '/system/email-settings', tags: [TAG],
  summary: 'Update SMTP email configuration (admin only)',
  body: z.record(z.string(), z.unknown()),
});

register({
  method: 'post', path: '/system/email-test', tags: [TAG],
  summary: 'Send a test email using current SMTP settings',
  body: z.object({ to: z.string().email() }),
});

register({
  method: 'get', path: '/system/permissions', tags: [TAG],
  summary: 'List per-user app permissions (tenant owner only)',
  response: envelope(z.array(z.record(z.string(), z.unknown()))),
});

register({
  method: 'get', path: '/system/permissions/audit', tags: [TAG],
  summary: 'Audit log of permission changes (tenant owner only)',
  response: envelope(z.array(z.record(z.string(), z.unknown()))),
});

register({
  method: 'put', path: '/system/permissions/:userId/:appId', tags: [TAG],
  summary: 'Set a user’s per-app permission override',
  params: z.object({ userId: Uuid, appId: z.string() }),
  body: z.object({ canRead: z.boolean().optional(), canWrite: z.boolean().optional(), canDelete: z.boolean().optional(), canAdmin: z.boolean().optional() }),
});

register({
  method: 'delete', path: '/system/permissions/:userId/:appId', tags: [TAG],
  summary: 'Revert a user’s per-app permission override (back to default)',
  params: z.object({ userId: Uuid, appId: z.string() }),
});
