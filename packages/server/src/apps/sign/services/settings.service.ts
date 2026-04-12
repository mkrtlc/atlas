import { db } from '../../../config/database';
import { signSettings } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// ─── Types ─────────────────────────────────────────────────────────

export interface UpdateSignSettingsInput {
  reminderCadenceDays?: number;
  signatureExpiryDays?: number;
}

// ─── Settings ──────────────────────────────────────────────────────

export async function getSettings(tenantId: string) {
  const [settings] = await db
    .select()
    .from(signSettings)
    .where(eq(signSettings.tenantId, tenantId))
    .limit(1);

  if (settings) return settings;

  // Auto-create row with defaults so callers always get a stable shape.
  const now = new Date();
  const [created] = await db
    .insert(signSettings)
    .values({ tenantId, createdAt: now, updatedAt: now })
    .returning();
  return created;
}

export async function updateSettings(tenantId: string, input: UpdateSignSettingsInput) {
  const now = new Date();

  const [existing] = await db
    .select()
    .from(signSettings)
    .where(eq(signSettings.tenantId, tenantId))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(signSettings)
      .values({
        tenantId,
        ...input,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }

  const updates: Record<string, unknown> = { updatedAt: now };
  if (input.reminderCadenceDays !== undefined) updates.reminderCadenceDays = input.reminderCadenceDays;
  if (input.signatureExpiryDays !== undefined) updates.signatureExpiryDays = input.signatureExpiryDays;

  const [updated] = await db
    .update(signSettings)
    .set(updates)
    .where(eq(signSettings.tenantId, tenantId))
    .returning();

  return updated ?? null;
}
