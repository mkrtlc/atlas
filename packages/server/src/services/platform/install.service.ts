import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import { getPlatformDb } from '../../config/platform-database';
import { appInstallations, appBackups } from '../../db/schema-platform';
import { getCatalogAppById } from './catalog.service';
import { getTenantById } from './tenant.service';
import { provisionAddons, deprovisionAddons } from './addon.service';
import { deployApp, createIngressRoute, deleteAppResources, scaleDeployment, restartDeployment, checkDeploymentHealth } from './k8s.service';
import { encrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import type { AtlasManifest, InstallAppInput } from '@atlasmail/shared';

/**
 * Install an app for a tenant. Called from the BullMQ worker (async).
 * Steps: provision DB → create K8s resources → register OIDC → poll health.
 */
export async function installApp(tenantId: string, input: InstallAppInput) {
  const db = getPlatformDb();
  const catalogApp = await getCatalogAppById(input.catalogAppId);
  if (!catalogApp) throw new Error(`Catalog app ${input.catalogAppId} not found`);

  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

  const manifest = catalogApp.manifest as unknown as AtlasManifest;
  const installationId = crypto.randomUUID();
  const deploymentName = `${manifest.id.replace(/\./g, '-')}-${installationId.slice(0, 8)}`;

  // Create installation record (status: installing)
  const [installation] = await db.insert(appInstallations).values({
    id: installationId,
    tenantId,
    catalogAppId: input.catalogAppId,
    installedVersion: catalogApp.currentVersion,
    status: 'installing',
    subdomain: input.subdomain,
    k8sDeploymentName: deploymentName,
    customEnv: input.customEnv ?? {},
  }).returning();

  try {
    // 1. Provision addons
    const addons = await provisionAddons(installationId, manifest, tenant.slug);
    const addonRefs: Record<string, string> = {};
    for (const addon of addons) {
      addonRefs[addon.addonType] = addon.database;
    }

    // 2. Build env vars for container
    const hostname = `${input.subdomain}.${tenant.slug}.atlas.so`;
    const oidcClientId = `atlas-${manifest.id}-${installationId.slice(0, 8)}`;
    const oidcClientSecret = crypto.randomBytes(32).toString('base64url');

    const containerEnv: Record<string, string> = {
      ATLAS_TENANT_ID: tenantId,
      ATLAS_INSTALLATION_ID: installationId,
      OIDC_ISSUER: `${env.PLATFORM_PUBLIC_URL || env.SERVER_PUBLIC_URL}/oidc/tenants/${tenant.slug}`,
      OIDC_CLIENT_ID: oidcClientId,
      OIDC_CLIENT_SECRET: oidcClientSecret,
      ...(input.customEnv ?? {}),
    };

    // Add addon connection strings
    for (const addon of addons) {
      if (addon.addonType === 'postgresql') {
        containerEnv.DATABASE_URL = `postgresql://${addon.username}:${addon.password}@${addon.host}:${addon.port}/${addon.database}`;
      }
      if (addon.addonType === 'redis') {
        containerEnv.REDIS_URL = `redis://${addon.host}:${addon.port}`;
        containerEnv.REDIS_PREFIX = addon.database; // key prefix
      }
    }

    // 3. Deploy to K8s
    await deployApp({
      namespace: tenant.k8sNamespace,
      deploymentName,
      manifest,
      envVars: containerEnv,
      installationId,
    });

    // 4. Create IngressRoute
    const serviceName = `${deploymentName}-svc`;
    await createIngressRoute({
      namespace: tenant.k8sNamespace,
      installationId,
      hostname,
      serviceName,
      servicePort: manifest.runtime.httpPort,
      tlsSecretName: `${tenant.k8sNamespace}-tls`,
    });

    // 5. Update installation with OIDC + addon refs
    await db.update(appInstallations).set({
      oidcClientId,
      oidcClientSecret: encrypt(oidcClientSecret),
      addonRefs,
      status: 'running',
      updatedAt: new Date(),
    }).where(eq(appInstallations.id, installationId));

    logger.info({ installationId, tenantId, app: manifest.id }, 'App installed successfully');
    return installation;
  } catch (err) {
    // Mark as error
    await db.update(appInstallations).set({
      status: 'error',
      updatedAt: new Date(),
    }).where(eq(appInstallations.id, installationId));

    logger.error({ err, installationId }, 'App installation failed');
    throw err;
  }
}

export async function getInstallation(installationId: string) {
  const db = getPlatformDb();
  const [inst] = await db.select().from(appInstallations).where(eq(appInstallations.id, installationId)).limit(1);
  return inst ?? null;
}

export async function listInstallations(tenantId: string) {
  const db = getPlatformDb();
  return db.select().from(appInstallations).where(eq(appInstallations.tenantId, tenantId));
}

export async function startApp(installationId: string) {
  const inst = await getInstallation(installationId);
  if (!inst || !inst.k8sDeploymentName) throw new Error('Installation not found');

  const tenant = await getTenantById(inst.tenantId);
  if (!tenant) throw new Error('Tenant not found');

  await scaleDeployment(tenant.k8sNamespace, inst.k8sDeploymentName, 1);

  const db = getPlatformDb();
  await db.update(appInstallations).set({ status: 'running', updatedAt: new Date() }).where(eq(appInstallations.id, installationId));
}

export async function stopApp(installationId: string) {
  const inst = await getInstallation(installationId);
  if (!inst || !inst.k8sDeploymentName) throw new Error('Installation not found');

  const tenant = await getTenantById(inst.tenantId);
  if (!tenant) throw new Error('Tenant not found');

  await scaleDeployment(tenant.k8sNamespace, inst.k8sDeploymentName, 0);

  const db = getPlatformDb();
  await db.update(appInstallations).set({ status: 'stopped', updatedAt: new Date() }).where(eq(appInstallations.id, installationId));
}

export async function restartApp(installationId: string) {
  const inst = await getInstallation(installationId);
  if (!inst || !inst.k8sDeploymentName) throw new Error('Installation not found');

  const tenant = await getTenantById(inst.tenantId);
  if (!tenant) throw new Error('Tenant not found');

  await restartDeployment(tenant.k8sNamespace, inst.k8sDeploymentName);
}

export async function uninstallApp(installationId: string) {
  const db = getPlatformDb();
  const inst = await getInstallation(installationId);
  if (!inst) throw new Error('Installation not found');

  const tenant = await getTenantById(inst.tenantId);
  if (!tenant) throw new Error('Tenant not found');

  // 1. Delete K8s resources
  if (inst.k8sDeploymentName) {
    await deleteAppResources(tenant.k8sNamespace, inst.k8sDeploymentName, installationId);
  }

  // 2. Deprovision addons
  await deprovisionAddons(installationId);

  // 3. Delete installation record (cascades to addons and backups)
  await db.delete(appInstallations).where(eq(appInstallations.id, installationId));

  logger.info({ installationId, tenantId: inst.tenantId }, 'App uninstalled');
}

export async function updateHealthStatus(installationId: string) {
  const db = getPlatformDb();
  const inst = await getInstallation(installationId);
  if (!inst || !inst.k8sDeploymentName || inst.status !== 'running') return;

  const tenant = await getTenantById(inst.tenantId);
  if (!tenant) return;

  const health = await checkDeploymentHealth(tenant.k8sNamespace, inst.k8sDeploymentName);
  await db.update(appInstallations).set({
    lastHealthStatus: health,
    updatedAt: new Date(),
  }).where(eq(appInstallations.id, installationId));
}

export async function createBackupRecord(installationId: string, triggeredBy: string) {
  const db = getPlatformDb();
  const [backup] = await db.insert(appBackups).values({
    installationId,
    triggeredBy,
    status: 'pending',
  }).returning();
  return backup;
}

export async function listBackups(installationId: string) {
  const db = getPlatformDb();
  return db.select().from(appBackups).where(eq(appBackups.installationId, installationId));
}
