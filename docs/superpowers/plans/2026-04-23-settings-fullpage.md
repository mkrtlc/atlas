# Settings Full-Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote `SettingsModal` to a real `/settings/:scope/:category?/:panel?` route with a single 260px sidebar, scroll persistence, Esc-to-back, and last-visited memory. Delete the modal.

**Architecture:** React Router v6 splat route parses URL segments, looks up the category+panel from the existing registry, renders the panel component inside a new `SettingsPage` shell (sidebar + content). Call sites switch from `openSettings(app, panel)` Zustand action to `navigate(...)`. Existing panel components are not touched — they work identically in a modal or a page. Ships in two commits: shell + migration (C1), then cleanup of unused store/modal (C2).

**Tech Stack:** React 19, TypeScript, React Router v6, Zustand (pruned), Radix Dialog (unaffected — dialogs inside panels stay), `react-i18next` (existing keys reused).

---

## File Structure

### Created (3 files)
- `packages/client/src/pages/settings-page.tsx` — new page shell: splat-route parsing, Esc-to-back, scroll persistence, last-visited write, renders sidebar + active panel.
- `packages/client/src/components/settings/settings-sidebar.tsx` — new left sidebar: category headers + nested panel links. Accepts `{ categories, activePanelUrl }`.
- `packages/client/src/config/settings-url.ts` — new helper module: `toUrlSegments(categoryId, panelId) → string[]`, `fromUrlSegments(segs) → { category, panel } | null`, plus a `readLastVisited() / writeLastVisited()` pair backed by localStorage.

### Modified (3 files + 16 call sites)
- `packages/client/src/App.tsx` — replace single `/settings` → `<SettingsPage />` route with splat; remove `<SettingsModal />` mount.
- `packages/client/src/config/settings-registry.ts` — add `categoryI18nKey(categoryId)` and `panelI18nKey(panelId)` helpers so the new sidebar reuses the existing i18n maps without importing `pages/settings.tsx`.
- 16 call sites listed in Task 8.

### Deleted in C2 (3 files + store pruning)
- `packages/client/src/pages/settings.tsx` — old modal + `SettingsPage` auto-opener.
- `packages/client/src/components/settings/settings-modal.tsx` — only exports `SidebarNavButton` (unused by new page).
- `openSettings / closeSettings / toggleSettings / settingsOpen / settingsApp / settingsPanel` from `stores/ui-store.ts`.
- `atlas_settings_position` localStorage key (replaced by `atlas_settings_last_panel`).

### Not touched (enforce in review)
- `packages/client/src/components/settings/*-panel.tsx` — all 10 global + app panels; they keep their current APIs.
- Per-app `manifest.ts` `settingsCategory` — unchanged.
- `pages/home.tsx` Home widgets settings panel rendering — unchanged.
- Phase B1 rail — unchanged. Settings icon already links to `/settings`.

---

## Task 1: Verify clean tree

- [ ] **Step 1: Confirm clean working tree**

```bash
cd /Users/gorkemcetin/atlasmail
git status
git log -1 --oneline
```

Expected: `nothing to commit, working tree clean`. HEAD should be `c25c5a4 docs(settings): spec for promoting settings modal to full /settings page` or later.

If not clean, stop.

---

## Task 2: URL helper module

**Files:**
- Create: `packages/client/src/config/settings-url.ts`

The helpers here isolate URL ↔ registry mapping so both the page shell and the sidebar import the same source of truth. Single responsibility: URL encoding.

- [ ] **Step 1: Create the helper file**

Create `packages/client/src/config/settings-url.ts` with exactly this content:

```ts
import type { SettingsCategory } from './settings-registry';

const LAST_VISITED_KEY = 'atlas_settings_last_panel';

/**
 * Convert an internal category id + panel id into URL path segments.
 * `global` category → `['platform', panelId]`
 * anything else → `['apps', categoryId, panelId]`
 */
export function toUrlSegments(categoryId: string, panelId: string): string[] {
  if (categoryId === 'global') {
    return ['platform', panelId];
  }
  return ['apps', categoryId, panelId];
}

/** Build the full path for a category + panel. */
export function urlForPanel(categoryId: string, panelId: string): string {
  const segs = toUrlSegments(categoryId, panelId);
  return '/settings/' + segs.join('/');
}

export interface ResolvedPanel {
  categoryId: string;
  panelId: string;
}

/**
 * Parse URL segments from a splat match (after `/settings/`) back into a
 * category + panel. Returns null when the URL is incomplete (bare `/settings`
 * or `/settings/platform` without a panel) — caller handles redirect.
 */
export function fromUrlSegments(segs: string[]): ResolvedPanel | null {
  if (segs.length === 0) return null;
  if (segs[0] === 'platform') {
    if (segs.length < 2) return null;
    return { categoryId: 'global', panelId: segs[1] };
  }
  if (segs[0] === 'apps') {
    if (segs.length < 3) return null;
    return { categoryId: segs[1], panelId: segs[2] };
  }
  return null;
}

/**
 * When the URL names a scope (platform or apps/:appId) but no panel, return
 * the first panel in that category so the page can redirect there.
 */
export function firstPanelOfUrlScope(
  segs: string[],
  categories: SettingsCategory[],
): ResolvedPanel | null {
  if (segs[0] === 'platform') {
    const cat = categories.find((c) => c.id === 'global');
    if (!cat || cat.panels.length === 0) return null;
    return { categoryId: 'global', panelId: cat.panels[0].id };
  }
  if (segs[0] === 'apps' && segs[1]) {
    const cat = categories.find((c) => c.id === segs[1]);
    if (!cat || cat.panels.length === 0) return null;
    return { categoryId: cat.id, panelId: cat.panels[0].id };
  }
  return null;
}

export function readLastVisited(): string | null {
  try {
    return localStorage.getItem(LAST_VISITED_KEY);
  } catch {
    return null;
  }
}

export function writeLastVisited(path: string): void {
  try {
    localStorage.setItem(LAST_VISITED_KEY, path);
  } catch {
    /* ignore quota / private-mode errors */
  }
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 3: Commit**

Do NOT commit yet — Tasks 2–7 bundle into C1. Proceed.

---

## Task 3: Registry i18n helpers

**Files:**
- Modify: `packages/client/src/config/settings-registry.ts`

The existing `pages/settings.tsx` hard-codes two maps: `PANEL_KEY_MAP` (panel id → i18n key) and `CATEGORY_KEY_MAP` (category id → i18n key). The new sidebar needs the same maps. Move them into the registry so both page and sidebar import from one place.

- [ ] **Step 1: Append helpers to settings-registry.ts**

At the end of `packages/client/src/config/settings-registry.ts` (after the `getSettingsCategories` function), append:

```ts
// ---------------------------------------------------------------------------
// i18n key lookups — used by the Settings sidebar
// ---------------------------------------------------------------------------

const PANEL_I18N_KEYS: Record<string, string> = {
  general: 'settingsPanel.panels.general',
  appearance: 'settingsPanel.panels.appearance',
  formats: 'settingsPanel.panels.formats',
  'data-model': 'settingsPanel.panels.dataModel',
  'home-background': 'settingsPanel.panels.homeBackground',
  'home-widgets': 'settingsPanel.panels.widgets',
  about: 'settingsPanel.panels.about',
  stages: 'settingsPanel.panels.pipelineStages',
  integrations: 'settingsPanel.panels.integrations',
  editor: 'settingsPanel.panels.editor',
  startup: 'settingsPanel.panels.startup',
  canvas: 'settingsPanel.panels.canvas',
  export: 'settingsPanel.panels.export',
  display: 'settingsPanel.panels.display',
  files: 'settingsPanel.panels.files',
  regional: 'settingsPanel.panels.regional',
  behavior: 'settingsPanel.panels.behavior',
  updates: 'settingsPanel.panels.updates',
};

const CATEGORY_I18N_KEYS: Record<string, string> = {
  global: 'settingsPanel.categories.global',
  crm: 'settingsPanel.categories.crm',
  hr: 'settingsPanel.categories.hr',
  documents: 'settingsPanel.categories.documents',
  draw: 'settingsPanel.categories.draw',
  drive: 'settingsPanel.categories.drive',
  tables: 'settingsPanel.categories.tables',
  tasks: 'settingsPanel.categories.tasks',
  projects: 'settingsPanel.categories.projects',
  sign: 'settingsPanel.categories.sign',
  invoices: 'settingsPanel.categories.invoices',
};

export function panelI18nKey(panelId: string): string | null {
  return PANEL_I18N_KEYS[panelId] ?? null;
}

export function categoryI18nKey(categoryId: string): string | null {
  return CATEGORY_I18N_KEYS[categoryId] ?? null;
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 3: No commit yet**

Part of C1 — continue to Task 4.

---

## Task 4: Settings sidebar component

**Files:**
- Create: `packages/client/src/components/settings/settings-sidebar.tsx`

Single 260px left sidebar: a sticky title, then for each category a small uppercase header followed by panel rows. Active panel highlights with accent-subtle.

- [ ] **Step 1: Create the file**

Create `packages/client/src/components/settings/settings-sidebar.tsx` with exactly:

```tsx
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { SettingsCategory } from '../../config/settings-registry';
import { categoryI18nKey, panelI18nKey } from '../../config/settings-registry';
import { urlForPanel } from '../../config/settings-url';

interface SettingsSidebarProps {
  categories: SettingsCategory[];
  activeCategoryId: string;
  activePanelId: string;
}

export function SettingsSidebar({ categories, activeCategoryId, activePanelId }: SettingsSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      aria-label="Settings navigation"
      style={{
        width: 260,
        flexShrink: 0,
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border-primary)',
        overflowY: 'auto',
        padding: '18px 0',
      }}
    >
      <div
        style={{
          padding: '0 18px 14px',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {t('settings.title', 'Settings')}
      </div>

      {categories.map((cat) => {
        const catKey = categoryI18nKey(cat.id);
        const catLabel = catKey ? t(catKey, cat.label) : cat.label;
        return (
          <div key={cat.id} style={{ padding: '10px 0' }}>
            <div
              style={{
                padding: '0 18px 6px',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-family)',
              }}
            >
              {catLabel}
            </div>
            {cat.panels.map((panel) => {
              const isActive = cat.id === activeCategoryId && panel.id === activePanelId;
              const panelKey = panelI18nKey(panel.id);
              const panelLabel = panelKey ? t(panelKey, panel.label) : panel.label;
              const Icon = panel.icon;
              return (
                <Link
                  key={panel.id}
                  to={urlForPanel(cat.id, panel.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 18px',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-family)',
                    color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                    textDecoration: 'none',
                    borderLeft: isActive ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                    transition: 'background 120ms ease, color 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--color-surface-hover)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }
                  }}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  {panelLabel}
                </Link>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`. If `t('settings.title', 'Settings')` complains, note it — we'll rely on the fallback; no new translation keys needed.

- [ ] **Step 3: No commit yet**

Continue to Task 5.

---

## Task 5: Settings page shell

**Files:**
- Create: `packages/client/src/pages/settings-page.tsx`

Parses the splat URL, resolves to a panel, renders sidebar + content. Handles Esc, scroll persistence, last-visited write, and redirects for bare `/settings` or scope-only URLs.

- [ ] **Step 1: Create the file**

Create `packages/client/src/pages/settings-page.tsx` with exactly:

```tsx
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { getSettingsCategories } from '../config/settings-registry';
import { appRegistry } from '../apps';
import { SettingsSidebar } from '../components/settings/settings-sidebar';
import {
  fromUrlSegments,
  firstPanelOfUrlScope,
  urlForPanel,
  readLastVisited,
  writeLastVisited,
} from '../config/settings-url';
import { useAuthStore } from '../stores/auth-store';
import { isTenantAdmin, isTenantOwner } from '@atlas-platform/shared';

function useVisibleCategories() {
  const tenantRole = useAuthStore((s) => s.tenantRole);
  const isOwner = isTenantOwner(tenantRole);
  const isAdmin = isTenantAdmin(tenantRole);

  return useMemo(() => {
    const all = getSettingsCategories(appRegistry.getSettingsCategories());
    return all
      .map((cat) => ({
        ...cat,
        panels: cat.panels.filter((p) => {
          if (p.ownerOnly && !isOwner) return false;
          if (p.adminOnly && !isAdmin) return false;
          return true;
        }),
      }))
      .filter((cat) => cat.panels.length > 0);
  }, [isAdmin, isOwner]);
}

export function SettingsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const splat = params['*'] ?? '';
  const segs = splat.split('/').filter(Boolean);
  const categories = useVisibleCategories();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Bare /settings → last visited or platform/general
  if (segs.length === 0) {
    const last = readLastVisited();
    if (last && last.startsWith('/settings/')) {
      return <Navigate to={last} replace />;
    }
    const first = categories.find((c) => c.id === 'global')?.panels[0];
    if (first) {
      return <Navigate to={urlForPanel('global', first.id)} replace />;
    }
    // No visible categories at all (should not happen for an authenticated user).
    return null;
  }

  // /settings/platform or /settings/apps/:appId — redirect to first panel in scope
  if (segs.length === 1 || (segs[0] === 'apps' && segs.length === 2)) {
    const first = firstPanelOfUrlScope(segs, categories);
    if (first) {
      return <Navigate to={urlForPanel(first.categoryId, first.panelId)} replace />;
    }
    // Unknown scope → fall back to default.
    return <Navigate to="/settings" replace />;
  }

  const resolved = fromUrlSegments(segs);
  if (!resolved) {
    return <Navigate to="/settings" replace />;
  }

  const category = categories.find((c) => c.id === resolved.categoryId);
  const panel = category?.panels.find((p) => p.id === resolved.panelId);

  if (!category || !panel) {
    // Unknown category or panel id (e.g. stale bookmark for a removed panel).
    return <Navigate to="/settings" replace />;
  }

  // Persist last-visited whenever we successfully render a panel.
  const currentPath = urlForPanel(category.id, panel.id);
  useEffect(() => {
    writeLastVisited(currentPath);
  }, [currentPath]);

  // Esc → go back (unless a dialog is open)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"]')) return;
      navigate(-1);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  // Scroll persistence per panel via sessionStorage
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const storageKey = 'atlas_settings_scroll_' + currentPath;
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const top = Number(saved);
      if (!Number.isNaN(top)) el.scrollTop = top;
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(storageKey, String(el.scrollTop));
        } catch {
          /* ignore */
        }
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
    };
  }, [currentPath]);

  const PanelComponent = panel.component;

  const shellStyle: CSSProperties = {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    marginLeft: 56,
  };

  return (
    <div style={shellStyle}>
      <SettingsSidebar
        categories={categories}
        activeCategoryId={category.id}
        activePanelId={panel.id}
      />
      <main
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--spacing-2xl)',
          background: 'var(--color-bg-primary)',
        }}
      >
        <PanelComponent />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`. If `isTenantAdmin` / `isTenantOwner` / `tenantRole` fail to resolve, inspect `packages/shared/src/types/*` — those exports already work in `pages/settings.tsx` so they must exist. Import them from `@atlas-platform/shared` exactly as in the existing file.

- [ ] **Step 3: No commit yet**

Continue to Task 6.

---

## Task 6: Wire the page + remove modal mount in App.tsx

**Files:**
- Modify: `packages/client/src/App.tsx`

Replace the single `/settings` route with a splat `/settings/*` mounting `SettingsPage`. Remove `<SettingsModal />` from the JSX tree. Import cleanup.

- [ ] **Step 1: Replace the SettingsPage import**

In `packages/client/src/App.tsx`, find the line:

```tsx
import { SettingsPage, SettingsModal } from './pages/settings';
```

Replace with:

```tsx
import { SettingsPage } from './pages/settings-page';
```

- [ ] **Step 2: Replace the `/settings` route**

Find the route block:

```tsx
<Route
  path={ROUTES.SETTINGS}
  element={
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  }
/>
```

Replace with a splat route. Change the `path`:

```tsx
<Route
  path={`${ROUTES.SETTINGS}/*`}
  element={
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  }
/>
```

Note: `ROUTES.SETTINGS` is `/settings`. The splat `/*` makes it match `/settings`, `/settings/platform/general`, `/settings/apps/crm/stages`, etc.

- [ ] **Step 3: Remove the SettingsModal mount**

Grep inside `App.tsx` for `<SettingsModal` and remove the rendered instance. There should be exactly one (the audit said line 164). Delete that line.

- [ ] **Step 4: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`. Any remaining `SettingsModal` import elsewhere will not break since the file still exists; it's just unused for now.

- [ ] **Step 5: No commit yet**

Continue to Task 7 (the actual route will work once call sites are updated in Task 8 — but the shell is navigable via URL already).

---

## Task 7: Quick smoke test before touching call sites

**Files:** none (manual verification).

- [ ] **Step 1: Kill stale and start dev**

```bash
cd /Users/gorkemcetin/atlasmail
lsof -ti:5180,3001 | xargs kill -9 2>/dev/null
npm run dev
```

Run in background. Wait ~15 seconds.

- [ ] **Step 2: Open the new route directly in browser**

Visit `http://localhost:5180/settings/platform/general`.

Expected: new page renders with 260px left sidebar (categories + panels), General panel on the right. No modal overlay.

If the page is blank or errors, inspect the browser console. Most likely causes:
- `useAuthStore.tenantRole` shape differs — read `packages/client/src/stores/auth-store.ts` and adjust the hook.
- `Link` from react-router-dom needs a `BrowserRouter` ancestor — Atlas has one in `App.tsx` already, so this should be fine.

Fix the issue inline; do not proceed until the page renders correctly.

- [ ] **Step 3: Test routes**

Paste each of these URLs and confirm the page renders the right panel:

1. `http://localhost:5180/settings` → redirects to `/settings/platform/general`
2. `http://localhost:5180/settings/platform` → redirects to `/settings/platform/general`
3. `http://localhost:5180/settings/platform/appearance`
4. `http://localhost:5180/settings/platform/about`
5. `http://localhost:5180/settings/apps/crm/stages`
6. `http://localhost:5180/settings/apps/drive/display`

- [ ] **Step 4: Test Esc**

On any panel, press Escape. Expected: browser navigates back (wherever you were before).

- [ ] **Step 5: No commit yet**

Continue to Task 8.

---

## Task 8: Migrate 16 `openSettings(...)` call sites

**Files (modify):**
- `packages/client/src/components/layout/content-toolbar.tsx` (2 occurrences)
- `packages/client/src/apps/crm/components/crm-sidebar.tsx`
- `packages/client/src/apps/draw/page.tsx`
- `packages/client/src/apps/docs/page.tsx`
- `packages/client/src/apps/docs/components/doc-sidebar.tsx`
- `packages/client/src/apps/hr/page.tsx`
- `packages/client/src/apps/drive/page.tsx` (2 occurrences)
- `packages/client/src/apps/sign/page.tsx`
- `packages/client/src/apps/system/page.tsx`
- `packages/client/src/apps/invoices/components/invoices-sidebar.tsx`
- `packages/client/src/pages/calendar.tsx`
- `packages/client/src/pages/home.tsx` (2 occurrences)

Each call becomes a `navigate(urlForPanel(category, panel))` call. When only an app id is passed (no panel), pass empty-string as the second arg and let the route's redirect to the first panel handle it — but that requires the URL to land on a scope-only path. Since our route supports `/settings/apps/crm` (redirects internally), we generate `/settings/apps/:appId` without a panel.

For that, add a helper to `config/settings-url.ts`.

- [ ] **Step 1: Add `urlForCategory` helper**

Open `packages/client/src/config/settings-url.ts`. Append below `urlForPanel`:

```ts
/** URL for a whole category, no panel. Page will redirect to first panel. */
export function urlForCategory(categoryId: string): string {
  if (categoryId === 'global') return '/settings/platform';
  return '/settings/apps/' + categoryId;
}
```

- [ ] **Step 2: Confirm the build still passes**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Migrate call sites**

For each file below, replace the `openSettings(...)` call with a `navigate(...)` call. You may need to:
- Add `import { useNavigate } from 'react-router-dom';` if not present.
- Add `const navigate = useNavigate();` near the top of the component.
- Add `import { urlForCategory, urlForPanel } from '../../config/settings-url';` (adjust relative path).
- Remove the `const { openSettings } = useUIStore();` destructure if `useUIStore` is no longer needed.

Replacements by pattern:
- `openSettings()` → `navigate('/settings')`
- `openSettings('crm')` → `navigate(urlForCategory('crm'))`
- `openSettings('global', 'about')` → `navigate(urlForPanel('global', 'about'))`

Files one by one:

**a. `packages/client/src/components/layout/content-toolbar.tsx` (2 calls, both `openSettings()`):**

Both become `navigate('/settings')`.

**b. `packages/client/src/apps/crm/components/crm-sidebar.tsx` line 45:**

`openSettings('crm')` → `navigate(urlForCategory('crm'))`.

**c. `packages/client/src/apps/draw/page.tsx` line 181:**

`openSettings('draw')` → `navigate(urlForCategory('draw'))`.

**d. `packages/client/src/apps/docs/page.tsx` line 252:**

`openSettings('documents')` → `navigate(urlForCategory('documents'))`. **Note:** `'documents'` is the existing argument. Preserve it verbatim — the registry resolves it the same way it does now.

**e. `packages/client/src/apps/docs/components/doc-sidebar.tsx` line 243:**

`openSettings('docs')` → `navigate(urlForCategory('docs'))`. **Same note as (d)**: preserve the existing id verbatim even though it differs from (d). Both apparently work today; do not re-unify.

**f. `packages/client/src/apps/hr/page.tsx` line 260:**

`openSettings('hr')` → `navigate(urlForCategory('hr'))`.

**g. `packages/client/src/apps/drive/page.tsx` lines 153, 231:**

Both are `d.openSettings('drive')` where `d` is from `useDrivePage()`. Replace with `navigate(urlForCategory('drive'))`. You'll need to add `navigate` via `useNavigate()` at the top of the component. If `d.openSettings` is used elsewhere in the file for other purposes (it is — line 231 uses `d.openSettings`), both become `navigate(urlForCategory('drive'))`. Check `packages/client/src/apps/drive/use-drive-page.ts` for any other `openSettings` reference; if found, remove the function from the hook return.

**h. `packages/client/src/apps/drive/use-drive-page.ts`:**

The audit found this hook exposes `openSettings` — delete that property from the hook's return value and remove the internal `const { openSettings } = useUIStore();` if that's where it came from. Any consumer was handled in (g).

**i. `packages/client/src/apps/sign/page.tsx` line 57:**

`openSettings('sign')` → `navigate(urlForCategory('sign'))`.

**j. `packages/client/src/apps/system/page.tsx` line 198:**

`openSettings('system')` → `navigate(urlForCategory('system'))`. **Note:** verify a `system` category exists in the registry. If not, the URL will redirect back — accept that; the call site is best-effort.

**k. `packages/client/src/apps/invoices/components/invoices-sidebar.tsx` line 23:**

`openSettings('invoices')` → `navigate(urlForCategory('invoices'))`.

**l. `packages/client/src/pages/calendar.tsx` line 1065:**

`openSettings('calendar')` → `navigate(urlForCategory('calendar'))`.

**m. `packages/client/src/pages/home.tsx` lines 969 and 1538:**

Line 969: `openSettings()` → `navigate('/settings')`.
Line 1538: `openSettings('global', 'about')` → `navigate(urlForPanel('global', 'about'))`.

- [ ] **Step 4: Grep for any remaining call sites**

Run the Grep tool with pattern `openSettings\(` across `packages/client/src` output mode `content`, `-n true`.

Expected: only `packages/client/src/stores/ui-store.ts` (the definition) and `packages/client/src/pages/settings.tsx` (the soon-to-be-deleted `SettingsPage` auto-opener). Anything else in the match list is a missed call site — migrate it.

- [ ] **Step 5: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 6: Smoke test in browser**

Refresh `http://localhost:5180/`. Click any settings entry point you touched (e.g. the Home page settings gear, the Drive toolbar settings icon). Confirm the browser navigates to `/settings/...` and the page renders correctly.

- [ ] **Step 7: Commit C1 (all of Tasks 2–8 together)**

```bash
git add packages/client/src/config/settings-url.ts \
  packages/client/src/config/settings-registry.ts \
  packages/client/src/components/settings/settings-sidebar.tsx \
  packages/client/src/pages/settings-page.tsx \
  packages/client/src/App.tsx \
  packages/client/src/components/layout/content-toolbar.tsx \
  packages/client/src/apps/crm/components/crm-sidebar.tsx \
  packages/client/src/apps/draw/page.tsx \
  packages/client/src/apps/docs/page.tsx \
  packages/client/src/apps/docs/components/doc-sidebar.tsx \
  packages/client/src/apps/hr/page.tsx \
  packages/client/src/apps/drive/page.tsx \
  packages/client/src/apps/drive/use-drive-page.ts \
  packages/client/src/apps/sign/page.tsx \
  packages/client/src/apps/system/page.tsx \
  packages/client/src/apps/invoices/components/invoices-sidebar.tsx \
  packages/client/src/pages/calendar.tsx \
  packages/client/src/pages/home.tsx
git commit -m "feat(settings): promote SettingsModal to full /settings page"
```

---

## Task 9: Cleanup commit (C2)

**Files:**
- Delete: `packages/client/src/pages/settings.tsx`
- Delete: `packages/client/src/components/settings/settings-modal.tsx`
- Modify: `packages/client/src/stores/ui-store.ts`

- [ ] **Step 1: Verify nothing imports the old files**

Run the Grep tool with pattern `from ['\"]\\.\\./pages/settings['\"]|from ['\"]\\.\\./\\.\\./pages/settings['\"]|settings-modal` across `packages/client/src`, output mode `files_with_matches`.

Expected: only `packages/client/src/pages/settings.tsx` itself (self-reference to `SidebarNavButton` from the modal shell). No external imports.

If anything else matches, investigate and migrate.

- [ ] **Step 2: Delete old settings.tsx**

```bash
cd /Users/gorkemcetin/atlasmail
git rm packages/client/src/pages/settings.tsx
```

- [ ] **Step 3: Delete settings-modal.tsx**

```bash
git rm packages/client/src/components/settings/settings-modal.tsx
```

- [ ] **Step 4: Prune ui-store.ts**

Replace `packages/client/src/stores/ui-store.ts` content with exactly:

```ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  shortcutHelpOpen: boolean;
  searchFocused: boolean;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleShortcutHelp: () => void;
  setSearchFocused: (focused: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  shortcutHelpOpen: false,
  searchFocused: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleShortcutHelp: () => set((s) => ({ shortcutHelpOpen: !s.shortcutHelpOpen })),
  setSearchFocused: (focused) => set({ searchFocused: focused }),
}));
```

Removed: `settingsOpen`, `settingsApp`, `settingsPanel`, `toggleSettings`, `openSettings`, `closeSettings`, `loadSettingsPosition`, `saveSettingsPosition`, and the `atlas_settings_position` localStorage I/O.

- [ ] **Step 5: Clean up localStorage key (belt-and-suspenders)**

Users may still have the old `atlas_settings_position` key in their browsers. That's harmless — it'll sit forever, unread. No action needed. Do not write a migration; per project rules no backwards-compat shims.

- [ ] **Step 6: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`. If TypeScript errors appear for missing `openSettings` / `closeSettings`, a Task 8 call site was missed. Fix the call site, not the store.

- [ ] **Step 7: Commit C2**

```bash
git add packages/client/src/stores/ui-store.ts
git commit -m "refactor(settings): delete SettingsModal, old settings.tsx, and ui-store settings state"
```

---

## Task 10: Final walkthrough

- [ ] **Step 1: Kill stale processes and restart**

```bash
lsof -ti:5180,3001 | xargs kill -9 2>/dev/null
npm run dev
```

Wait ~15 seconds.

- [ ] **Step 2: Walk every settings entry**

In the browser:

1. Click Settings in the rail → lands on last-visited panel (or `/settings/platform/general`).
2. Navigate every platform panel via the new sidebar. Each panel renders identically to the modal version.
3. Open each app's settings (CRM → CRM settings gear, Drive → Drive settings button in toolbar, HR → HR settings, Sign, Invoices, Docs, Draw, System, Calendar). Each navigates to `/settings/apps/:appId/...` and redirects to the first panel of that app.
4. Deep-link: paste `http://localhost:5180/settings/apps/crm/stages` — page loads on that specific panel.
5. Permission test: if your user account is non-admin, admin-only panels (Formats, AI, some app settings) don't appear in the sidebar.
6. Scroll test: scroll the Updates panel → switch to General → switch back. Scroll position is preserved.
7. Esc test: from any panel press Escape. Browser goes back to the previous route.
8. Refresh: F5 on a settings URL — page reloads on the same panel.
9. Visit `/settings` with no subpath — redirects to last-visited.
10. Visit `/settings/apps/crm` (scope only) — redirects to first CRM panel.
11. Visit `/settings/apps/bogus/fake` — redirects to `/settings`.

- [ ] **Step 3: Grep verifies no leftovers**

Run the Grep tool with pattern `SettingsModal|openSettings|closeSettings|settingsOpen|settingsApp|settingsPanel|atlas_settings_position` across `packages/client/src`, output mode `files_with_matches`.

Expected: zero hits.

If any hit remains, inspect and fix before declaring done.

- [ ] **Step 4: No commit**

Testing only.

---

## Rollback

Each commit is atomic and revertable:

- `git revert <C2>`: restores the old `ui-store.ts` (settings state returns) and the deleted files. But `App.tsx` still renders the new page (from C1), so the modal won't actually mount — rollback leaves settings in a weird half-state. Prefer reverting C1 if C2 ships cleanly and something breaks later.
- `git revert <C1>`: restores the old modal mount in App.tsx, restores old `/settings` route, restores `openSettings(...)` calls in 16 files. The new `settings-page.tsx`, `settings-sidebar.tsx`, and `settings-url.ts` files remain on disk but are unreferenced — harmless. Settings works in modal mode again.

## Reminders for future phases

- **Global top bar** (breadcrumb + search + inbox + help + avatar) — next spec.
- **Mobile (<768px) Settings responsive** — separate patch.
- **Unsaved-changes guard** — per-panel if needed.
- **`Cmd+,` keyboard shortcut** — nice-to-have.
