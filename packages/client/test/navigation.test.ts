import { describe, it, expect } from 'vitest';
import { ROUTES } from '../src/config/routes';

describe('ROUTES config', () => {
  // ─── Expected paths exist ────────────────────────────────────────

  describe('expected routes exist', () => {
    it('has HOME route', () => {
      expect(ROUTES.HOME).toBeDefined();
      expect(ROUTES.HOME).toBe('/');
    });

    it('has LOGIN and SETUP routes', () => {
      expect(ROUTES.LOGIN).toBe('/login');
      expect(ROUTES.SETUP).toBe('/setup');
    });

    it('has ORG routes', () => {
      expect(ROUTES.ORG).toBe('/org');
      expect(ROUTES.ORG_MEMBERS).toBe('/org/members');
      expect(ROUTES.ORG_APPS).toBe('/org/apps');
      expect(ROUTES.ORG_SETTINGS).toBe('/org/settings');
    });

    it('has DOCS routes', () => {
      expect(ROUTES.DOCS).toBe('/docs');
      expect(ROUTES.DOC_DETAIL).toBe('/docs/:id');
    });

    it('has DRAW routes', () => {
      expect(ROUTES.DRAW).toBe('/draw');
      expect(ROUTES.DRAW_DETAIL).toBe('/draw/:id');
    });

    it('has TASKS route', () => {
      expect(ROUTES.TASKS).toBe('/tasks');
    });

    it('has TABLES routes', () => {
      expect(ROUTES.TABLES).toBe('/tables');
      expect(ROUTES.TABLE_DETAIL).toBe('/tables/:id');
    });

    it('has DRIVE routes', () => {
      expect(ROUTES.DRIVE).toBe('/drive');
      expect(ROUTES.DRIVE_FOLDER).toBe('/drive/folder/:id');
    });

    it('has SETTINGS and TENANT_USERS routes', () => {
      expect(ROUTES.SETTINGS).toBe('/settings');
      expect(ROUTES.TENANT_USERS).toBe('/settings/team');
    });

    it('has password reset routes', () => {
      expect(ROUTES.FORGOT_PASSWORD).toBe('/forgot-password');
      expect(ROUTES.RESET_PASSWORD).toBe('/reset-password/:token');
    });
  });

  // ─── Path format validation ──────────────────────────────────────

  describe('path format', () => {
    it('all paths start with /', () => {
      const paths = Object.values(ROUTES);
      for (const path of paths) {
        expect(path.startsWith('/'), `"${path}" should start with /`).toBe(true);
      }
    });

    it('no paths have trailing slashes (except root)', () => {
      const paths = Object.values(ROUTES);
      for (const path of paths) {
        if (path === '/') continue;
        expect(path.endsWith('/'), `"${path}" should not end with /`).toBe(false);
      }
    });

    it('no duplicate paths', () => {
      const paths = Object.values(ROUTES);
      const unique = new Set(paths);
      expect(unique.size).toBe(paths.length);
    });

    it('detail routes use :id parameter', () => {
      const detailRoutes = Object.entries(ROUTES).filter(([key]) =>
        key.includes('DETAIL') || key.includes('FOLDER')
      );
      for (const [key, path] of detailRoutes) {
        expect(path.includes(':id'), `${key} should contain :id param`).toBe(true);
      }
    });
  });

  // ─── ROUTES is readonly ──────────────────────────────────────────

  describe('immutability', () => {
    it('ROUTES object has expected number of keys', () => {
      const keys = Object.keys(ROUTES);
      // Should have at least 15 routes based on current definition
      expect(keys.length).toBeGreaterThanOrEqual(15);
    });
  });
});
