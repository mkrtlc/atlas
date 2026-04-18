import { db } from '../../../config/database';
import { projectSettings } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// ─── Types ─────────────────────────────────────────────────────────

export type WeekStartDay = 'monday' | 'sunday' | 'saturday';
export type ProjectVisibility = 'team' | 'private';

export interface UpdateWorkSettingsInput {
  weekStartDay?: WeekStartDay;
  defaultProjectVisibility?: ProjectVisibility;
  defaultBillable?: boolean;
}

// ─── Settings ──────────────────────────────────────────────────────

export async function getSettings(tenantId: string) {
  const [settings] = await db
    .select()
    .from(projectSettings)
    .where(eq(projectSettings.tenantId, tenantId))
    .limit(1);

  if (settings) return settings;

  // Auto-create row with schema defaults so the client always gets a stable shape.
  const now = new Date();
  const [created] = await db
    .insert(projectSettings)
    .values({ tenantId, createdAt: now, updatedAt: now })
    .returning();
  return created;
}

export async function updateSettings(tenantId: string, input: UpdateWorkSettingsInput) {
  const now = new Date();

  const [existing] = await db
    .select()
    .from(projectSettings)
    .where(eq(projectSettings.tenantId, tenantId))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(projectSettings)
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
  if (input.weekStartDay !== undefined) updates.weekStartDay = input.weekStartDay;
  if (input.defaultProjectVisibility !== undefined) updates.defaultProjectVisibility = input.defaultProjectVisibility;
  if (input.defaultBillable !== undefined) updates.defaultBillable = input.defaultBillable;

  const [updated] = await db
    .update(projectSettings)
    .set(updates)
    .where(eq(projectSettings.tenantId, tenantId))
    .returning();

  return updated ?? null;
}
