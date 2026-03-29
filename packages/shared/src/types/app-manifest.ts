// ─── App Registry Types ─────────────────────────────────────────────

/** Unique string identifier for each app */
export type AppId = string;

/** Minimum tenant plan required to use an app */
export type AppMinPlan = 'starter' | 'pro' | 'enterprise';

/** App category for grouping */
export type AppCategory = 'productivity' | 'communication' | 'data' | 'storage' | 'other';

/**
 * Shared (isomorphic) portion of the app manifest.
 * No React components, no Express routers — safe for both client and server.
 * Client and server extend this with environment-specific fields.
 */
export interface AppManifestBase {
  /** Unique app identifier, e.g. 'docs', 'crm'. Used as route prefix and DB key. */
  id: AppId;

  /** Human-readable name */
  name: string;

  /** i18n key for the sidebar label */
  labelKey: string;

  /** Lucide icon name (string) for server-safe reference */
  iconName: string;

  /** Brand color hex */
  color: string;

  /** Minimum tenant plan required */
  minPlan: AppMinPlan;

  /** App category for grouping in admin UI */
  category: AppCategory;

  /** IDs of other apps this one depends on */
  dependencies: AppId[];

  /** Whether this app is enabled by default for new tenants */
  defaultEnabled: boolean;

  /** Version string */
  version: string;
}

// ─── Cross-App Record Linking ───────────────────────────────────────

export interface RecordLink {
  id: string;
  sourceAppId: string;
  sourceRecordId: string;
  targetAppId: string;
  targetRecordId: string;
  linkType: string;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface LinkCount {
  appId: string;
  count: number;
}

export interface LinkedRecord {
  linkId: string;
  appId: string;
  recordId: string;
  title: string;
  linkType: string;
  createdAt: string;
}

export interface GlobalSearchResult {
  appId: string;
  recordId: string;
  title: string;
  appName: string;
}

// ─── Tenant App Access ──────────────────────────────────────────────

export interface TenantApp {
  id: string;
  tenantId: string;
  appId: string;
  isEnabled: boolean;
  enabledAt: string;
  enabledBy: string;
  config: Record<string, unknown>;
}
