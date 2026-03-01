import { eq, and } from 'drizzle-orm';
import { getPlatformDb } from '../../config/platform-database';
import { appCatalog } from '../../db/schema-platform';
import { logger } from '../../utils/logger';
import type { AtlasManifest } from '@atlasmail/shared';

export async function listCatalogApps(opts?: { category?: string }) {
  const db = getPlatformDb();

  if (opts?.category) {
    return db
      .select()
      .from(appCatalog)
      .where(and(eq(appCatalog.isPublished, true), eq(appCatalog.category, opts.category)));
  }

  return db.select().from(appCatalog).where(eq(appCatalog.isPublished, true));
}

export async function getCatalogApp(manifestId: string) {
  const db = getPlatformDb();
  const [app] = await db
    .select()
    .from(appCatalog)
    .where(eq(appCatalog.manifestId, manifestId))
    .limit(1);
  return app ?? null;
}

export async function getCatalogAppById(id: string) {
  const db = getPlatformDb();
  const [app] = await db
    .select()
    .from(appCatalog)
    .where(eq(appCatalog.id, id))
    .limit(1);
  return app ?? null;
}

export async function upsertCatalogApp(manifest: AtlasManifest) {
  const db = getPlatformDb();

  const existing = await getCatalogApp(manifest.id);

  if (existing) {
    const [updated] = await db
      .update(appCatalog)
      .set({
        name: manifest.name,
        category: manifest.category,
        tags: manifest.tags,
        iconUrl: manifest.ui.icon,
        color: manifest.ui.color,
        description: manifest.description,
        currentVersion: manifest.version,
        manifest: manifest as unknown as Record<string, unknown>,
        minPlan: manifest.minPlan,
        updatedAt: new Date(),
      })
      .where(eq(appCatalog.id, existing.id))
      .returning();

    logger.info({ manifestId: manifest.id }, 'Catalog app updated');
    return updated;
  }

  const [created] = await db
    .insert(appCatalog)
    .values({
      manifestId: manifest.id,
      name: manifest.name,
      category: manifest.category,
      tags: manifest.tags,
      iconUrl: manifest.ui.icon,
      color: manifest.ui.color,
      description: manifest.description,
      currentVersion: manifest.version,
      manifest: manifest as unknown as Record<string, unknown>,
      minPlan: manifest.minPlan,
      isPublished: true,
    })
    .returning();

  logger.info({ manifestId: manifest.id }, 'Catalog app created');
  return created;
}
