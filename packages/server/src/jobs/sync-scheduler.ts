import { eq, and, isNotNull } from 'drizzle-orm';
import { db } from '../config/database';
import { accounts } from '../db/schema';
import { addIncrementalSyncJob } from './sync-worker';
import { logger } from '../utils/logger';

const SYNC_INTERVAL_MS = 60_000; // 60 seconds
const STAGGER_DELAY_MS = 2_000; // 2 seconds between accounts

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the periodic sync scheduler.
 *
 * Every SYNC_INTERVAL_MS, finds all accounts with syncStatus='idle' that have
 * completed at least one full sync (historyId is set), and enqueues incremental
 * sync jobs staggered to avoid overwhelming the Gmail API.
 */
export function startSyncScheduler() {
  if (schedulerTimer) {
    logger.warn('Sync scheduler already running, skipping duplicate start');
    return;
  }

  logger.info(
    { intervalMs: SYNC_INTERVAL_MS, staggerMs: STAGGER_DELAY_MS },
    'Starting sync scheduler',
  );

  schedulerTimer = setInterval(async () => {
    try {
      await scheduleIncrementalSyncs();
    } catch (err) {
      logger.error({ err }, 'Sync scheduler tick failed');
    }
  }, SYNC_INTERVAL_MS);

  // Run once immediately on startup (after a short delay for the worker to be ready)
  setTimeout(async () => {
    try {
      await scheduleIncrementalSyncs();
    } catch (err) {
      logger.error({ err }, 'Initial sync scheduler tick failed');
    }
  }, 5000);
}

export function stopSyncScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info('Sync scheduler stopped');
  }
}

async function scheduleIncrementalSyncs() {
  // Find all accounts that:
  // 1. Have syncStatus = 'idle' (not currently syncing)
  // 2. Have a historyId (have completed at least one full sync)
  const idleAccounts = await db
    .select({ id: accounts.id, email: accounts.email })
    .from(accounts)
    .where(
      and(
        eq(accounts.syncStatus, 'idle'),
        isNotNull(accounts.historyId),
      ),
    );

  if (idleAccounts.length === 0) {
    return;
  }

  logger.debug(
    { accountCount: idleAccounts.length },
    'Scheduling incremental syncs',
  );

  // Stagger job additions to spread API load across time
  for (let i = 0; i < idleAccounts.length; i++) {
    const account = idleAccounts[i];

    // Add a staggered delay so jobs don't all fire at the same instant
    if (i > 0) {
      await delay(STAGGER_DELAY_MS);
    }

    try {
      await addIncrementalSyncJob(account.id);
    } catch (err) {
      logger.warn(
        { err, accountId: account.id, email: account.email },
        'Failed to enqueue incremental sync job',
      );
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
