import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startSyncWorker, stopSyncWorker } from './jobs/sync-worker';
import { startSyncScheduler, stopSyncScheduler } from './jobs/sync-scheduler';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`AtlasMail server running on port ${env.PORT} in ${env.NODE_ENV} mode`);

  // Start background sync infrastructure (requires Redis)
  const workerStarted = startSyncWorker();
  if (workerStarted) {
    startSyncScheduler();
    logger.info('Email sync worker and scheduler started');
  }
});

// Graceful shutdown
function handleShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, cleaning up');

  stopSyncScheduler();

  stopSyncWorker()
    ?.then(() => {
      logger.info('Sync worker stopped');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Error stopping sync worker');
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
