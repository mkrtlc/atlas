# Settings Full-Page — Design Spec

**Date:** 2026-04-23
**Scope:** Promote `SettingsModal` to a real `/settings/:category/:panel` route. Delete the modal. Two ship commits (shell first, cleanup second).

## Why

Atlas Settings is a 31-panel surface currently rendered as a 960px centered modal. The modal caps content width, has no deep-linkable URLs, resets scroll on every panel switch, and forces a modal mental model for what is really a standalone app. Moving to a full page aligns with the rail architecture shipped in Phase B1 (Settings is just another rail icon, like CRM or Drive), matches how Linear / Notion / GitHub / Vercel / Stripe all present settings, and unlocks deep linking like "here's the integration I mean — /settings/platform/integrations".

## Non-goals

- **Top bar / breadcrumb / global search** — parked as a separate follow-up spec. The Settings page will use the same `ContentArea`-style chrome as other app pages for now.
- **Mobile (<768px) responsive layout** for settings — follows the same deferral as the rail.
- **Per-panel dirty-state / unsaved-changes guard** — out of scope; existing panels either auto-save or handle their own state.
- **Keyboard shortcut to open Settings** (e.g. `Cmd+,`) — none exists today; adding one is future work.

## What changes

### 1. Routes

Add a single splat route to `App.tsx` replacing the existing `/settings` redirect:

| Route | Purpose |
|-------|---------|
| `/settings/*` | Page shell. Parses the rest of the path to pick category + panel. Bare `/settings` (no trailing segments) redirects to last-visited panel or `/settings/platform/general`. |

URL scheme — two forms:

- **Platform category:** `/settings/platform/:panel` — e.g. `/settings/platform/general`, `/settings/platform/integrations`.
- **App categories:** `/settings/apps/:appId/:panel` — e.g. `/settings/apps/crm/stages`, `/settings/apps/drive/display`.

Routing uses a splat (`/settings/*`) so we can parse both 2-segment and 3-segment URLs in one component. `SettingsPage` reads `useParams()['*']`, splits on `/`, and resolves:

- `['platform', panelId]` → global category + panel
- `['apps', appId, panelId]` → app category + panel
- `['platform']` → global category + first panel (redirect)
- `['apps', appId]` → app category + first panel (redirect)
- `[]` (bare `/settings`) → last-visited or default (redirect)

Registry change: the internal `global` category id is aliased to `platform` for URL purposes via a small helper `toUrlSegment(categoryId: string): string` that returns `'platform'` for `'global'` and `'apps/' + appId` for app categories. The inverse helper `fromUrlSegments(segs: string[])` resolves the category back.

### 2. New components / files

| File | Responsibility |
|------|---------------|
| `packages/client/src/pages/settings-page.tsx` | New — renders the full-page settings shell: single sidebar (left) + content pane (right). Reads route params, resolves to a panel, renders it. Handles `Esc` → `navigate(-1)`. Handles scroll persistence. |
| `packages/client/src/components/settings/settings-sidebar.tsx` | New — single 260px left sidebar with collapsible category groups and nested panel links. |
| `packages/client/src/config/settings-registry.ts` | Modify — add helpers: `findPanel(categoryId, panelId)`, `urlForPanel(category, panel)`, `toUrlSegment(categoryId)` (maps `global` ↔ `platform`). |

### 3. Routing changes

`App.tsx`:

- Replace the single `/settings` → `<SettingsPage />` route with a route group for `/settings` + `/settings/:category/:panel?`.
- Delete the `<SettingsModal />` mount from App.tsx.
- Delete the existing `SettingsPage` export in `pages/settings.tsx` (the auto-opener redirect). The new `SettingsPage` in `pages/settings-page.tsx` replaces it with a real component.

### 4. Sidebar layout

Single 260px sidebar:

- `background: var(--color-bg-secondary)`, `border-right: 1px solid var(--color-border-primary)`
- Sticky header row at top with "Settings" label
- For each category (global first, then each app):
  - Category header: small muted 11px uppercase label (matches the DataTable header treatment from Phase A — consistent typography across chrome)
  - Panel rows below: icon + label, `color: var(--color-text-secondary)` idle → primary on hover → accent on active (`background: var(--color-accent-subtle)`)
  - Permission-gated panels (adminOnly, ownerOnly) filter here using the existing `useAuthStore` / tenant-member data
- No collapse/expand of categories in v1 — all expanded. Future work if the panel count grows.

Content pane:

- `flex: 1`, scrollable, standard page padding (`var(--spacing-2xl)`)
- Renders the active panel component directly (panels today are self-contained React components)

Rail offset: the Settings page is inside the `/settings` route, which has the 56px rail offset (Phase B1 put `marginLeft: 56` on `settings.tsx` already; we'll preserve it in the new `settings-page.tsx`).

### 5. First-load landing behavior

When the user lands on bare `/settings`:

```ts
const lastVisited = localStorage.getItem('atlas_settings_last_panel');
if (lastVisited && isValidPanelRoute(lastVisited)) {
  navigate(lastVisited, { replace: true });
} else {
  navigate('/settings/platform/general', { replace: true });
}
```

`isValidPanelRoute` parses and checks the registry (so a stale value from a removed panel falls through to the default). The `replace` prevents history pollution — back button from inside settings returns to wherever the user came from, not to bare `/settings`.

Whenever a panel renders, write its URL to `atlas_settings_last_panel`.

### 6. Escape key → navigate back

The Settings page component registers a `keydown` handler on `document`:

```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) {
      navigate(-1);
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [navigate]);
```

The dialog guard prevents Escape from navigating away when a panel has an open confirmation dialog (several panels do).

### 7. Scroll persistence

Per-panel scroll position stored in `sessionStorage` under the URL key. Each panel render:

1. On mount, read `sessionStorage.getItem('atlas_settings_scroll_' + url)` and set the content scroll area's `scrollTop`.
2. On scroll (debounced 100ms), write the current scrollTop to the same key.

Keyed by the full pathname so a given panel remembers its scroll across in-session navigations but resets on page reload (sessionStorage wipes on tab close — acceptable).

### 8. Call-site migration (11 known call sites)

Every existing `openSettings(appId?, panelId?)` call becomes `navigate(urlForPanel(appId, panelId))`. Known callers from the audit:

- `components/layout/content-toolbar.tsx`
- `pages/home.tsx`
- `pages/calendar.tsx`
- `apps/docs/page.tsx`
- `apps/invoices/components/invoices-sidebar.tsx`
- `apps/crm/components/crm-sidebar.tsx`
- `apps/hr/page.tsx`
- `apps/drive/page.tsx`
- `apps/drive/use-drive-page.ts`
- `apps/sign/page.tsx`
- `apps/system/page.tsx`

The new rail (Phase B1 `app-rail.tsx`) navigates to `/settings` already — no changes needed there; the landing redirect handles it.

Each of the 11 sites also removes its dependency on `useUiStore.openSettings` / `settingsOpen` / etc. Most of these are one-liner swaps.

### 9. Delete in the cleanup commit

**Second commit deletes:**

- `packages/client/src/components/settings/settings-modal.tsx` — the modal shell (zero imports after call-site migration).
- `SettingsModal` export in `pages/settings.tsx` — the overlay render wrapper (unreferenced).
- `openSettings`, `closeSettings`, `toggleSettings`, `settingsOpen`, `settingsApp`, `settingsPanel` from `stores/ui-store.ts`.
- The `atlas_settings_position` localStorage key read/write (superseded by the per-panel `atlas_settings_last_panel` key).
- Old `pages/settings.tsx` file entirely (replaced by `settings-page.tsx`).

App.tsx's `<SettingsModal />` mount is removed in the first commit (same commit that adds the new route), so the second commit is pure source-tree cleanup.

### 10. i18n

No new user-visible strings are introduced that aren't already in the translation files. Sidebar labels come from the existing panel registry (`label` field on each panel, already localized via panel `label` strings which are plain English in the registry — matches current modal behavior). If the registry moves to i18n keys in a future pass, that's a separate change.

## What stays unchanged

- All panel components in `packages/client/src/components/settings/*.tsx` — unchanged. They're already self-contained and render the same way inside a modal or a page.
- App-contributed settings categories from `apps/*/manifest.ts` — unchanged. Same `settingsCategory` shape, same aggregation via `app-registry.ts`.
- Permission filtering (`adminOnly` / `ownerOnly`) — same logic, moved from the modal into the new sidebar.
- The rail (Phase B1) — unchanged. Settings is already a rail item linking to `/settings`.
- Home page / Home widgets panel — unchanged.

## Test plan

After the first commit (shell + routes):

1. Click Settings in the rail → lands on the last-visited panel (or `/settings/platform/general` on first load).
2. Navigate through each of the 10 platform panels via the new sidebar — each one renders identically to how it did in the modal.
3. Navigate to each app's settings category (CRM, HR, Drive, Docs, Draw, Sign, Invoices, Work — 8 apps, some with multiple panels).
4. Deep-link test: paste `/settings/apps/crm/stages` into the browser URL bar — page loads directly on that panel.
5. Permission test: log in as non-admin → admin-only panels (Formats, AI, CRM general) do NOT appear in the sidebar.
6. `Esc` test: from any settings panel → press Escape → returns to previous route.
7. Scroll test: scroll down in the Updates panel, switch to General, switch back → scroll position preserved.
8. Build passes in both client and server (no broken imports from deleted `openSettings`).
9. Grep confirms no remaining `openSettings(` call sites across `packages/client/src`.

After the second commit (cleanup):

10. `grep -r "SettingsModal\|openSettings\|settingsOpen" packages/client/src` returns zero hits.
11. Build still passes.
12. All 12 test routes above still work (nothing functional changed).

## Ship

Two commits to `main`:

- **C1:** routing + page shell + sidebar + scroll persistence + Esc + all 11 call-site migrations + delete `<SettingsModal />` mount from App.tsx.
- **C2:** delete `SettingsModal` component file, `openSettings`/`closeSettings`/etc. store state, old `pages/settings.tsx`, stale localStorage key.

No PR. No version bump until B1's ship call is resolved.

## Risk

Medium. Many call sites but each is mechanical. Biggest failure mode is a call site that passes extra args or context to `openSettings()` that doesn't cleanly translate to a URL (e.g. transient data). Audit suggests this doesn't exist — all calls are `openSettings(appId, panelId)`-shaped — but confirm during implementation.

Rollback: `git revert` the first commit unmounts the page and restores the modal mount in App.tsx. The modal component file still exists until C2 ships, so reverting C1 brings back a working modal state.

## Deferred / follow-up

- Global top bar (breadcrumb + search + inbox + help + avatar) — parked as separate spec.
- Keyboard shortcut `Cmd+,` to open Settings from anywhere — cheap, not blocking.
- Unsaved-changes guard on panels with batch submission — do when a specific bug surfaces.
- Category expand/collapse in sidebar — when panel count > ~40.
