import { describe, it, expect, vi } from 'vitest';

// Mock Excalidraw which causes import errors in test environment
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: () => null,
  convertToExcalidrawElements: (elements: unknown[]) => elements,
}));

import { appRegistry } from '../src/apps/index';

describe('AppRegistry', () => {
  it('getAll returns all registered apps', () => {
    const apps = appRegistry.getAll();
    expect(apps.length).toBeGreaterThanOrEqual(8);
  });

  it('getAll returns apps sorted by sidebarOrder', () => {
    const apps = appRegistry.getAll();
    for (let i = 1; i < apps.length; i++) {
      expect(apps[i].sidebarOrder).toBeGreaterThanOrEqual(apps[i - 1].sidebarOrder);
    }
  });

  it('getById returns the correct app for "crm"', () => {
    const crm = appRegistry.get('crm');
    expect(crm).toBeDefined();
    expect(crm!.id).toBe('crm');
    expect(crm!.name).toBe('CRM');
  });

  it('getById returns undefined for unknown app', () => {
    const unknown = appRegistry.get('nonexistent-app');
    expect(unknown).toBeUndefined();
  });

  it('every app has required manifest fields (id, name, icon, routes)', () => {
    const apps = appRegistry.getAll();
    for (const app of apps) {
      expect(app.id).toBeTruthy();
      expect(app.name).toBeTruthy();
      expect(app.icon).toBeDefined();
      expect(Array.isArray(app.routes)).toBe(true);
    }
  });

  it('every app has a sidebarOrder number', () => {
    const apps = appRegistry.getAll();
    for (const app of apps) {
      expect(typeof app.sidebarOrder).toBe('number');
    }
  });

  it('every app has a color string', () => {
    const apps = appRegistry.getAll();
    for (const app of apps) {
      expect(typeof app.color).toBe('string');
      expect(app.color.length).toBeGreaterThan(0);
    }
  });

  it('getSettingsCategories returns categories from apps that have them', () => {
    const categories = appRegistry.getSettingsCategories();
    expect(Array.isArray(categories)).toBe(true);
    // CRM at minimum has a settings category
    const crmCategory = categories.find((c) => c.id === 'crm');
    expect(crmCategory).toBeDefined();
    expect(crmCategory!.panels.length).toBeGreaterThan(0);
  });

  it('getRoutes returns all routes from all apps', () => {
    const routes = appRegistry.getRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(8);
    // Every route should have a path and a component
    for (const route of routes) {
      expect(typeof route.path).toBe('string');
      expect(route.component).toBeDefined();
    }
  });

  it('getAllWidgets returns widgets with app metadata attached', () => {
    const widgets = appRegistry.getAllWidgets();
    expect(Array.isArray(widgets)).toBe(true);
    // CRM has a pipeline widget
    const pipelineWidget = widgets.find((w) => w.id === 'pipeline');
    expect(pipelineWidget).toBeDefined();
    expect(pipelineWidget!.appId).toBe('crm');
    expect(pipelineWidget!.appName).toBe('CRM');
    expect(typeof pipelineWidget!.appColor).toBe('string');
  });

  it('getAppWidgets returns widgets for a specific app', () => {
    const crmWidgets = appRegistry.getAppWidgets('crm');
    expect(Array.isArray(crmWidgets)).toBe(true);
    expect(crmWidgets.length).toBeGreaterThanOrEqual(1);
    expect(crmWidgets[0].id).toBe('pipeline');
  });

  it('getEnabled filters apps by enabled set', () => {
    const enabled = appRegistry.getEnabled(new Set(['crm', 'hr']));
    expect(enabled.length).toBe(2);
    const ids = enabled.map((a) => a.id);
    expect(ids).toContain('crm');
    expect(ids).toContain('hr');
  });

  it('getNavItems returns nav entries with route and icon', () => {
    const navItems = appRegistry.getNavItems();
    expect(navItems.length).toBeGreaterThanOrEqual(8);
    for (const item of navItems) {
      expect(item.id).toBeTruthy();
      expect(item.labelKey).toBeTruthy();
      expect(item.icon).toBeDefined();
      expect(typeof item.route).toBe('string');
    }
  });
});
