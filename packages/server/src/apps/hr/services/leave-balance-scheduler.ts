import { db } from '../../../config/database';
import { hrLeavePolicyAssignments } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { allocateBalancesForYear } from './leave-config.service';
import { logger } from '../../../utils/logger';

/**
 * Checks all accounts with active policy assignments and allocates
 * leave balances for the current year if they don't already exist.
 * Designed to be called daily via the scheduler in index.ts.
 */
export async function checkLeaveBalances() {
  try {
    const currentYear = new Date().getFullYear();

    // Get all distinct account IDs that have active policy assignments
    const rows = await db.selectDistinct({ accountId: hrLeavePolicyAssignments.accountId })
      .from(hrLeavePolicyAssignments)
      .where(eq(hrLeavePolicyAssignments.isArchived, false));

    for (const row of rows) {
      await allocateBalancesForYear(row.accountId, currentYear);
    }

    logger.info({ accountCount: rows.length, year: currentYear }, 'Leave balance check completed');
  } catch (err) {
    logger.error({ err }, 'Leave balance check failed');
  }
}
