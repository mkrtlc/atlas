import { db } from '../../config/database';
import { recurringInvoices } from '../../db/schema';
import { and, eq, lte, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { generateInvoiceFromRecurring } from './services/recurring-invoice.service';

/**
 * Daily scheduler that generates invoices from active recurring templates
 * whose nextRunAt is in the past.
 */
export async function runRecurringInvoices(): Promise<{
  processed: number;
  generated: number;
  autoEmailed: number;
  failed: number;
}> {
  let processed = 0;
  let generated = 0;
  let autoEmailed = 0;
  let failed = 0;

  try {
    // Find all active recurring templates whose nextRunAt is in the past
    const dueRows = await db
      .select({
        id: recurringInvoices.id,
        tenantId: recurringInvoices.tenantId,
        title: recurringInvoices.title,
      })
      .from(recurringInvoices)
      .where(
        and(
          eq(recurringInvoices.isActive, true),
          lte(recurringInvoices.nextRunAt, sql`NOW()`),
        ),
      );

    processed = dueRows.length;

    for (const row of dueRows) {
      try {
        const result = await generateInvoiceFromRecurring(row.id, row.tenantId);
        generated++;
        if (result.emailed) autoEmailed++;
      } catch (err: any) {
        failed++;
        logger.error(
          { err: err?.message, recurringId: row.id, tenantId: row.tenantId, title: row.title },
          'Recurring invoice generation failed',
        );
      }
    }

    if (processed > 0) {
      logger.info(
        { processed, generated, autoEmailed, failed },
        'Recurring invoice batch complete',
      );
    } else {
      logger.debug('Recurring invoice batch: no due templates');
    }
  } catch (err) {
    logger.error({ err }, 'Recurring invoice scheduler failed');
  }

  return { processed, generated, autoEmailed, failed };
}

// ─── Recurring invoice scheduler ────────────────────────────────────

const INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
const INITIAL_DELAY_MS = 30_000;

let timer: ReturnType<typeof setInterval> | null = null;
let initialTimer: ReturnType<typeof setTimeout> | null = null;

export function startRecurringInvoiceScheduler() {
  if (timer) return;

  // Initial run after a short delay (so the server is fully initialized)
  initialTimer = setTimeout(() => {
    runRecurringInvoices().catch((err) =>
      logger.error({ err }, 'Initial recurring invoice run failed'),
    );
  }, INITIAL_DELAY_MS);

  // Then daily
  timer = setInterval(() => {
    runRecurringInvoices().catch((err) =>
      logger.error({ err }, 'Scheduled recurring invoice run failed'),
    );
  }, INTERVAL_MS);

  logger.info('Recurring invoice scheduler started (daily)');
}

export function stopRecurringInvoiceScheduler() {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('Recurring invoice scheduler stopped');
  }
}
