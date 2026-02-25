import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Redis connection (lazy — only created when REDIS_URL is configured)
// ---------------------------------------------------------------------------

let connection: IORedis | null = null;
let syncQueue: Queue | null = null;

function getConnection(): IORedis | null {
  if (!env.REDIS_URL) return null;
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on('error', (err) => {
      logger.error({ err }, 'Redis connection error (sync-worker)');
    });
  }
  return connection;
}

function getQueue(): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  if (!syncQueue) {
    syncQueue = new Queue('email-sync', {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    });
  }
  return syncQueue;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let worker: Worker | null = null;

export function startSyncWorker() {
  const conn = getConnection();
  if (!conn) {
    logger.info('Redis not configured — sync worker disabled (background sync requires Redis)');
    return null;
  }

  if (worker) {
    logger.warn('Sync worker already started, skipping duplicate start');
    return worker;
  }

  worker = new Worker(
    'email-sync',
    async (job: Job) => {
      const { accountId } = job.data;
      const log = logger.child({ jobId: job.id, jobType: job.name, accountId });

      log.info('Processing sync job');

      const { fullSync, incrementalSync } = await import('../services/sync.service');

      switch (job.name) {
        case 'full-sync': {
          await fullSync(accountId);
          break;
        }
        case 'incremental-sync': {
          await incrementalSync(accountId);
          break;
        }
        default:
          log.warn({ jobName: job.name }, 'Unknown job type');
      }

      log.info('Sync job completed');
    },
    {
      connection: conn,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60000,
      },
    },
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job?.id, jobName: job?.name }, 'Sync job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, jobName: job?.name, err },
      'Sync job failed',
    );
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Sync job stalled');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Sync worker error');
  });

  logger.info('Sync worker started');
  return worker;
}

export async function stopSyncWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (connection) {
    await connection.quit().catch(() => {});
    connection = null;
  }
  syncQueue = null;
}

// ---------------------------------------------------------------------------
// Job helpers
// ---------------------------------------------------------------------------

export async function addFullSyncJob(accountId: string) {
  const queue = getQueue();
  if (!queue) {
    logger.warn({ accountId }, 'Redis not configured — cannot enqueue full sync job');
    return;
  }

  await queue.add(
    'full-sync',
    { accountId },
    {
      jobId: `full-sync:${accountId}`,
      priority: 1,
    },
  );
  logger.info({ accountId }, 'Full sync job added to queue');
}

export async function addIncrementalSyncJob(accountId: string) {
  const queue = getQueue();
  if (!queue) {
    logger.warn({ accountId }, 'Redis not configured — cannot enqueue incremental sync job');
    return;
  }

  const jobId = `incremental-sync:${accountId}`;

  const existingJob = await queue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (state === 'active' || state === 'waiting' || state === 'delayed') {
      logger.debug({ accountId, state }, 'Incremental sync job already queued, skipping');
      return;
    }
    await existingJob.remove().catch(() => {});
  }

  await queue.add(
    'incremental-sync',
    { accountId },
    {
      jobId,
      priority: 5,
    },
  );
  logger.debug({ accountId }, 'Incremental sync job added to queue');
}
