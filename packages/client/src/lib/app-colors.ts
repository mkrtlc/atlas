import { appRegistry } from '../config/app-registry';

const FALLBACK_APP_COLORS: Record<string, string> = {
  crm: '#f97316',
  hr: '#14b8a6',
  sign: '#8b5cf6',
  drive: '#64748b',
  tables: '#2d8a6e',
  tasks: '#6366f1',
  docs: '#c4856c',
  draw: '#e06c9f',
  projects: '#0ea5e9',
  platform: '#6b7280',
};

export function getAppColor(appId: string): string {
  const app = appRegistry.getAll().find((a) => a.id === appId);
  return app?.color ?? FALLBACK_APP_COLORS[appId] ?? 'var(--color-text-tertiary)';
}

export function getAppLabel(appId: string): string {
  const app = appRegistry.getAll().find((a) => a.id === appId);
  return app?.name ?? appId.toUpperCase();
}
