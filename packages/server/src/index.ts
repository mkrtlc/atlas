import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startSyncWorker, stopSyncWorker } from './jobs/sync-worker';
import { startSyncScheduler, stopSyncScheduler } from './jobs/sync-scheduler';
import { purgeOldArchivedDrawings } from './services/drawing.service';
import { startAppInstallWorker, startAppHealthWorker, startAppBackupWorker, stopPlatformWorkers } from './jobs/app-install.worker';
import { migratePlatformSchema, closePlatformDb } from './config/platform-database';

const PURGE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let purgeTimer: ReturnType<typeof setInterval> | null = null;

const app = createApp();

app.listen(env.PORT, async () => {
  logger.info(`Atlas server running on port ${env.PORT} in ${env.NODE_ENV} mode`);

  // Start background sync infrastructure (requires Redis)
  const workerStarted = startSyncWorker();
  if (workerStarted) {
    startSyncScheduler();
    logger.info('Email sync worker and scheduler started');
  }

  // Platform: run PostgreSQL migrations + start platform workers
  if (env.DATABASE_PLATFORM_URL) {
    try {
      await migratePlatformSchema();
      startAppInstallWorker();
      startAppHealthWorker();
      startAppBackupWorker();
      logger.info('Platform services initialized');
    } catch (err) {
      logger.error({ err }, 'Platform initialization failed — platform features will be unavailable');
    }
  } else {
    logger.info('DATABASE_PLATFORM_URL not set — platform marketplace features disabled');
  }

  // Auto-purge archived drawings older than 30 days (runs every hour)
  purgeTimer = setInterval(async () => {
    try { await purgeOldArchivedDrawings(); } catch (err) {
      logger.error({ err }, 'Drawing auto-purge failed');
    }
  }, PURGE_INTERVAL_MS);

  // Run once on startup after a short delay
  setTimeout(() => purgeOldArchivedDrawings().catch(() => {}), 5000);
});

// Graceful shutdown
function handleShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, cleaning up');

  if (purgeTimer) { clearInterval(purgeTimer); purgeTimer = null; }
  stopSyncScheduler();

  Promise.all([
    stopSyncWorker(),
    stopPlatformWorkers(),
    closePlatformDb(),
  ])
    .then(() => {
      logger.info('All workers stopped');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Error stopping workers');
      process.exit(1);
    });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced exit after shutdown timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
