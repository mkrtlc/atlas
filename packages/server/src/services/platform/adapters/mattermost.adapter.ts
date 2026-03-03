import crypto from 'node:crypto';
import { logger } from '../../../utils/logger';
import type {
  AppProvisioningAdapter,
  ProvisioningContext,
  AdapterSetupContext,
  GetUserResult,
} from './base.adapter';

/**
 * Mattermost REST API v4 provisioning adapter.
 *
 * Uses the Mattermost server API to create/update/delete users and manage roles.
 * Docs: https://api.mattermost.com/
 */
export class MattermostAdapter implements AppProvisioningAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async api(
    baseUrl: string,
    basePath: string,
    path: string,
    token: string,
    opts: { method?: string; body?: unknown } = {},
  ): Promise<any> {
    const url = `${baseUrl}${basePath}${path}`;
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Mattermost API ${opts.method ?? 'GET'} ${path} returned ${res.status}: ${text}`);
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return res.json();
    }
    return null;
  }

  /**
   * Login as the first admin user to obtain a session token.
   * Mattermost auto-creates the first user as system_admin when the server starts.
   * We use a well-known bot account that gets created via the OIDC first-login flow.
   *
   * Fallback: create a local admin account via the API (only works when signup is
   * still enabled — i.e., on first boot before SSO-only is enforced).
   */
  async setupAdminToken(ctx: AdapterSetupContext): Promise<string> {
    const { appBaseUrl, adminApiBasePath, adminEmail, adminName } = ctx;

    // Try to create a local admin account for API access
    const password = generateSecurePassword();

    try {
      const createRes = await fetch(`${appBaseUrl}${adminApiBasePath}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          username: adminName.toLowerCase().replace(/\s+/g, '_'),
          password,
        }),
      });

      if (!createRes.ok && createRes.status !== 400) {
        throw new Error(`Failed to create admin user: ${createRes.status}`);
      }
    } catch (err) {
      logger.debug({ err }, 'Admin user creation failed — may already exist');
    }

    // Login to get session token
    const loginRes = await fetch(`${appBaseUrl}${adminApiBasePath}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login_id: adminEmail,
        password,
      }),
    });

    if (!loginRes.ok) {
      throw new Error(`Mattermost admin login failed: ${loginRes.status}`);
    }

    const token = loginRes.headers.get('token');
    if (!token) {
      throw new Error('Mattermost login response missing token header');
    }

    // Ensure the account has system_admin role
    const user = (await loginRes.json()) as { id: string; roles?: string };
    if (!user.roles?.includes('system_admin')) {
      logger.warn({ userId: user.id }, 'Admin user does not have system_admin role');
    }

    return token;
  }

  async provisionUser(ctx: ProvisioningContext): Promise<{ appUserId: string }> {
    const { appBaseUrl, adminApiBasePath, adminApiToken, userEmail, userName, appRole } = ctx;

    // Check if user already exists
    const existing = await this.getUser(ctx);
    if (existing.exists && existing.appUserId) {
      // Update role if needed
      if (existing.currentRole !== appRole) {
        await this.updateUserRole(ctx);
      }
      return { appUserId: existing.appUserId };
    }

    // Create user via API
    const user = await this.api(appBaseUrl, adminApiBasePath, '/users', adminApiToken, {
      method: 'POST',
      body: {
        email: userEmail,
        username: userEmail.split('@')[0].replace(/[^a-z0-9._-]/gi, '').substring(0, 22),
        auth_service: 'gitlab',
        auth_data: ctx.userId,
        first_name: userName.split(' ')[0] || '',
        last_name: userName.split(' ').slice(1).join(' ') || '',
      },
    });

    // Set role
    if (appRole && appRole !== 'system_user') {
      await this.api(appBaseUrl, adminApiBasePath, `/users/${user.id}/roles`, adminApiToken, {
        method: 'PUT',
        body: { roles: appRole },
      });
    }

    logger.info({ appUserId: user.id, email: userEmail }, 'Mattermost user provisioned');
    return { appUserId: user.id };
  }

  async updateUserRole(ctx: ProvisioningContext): Promise<void> {
    const { appBaseUrl, adminApiBasePath, adminApiToken, appRole } = ctx;

    const existing = await this.getUser(ctx);
    if (!existing.exists || !existing.appUserId) {
      throw new Error(`User ${ctx.userEmail} not found in Mattermost`);
    }

    await this.api(appBaseUrl, adminApiBasePath, `/users/${existing.appUserId}/roles`, adminApiToken, {
      method: 'PUT',
      body: { roles: appRole },
    });

    logger.info({ appUserId: existing.appUserId, newRole: appRole }, 'Mattermost user role updated');
  }

  async deprovisionUser(ctx: ProvisioningContext): Promise<void> {
    const { appBaseUrl, adminApiBasePath, adminApiToken } = ctx;

    const existing = await this.getUser(ctx);
    if (!existing.exists || !existing.appUserId) {
      logger.debug({ email: ctx.userEmail }, 'User not found in Mattermost — skipping deprovision');
      return;
    }

    await this.api(appBaseUrl, adminApiBasePath, `/users/${existing.appUserId}`, adminApiToken, {
      method: 'DELETE',
    });

    logger.info({ appUserId: existing.appUserId, email: ctx.userEmail }, 'Mattermost user deprovisioned');
  }

  async getUser(ctx: ProvisioningContext): Promise<GetUserResult> {
    const { appBaseUrl, adminApiBasePath, adminApiToken, userEmail } = ctx;

    try {
      const user = await this.api(
        appBaseUrl,
        adminApiBasePath,
        `/users/email/${encodeURIComponent(userEmail)}`,
        adminApiToken,
      );

      return {
        exists: true,
        appUserId: user.id,
        currentRole: user.roles,
      };
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes('404')) {
        return { exists: false };
      }
      throw err;
    }
  }
}

function generateSecurePassword(): string {
  return crypto.randomBytes(32).toString('base64url');
}
