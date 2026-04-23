# UI Refresh — Phase B1: App Rail (structural)

**Date:** 2026-04-23
**Scope:** B1 of Phase B (rail + dock structure). B2 (content color desaturation) and B3 (icon cleanup) are separate specs.
**Ships as:** one PR, one version bump.

## Why

The "UI didn't change much" reaction to Phase A is accurate: Phase A was token infrastructure. The visible Linear-feel transformation requires a structural change. Atlas today has no permanent left sidebar — the only global chrome is a colored bottom `GlobalDock`. Phase B1 replaces that with a 56px icon-only left rail on every app page, while **keeping the colored launcher on the Home page only**.

The `sidebar.tsx` file in `components/layout/` is dead code (no imports anywhere) and gets deleted as part of this phase.

## Non-goals

- **B2 (separate spec):** desaturate per-app brand colors in content (activity feeds, org settings, SmartButtonBar). `app.color` continues to read from manifests during B1.
- **B3 (separate spec):** delete or simplify the brand SVG icons that only survive because Home still uses them.
- **Phone (<768px) layout:** deferred. Tablet (≥768px) and up only. Phone handling is a later patch.
- **AppSidebar (the per-app contextual left sidebar):** untouched. Rail sits outside of it.

## What changes

### 1. New file: `packages/client/src/components/layout/app-rail.tsx`

A 56px fixed-width vertical rail with:
- **Home icon** at top — Lucide `Home`, links to `/`.
- **Divider** (28px horizontal hairline, `--color-border-primary`).
- **App icons** from `appRegistry.getNavItems()` (filtered by `useMyAccessibleApps`). One per app, using the Lucide mapping below.
- **Footer group** (pinned to bottom via `margin-top: auto`):
  - Settings icon → `Settings` (Lucide) → `/settings`.
  - Organization icon → `Building2` (Lucide) → `/org`.
  - Account switcher (existing `AccountSwitcher` component, used in icon-only mode).
  - Theme toggle (existing inline theme toggle from `sidebar.tsx`, copied over and trimmed to icon-only).

Each icon:
- `width: 36px; height: 36px; border-radius: 8px`
- Color: `--color-text-tertiary` idle → `--color-text-primary` on hover → `--color-accent-primary` on active
- Active state: `background: var(--color-accent-subtle)` + a 2px accent bar on the left edge (`::before` pseudo-element)
- Tooltip on hover: dark chip to the right showing the app name (uses existing `Tooltip` component from `components/ui/tooltip.tsx`)

Rail container:
- `width: 56px; background: var(--color-bg-secondary); border-right: 1px solid var(--color-border-primary)`
- `display: flex; flex-direction: column; padding: 10px 0; gap: 2px`
- `position: fixed; left: 0; top: 0; bottom: 0; z-index: 30`

### 2. Lucide icon mapping (per-app)

| App | Lucide icon |
|-----|-------------|
| CRM | `Users` |
| HRM | `UserCog` |
| Projects / Work | `FolderKanban` |
| Calendar | `Calendar` |
| Sign | `FileSignature` |
| Invoices | `Receipt` |
| Drive | `HardDrive` |
| Tasks | `CheckSquare` |
| Docs (Write) | `FileText` |
| Draw | `PenTool` |
| System | `Settings2` (footer `Settings` uses the normal `Settings` — keep them distinct) |
| Home | `Home` |

Defined in a map at the top of `app-rail.tsx`: `const RAIL_ICONS: Record<string, LucideIcon> = { crm: Users, hr: UserCog, ... }`. Falls back to `Grid` for any app not in the map.

### 3. `App.tsx` layout restructure

Today `App.tsx` renders `<GlobalDockWrapper />` (bottom dock) globally. New layout:

- Add `<AppRailWrapper />` — same hide-list pattern as `GlobalDockWrapper`:
  - Hidden on: `/` (home), `/login`, `/register`, `/setup`, `/onboarding`, `/forgot-password`, `/invitation/*`, `/reset-password/*`, `/sign/*`, `/proposal/*`, `/drive/upload/*`.
  - Visible everywhere else.
- **Remove `<GlobalDockWrapper />` from `App.tsx`**. The `GlobalDock` component itself is kept (for Home to use), but it's no longer globally mounted.

### 4. Home page launcher stays

`packages/client/src/pages/home.tsx` already renders its own colorful launcher inline (it was never the same as `GlobalDock`). Leave it alone in B1. The separate `GlobalDock` component survives untouched because it's still good code and B3 may or may not delete it depending on whether Home ever wants to reuse it.

### 5. Main-content offset

Every non-Home authenticated page must now leave 56px of space on the left for the rail. Two options considered:

- **A. Add `padding-left: 56px` on the top-level `<main>` on each app page.** 10 app pages + org/settings = 12 files to touch.
- **B. Add a single CSS rule in `global.css` that applies `padding-left: 56px` on a body-level class toggled by `AppRailWrapper`.**

Going with **A** for explicitness. Each app's `page.tsx` already wraps itself in an outer `<div>` — we add `marginLeft: 56` to that wrapper. Grep across 12 files, surgical edits. Acknowledges that layout is per-app and documents the rail dependency.

*Alternative considered and rejected:* turning the whole app into a CSS Grid shell. Too invasive for B1.

### 6. Delete dead code

- **Delete `packages/client/src/components/layout/sidebar.tsx`.** Audit confirmed zero imports.
- **Delete `packages/client/src/styles/global-dock.css`** only if `GlobalDock` is also removed. For B1, keep both — Home might use the dock later.

### 7. AccountSwitcher + ThemeToggle — icon-only variants

`AccountSwitcher` currently renders an avatar + name. In the rail, it needs to be icon-only. Check if it already supports an `iconOnly` prop; if not, add one. Conservative change: wrap `AccountSwitcher` in a `div` that sets `max-width: 36px` and `overflow: hidden` on first pass, refine later.

`ThemeToggle` in `sidebar.tsx` is a small 28×28 button — copy the existing markup into `app-rail.tsx` wholesale.

### 8. Mobile/tablet

- **≥ 768px**: rail visible, 56px.
- **< 768px**: rail hidden via `@media (max-width: 767px) { .app-rail { display: none; } }`. Phone users get no primary nav for now. Per user decision, this is deferred. Add a `TODO: B-phone` comment in `app-rail.tsx`.

## What stays exactly the same

- `AppSidebar` component + all per-app contextual sidebars (CRM, HR, Drive, Docs, Draw, Invoices, Sign, Work). Rail and AppSidebar live side-by-side (rail 56 + AppSidebar 220 = 276px from the left before content starts).
- Home page launcher visuals.
- All app manifests (`color` field stays — still used elsewhere).
- All per-app brand icons in `components/icons/app-icons.tsx` — still used by Home.
- Theme tokens (Phase A's values are perfect for this).

## File-by-file change list

**New:**
- `packages/client/src/components/layout/app-rail.tsx` — the component.

**Modified:**
- `packages/client/src/App.tsx` — add `<AppRailWrapper />`, remove `<GlobalDockWrapper />`.
- 12 app page files — add `marginLeft: 56` to outer wrapper:
  - `packages/client/src/apps/crm/page.tsx`
  - `packages/client/src/apps/hr/page.tsx`
  - `packages/client/src/apps/work/page.tsx`
  - `packages/client/src/apps/sign/page.tsx`
  - `packages/client/src/apps/invoices/page.tsx`
  - `packages/client/src/apps/drive/page.tsx`
  - `packages/client/src/apps/docs/page.tsx`
  - `packages/client/src/apps/draw/page.tsx`
  - `packages/client/src/apps/system/page.tsx`
  - `packages/client/src/pages/calendar.tsx`
  - `packages/client/src/pages/org/org-layout.tsx`
  - `packages/client/src/pages/settings.tsx`

**Deleted:**
- `packages/client/src/components/layout/sidebar.tsx` — dead code, no imports.

## Test plan

After shipping, walk through in both light and dark:

1. **Home** — no rail visible. Colored launcher still there. Works as before.
2. **Login / register / setup / onboarding** — no rail. No sidebar. Full-width.
3. **Public share pages** (`/sign/:token`, `/proposal/:token`, `/drive/upload/:token`) — no rail.
4. **CRM, HRM, Projects, Calendar, Sign, Invoices, Drive, Tasks, Docs, Draw, System, Settings, Org** — rail visible at 56px. Active app highlighted with accent pill + left edge bar. Hover tooltips show app name.
5. **Apps with their own contextual sidebar** (most apps): rail(56) + AppSidebar(220) + content. No overlap, no clipping.
6. **Keyboard focus** on rail icons via Tab — accent halo from Phase A's global focus ring.
7. **Responsive:** resize to <768px. Rail disappears. Content shifts left. (Known gap — no mobile nav replacement yet. OK per user decision.)
8. **Theme toggle and account switcher** at rail bottom work identically to before.

## Risk

Medium. Layout ripples across 12 files. Main risk: any app page that sets its outermost width or `left: 0` with `position: fixed` will overlap the rail. Spot-check:
- CRM `crm/components/dashboard.tsx` — check for full-viewport modals or overlays
- Draw `draw/page.tsx` — Excalidraw is full-bleed; ensure it doesn't bleed under the rail
- Modals: `components/ui/modal.tsx` uses `position: fixed` and centers to viewport; that's fine (modals are over the rail anyway)

Rollback: `git revert` the single PR. No DB changes, no API changes, no migration.

## Success criteria

- On any app page, the rail is the first thing the user sees to the left.
- The rail is quiet (monochrome), with one accent tint on the active item.
- Home still feels colorful and welcoming (launcher unchanged).
- Tablet sizes still usable. Phone gracefully breaks but isn't the focus.
- No regressions in keyboard focus behavior, modal stacking, or scroll areas.

## Deferred / follow-up

- **B2**: desaturate `app.color` usage in content (activity feed avatars, org-member-edit access tint, SmartButtonBar, etc.).
- **B3**: delete the bottom `GlobalDock` component entirely if Home doesn't need it; clean up `BRAND_ICON_BACKGROUNDS` dicts in `sidebar.tsx` (deleted in B1), `global-dock.tsx`, `home.tsx`; possibly simplify brand SVGs.
- **Phone nav**: top-bar hamburger + slide-out rail, or bottom tab bar. Separate spec.
- **Keyboard navigation within the rail**: arrow up/down to move between rail items, Enter to navigate. Not blocking B1 but worth adding.
