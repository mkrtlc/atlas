import type { Request, Response } from 'express';
import * as tenantService from '../services/platform/tenant.service';
import * as catalogService from '../services/platform/catalog.service';
import * as installService from '../services/platform/install.service';
import { addAppInstallJob, addAppBackupJob } from '../jobs/app-install.worker';
import { logger } from '../utils/logger';

/** Safely extract a route param (Express 5 returns string | string[]). */
function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

// ─── Catalog ─────────────────────────────────────────────────────────

export async function listCatalog(req: Request, res: Response) {
  try {
    const category = req.query.category as string | undefined;
    const apps = await catalogService.listCatalogApps({ category });
    res.json({ success: true, data: { apps } });
  } catch (err) {
    logger.error({ err }, 'Failed to list catalog');
    res.status(500).json({ success: false, error: 'Failed to list catalog apps' });
  }
}

export async function getCatalogApp(req: Request, res: Response) {
  try {
    const app = await catalogService.getCatalogApp(param(req, 'manifestId'));
    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }
    res.json({ success: true, data: app });
  } catch (err) {
    logger.error({ err }, 'Failed to get catalog app');
    res.status(500).json({ success: false, error: 'Failed to get catalog app' });
  }
}

// ─── Tenants ─────────────────────────────────────────────────────────

export async function createTenant(req: Request, res: Response) {
  try {
    const { slug, name, plan } = req.body;
    if (!slug || !name) {
      res.status(400).json({ success: false, error: 'slug and name are required' });
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) || slug.length > 63) {
      res.status(400).json({ success: false, error: 'slug must be lowercase alphanumeric with hyphens, max 63 chars' });
      return;
    }

    const tenant = await tenantService.createTenant({ slug, name, plan }, req.auth!.userId);
    res.status(201).json({ success: true, data: tenant });
  } catch (err: any) {
    if (err?.code === '23505') { // unique violation
      res.status(409).json({ success: false, error: 'Tenant slug already taken' });
      return;
    }
    logger.error({ err }, 'Failed to create tenant');
    res.status(500).json({ success: false, error: 'Failed to create tenant' });
  }
}

export async function listMyTenants(req: Request, res: Response) {
  try {
    const tenants = await tenantService.listTenantsForUser(req.auth!.userId);
    res.json({ success: true, data: { tenants } });
  } catch (err) {
    logger.error({ err }, 'Failed to list tenants');
    res.status(500).json({ success: false, error: 'Failed to list tenants' });
  }
}

export async function getTenant(req: Request, res: Response) {
  try {
    const tenant = await tenantService.getTenantById(param(req, 'id'));
    if (!tenant) {
      res.status(404).json({ success: false, error: 'Tenant not found' });
      return;
    }

    // Check membership
    const membership = await tenantService.getTenantMembership(tenant.id, req.auth!.userId);
    if (!membership) {
      res.status(403).json({ success: false, error: 'Not a member of this tenant' });
      return;
    }

    res.json({ success: true, data: { ...tenant, role: membership.role } });
  } catch (err) {
    logger.error({ err }, 'Failed to get tenant');
    res.status(500).json({ success: false, error: 'Failed to get tenant' });
  }
}

// ─── Installations ───────────────────────────────────────────────────

export async function listInstallations(req: Request, res: Response) {
  try {
    const tenantId = param(req, 'id');

    // Check membership
    const membership = await tenantService.getTenantMembership(tenantId, req.auth!.userId);
    if (!membership) {
      res.status(403).json({ success: false, error: 'Not a member of this tenant' });
      return;
    }

    const installations = await installService.listInstallations(tenantId);
    res.json({ success: true, data: { installations } });
  } catch (err) {
    logger.error({ err }, 'Failed to list installations');
    res.status(500).json({ success: false, error: 'Failed to list installations' });
  }
}

export async function installApp(req: Request, res: Response) {
  try {
    const tenantId = param(req, 'id');

    // Only owner/admin can install
    const membership = await tenantService.getTenantMembership(tenantId, req.auth!.userId);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      res.status(403).json({ success: false, error: 'Only owners and admins can install apps' });
      return;
    }

    const { catalogAppId, subdomain, customEnv } = req.body;
    if (!catalogAppId || !subdomain) {
      res.status(400).json({ success: false, error: 'catalogAppId and subdomain are required' });
      return;
    }

    // Validate subdomain
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
      res.status(400).json({ success: false, error: 'Invalid subdomain format' });
      return;
    }

    // Enqueue install job (async via BullMQ)
    await addAppInstallJob(tenantId, { catalogAppId, subdomain, customEnv });

    res.status(202).json({
      success: true,
      data: { status: 'installing', message: 'App installation started' },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start app installation');
    res.status(500).json({ success: false, error: 'Failed to start installation' });
  }
}

export async function getInstallation(req: Request, res: Response) {
  try {
    const inst = await installService.getInstallation(param(req, 'iid'));
    if (!inst) {
      res.status(404).json({ success: false, error: 'Installation not found' });
      return;
    }

    // Verify tenant membership
    const membership = await tenantService.getTenantMembership(inst.tenantId, req.auth!.userId);
    if (!membership) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    res.json({ success: true, data: inst });
  } catch (err) {
    logger.error({ err }, 'Failed to get installation');
    res.status(500).json({ success: false, error: 'Failed to get installation' });
  }
}

export async function startApp(req: Request, res: Response) {
  try {
    await installService.startApp(param(req, 'iid'));
    res.json({ success: true, data: { status: 'running' } });
  } catch (err) {
    logger.error({ err }, 'Failed to start app');
    res.status(500).json({ success: false, error: 'Failed to start app' });
  }
}

export async function stopApp(req: Request, res: Response) {
  try {
    await installService.stopApp(param(req, 'iid'));
    res.json({ success: true, data: { status: 'stopped' } });
  } catch (err) {
    logger.error({ err }, 'Failed to stop app');
    res.status(500).json({ success: false, error: 'Failed to stop app' });
  }
}

export async function restartApp(req: Request, res: Response) {
  try {
    await installService.restartApp(param(req, 'iid'));
    res.json({ success: true, data: { status: 'restarting' } });
  } catch (err) {
    logger.error({ err }, 'Failed to restart app');
    res.status(500).json({ success: false, error: 'Failed to restart app' });
  }
}

export async function createBackup(req: Request, res: Response) {
  try {
    const inst = await installService.getInstallation(param(req, 'iid'));
    if (!inst) {
      res.status(404).json({ success: false, error: 'Installation not found' });
      return;
    }

    await addAppBackupJob(param(req, 'iid'), 'manual');
    res.status(202).json({ success: true, data: { status: 'pending', message: 'Backup started' } });
  } catch (err) {
    logger.error({ err }, 'Failed to create backup');
    res.status(500).json({ success: false, error: 'Failed to create backup' });
  }
}

export async function listBackups(req: Request, res: Response) {
  try {
    const backups = await installService.listBackups(param(req, 'iid'));
    res.json({ success: true, data: { backups } });
  } catch (err) {
    logger.error({ err }, 'Failed to list backups');
    res.status(500).json({ success: false, error: 'Failed to list backups' });
  }
}

export async function uninstallApp(req: Request, res: Response) {
  try {
    const inst = await installService.getInstallation(param(req, 'iid'));
    if (!inst) {
      res.status(404).json({ success: false, error: 'Installation not found' });
      return;
    }

    // Only owner/admin can uninstall
    const membership = await tenantService.getTenantMembership(inst.tenantId, req.auth!.userId);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      res.status(403).json({ success: false, error: 'Only owners and admins can uninstall apps' });
      return;
    }

    await installService.uninstallApp(param(req, 'iid'));
    res.json({ success: true, data: { message: 'App uninstalled' } });
  } catch (err) {
    logger.error({ err }, 'Failed to uninstall app');
    res.status(500).json({ success: false, error: 'Failed to uninstall app' });
  }
}
