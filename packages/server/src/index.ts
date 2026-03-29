import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { purgeOldArchivedDrawings } from './services/drawing.service';
import { runScheduledBackup } from './services/backup.service';
import { runMigrations } from './db/migrate';
import { closeDb } from './config/database';
import { getTenantBySlug, createTenant } from './services/platform/tenant.service';

const PURGE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
let purgeTimer: ReturnType<typeof setInterval> | null = null;
let backupTimer: ReturnType<typeof setInterval> | null = null;

const app = createApp();

app.listen(env.PORT, async () => {
  logger.info(`Atlas server running on port ${env.PORT} in ${env.NODE_ENV} mode`);

  // Run database migrations
  try {
    await runMigrations();
  } catch (err) {
    logger.error({ err }, 'Database migration failed');
    process.exit(1);
  }

  // Auto-create a dev tenant for local development
  try {
    const existing = await getTenantBySlug('dev');
    if (!existing) {
      const devOwnerId = '00000000-0000-0000-0000-000000000000';
      await createTenant({ slug: 'dev', name: 'Dev Tenant', plan: 'enterprise' }, devOwnerId);
      logger.info('Auto-created dev tenant');
    }
    logger.info('Tenant services initialized');
  } catch (err) {
    logger.error({ err }, 'Tenant initialization failed');
  }

  // Auto-purge archived drawings older than 30 days (runs every hour)
  purgeTimer = setInterval(async () => {
    try { await purgeOldArchivedDrawings(); } catch (err) {
      logger.error({ err }, 'Drawing auto-purge failed');
    }
  }, PURGE_INTERVAL_MS);
  setTimeout(() => purgeOldArchivedDrawings().catch(() => {}), 5000);

  // Automated database backups — daily
  backupTimer = setInterval(() => {
    runScheduledBackup().catch((err) => {
      logger.error({ err }, 'Scheduled backup failed');
    });
  }, BACKUP_INTERVAL_MS);
  setTimeout(() => runScheduledBackup().catch(() => {}), 30000);
  logger.info('Automated daily backups enabled');
});

// Graceful shutdown
function handleShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, cleaning up');

  if (purgeTimer) { clearInterval(purgeTimer); purgeTimer = null; }
  if (backupTimer) { clearInterval(backupTimer); backupTimer = null; }

  closeDb()
    .then(() => {
      logger.info('Cleanup complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Error during cleanup');
      process.exit(1);
    });

  setTimeout(() => {
    logger.error('Forced exit after shutdown timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
