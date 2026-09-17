# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run api                  # Terminal 1: json-server mock REST API on :3000 (required by the app)
npm start                    # Terminal 2: Angular dev server on :4200
npm run build                # Production build (default configuration)
npm test -- --watch=false    # Full Vitest suite, single run
npx prettier --write .       # Format (no ESLint is configured in this repo)
```

Running a single test — the Angular `@angular/build:unit-test` builder (Vitest runner, jsdom, no `vitest.config.ts`):

```bash
npm test -- --watch=false --include=src/app/core/services/auth.service.spec.ts
npm test -- --watch=false --filter="AuthService"     # regex against suite/test names
npm test -- --list-tests                             # discover spec files
```

Nothing works without `npm run api` — every service targets `environment.apiUrl` (`http://localhost:3000`), and `error.interceptor.ts` surfaces a specific "run `npm run api`" toast on status 0.

## Stack constraints that shape all code

- **Angular 21, zoneless** (`provideZonelessChangeDetection()` in [app.config.ts](src/app/app.config.ts)). State that drives templates must be a `signal`/`computed`, or the view will not update. Never reach for zone-based patterns.
- **Standalone components only.** No NgModules. Inputs/outputs use the signal APIs (`input()`, `output()`), not decorators — see [ui-button.component.ts](src/app/shared/components/ui-button/ui-button.component.ts) and [data-table.component.ts](src/app/shared/components/data-table/data-table.component.ts). `@ContentChild` is still used for template projection.
- **TypeScript is fully strict**, including `noPropertyAccessFromIndexSignature` and `strictTemplates`. Route data is read as `route.data['roles']`, not `route.data.roles`.
- Components keep template and styles in sibling `.html`/`.css` files — always `templateUrl`/`styleUrl`, never inline `template`/`styles`.

## Icons: the most common build/test break

Lucide icons are tree-shaken through `LucideAngularModule.pick({...})` in [app.config.ts](src/app/app.config.ts). An icon used in a template but missing from that `pick` map silently renders nothing. Templates reference icons by **kebab-case name** (`'layout-dashboard'`), while the `pick` map takes the **PascalCase import**.

The same applies in tests: any spec that instantiates a component or service touching icons must replicate the `importProvidersFrom(LucideAngularModule.pick({...}))` provider — [auth.service.spec.ts](src/app/core/services/auth.service.spec.ts) does this because `AuthService` injects `SnackbarService`.

## Architecture

**Auth is signal-based and entirely client-side.** [auth.service.ts](src/app/core/services/auth.service.ts) holds one `sessionSignal` fed from `localStorage` (`user_manage_session`); `currentUser`, `isAuthenticated`, and `currentRole` are `computed` off it. Login fetches `/users`, matches identifier + role in memory, and compares plaintext passwords — there is no real auth endpoint. The "token" is a `btoa` JSON blob with an `exp`, and `sessionMinutes` in [environment.ts](src/environments/environment.ts) controls expiry. On boot the constructor either clears an expired session or calls `refreshCurrentUser()` to resync against `db.json`.

**Route protection is two-layered** in [app.routes.ts](src/app/app.routes.ts): the shell route carries `authGuard`, and each child carries `roleGuard` with `data: { roles: [...] }`. Roles are `'admin' | 'manager' | 'employee'`. The empty child path uses a **functional `redirectTo`** that injects `AuthService` to route each role to its own dashboard. All pages are lazily `loadComponent`-ed.

**Three interceptors run in a fixed order** (`auth → loading → error`): bearer injection, a request-counter loading signal consumed by the shell's loader, and centralized `HttpErrorResponse` → snackbar mapping (401 forces logout). Because the error interceptor already toasts, page components generally only need to handle their own success paths.

**`json-server` v0.17 query semantics are baked into the services.** [user.service.ts](src/app/core/services/user.service.ts) relies on `_page`/`_limit`/`_sort`/`_order`, the `q` full-text param, and reads total count from the `X-Total-Count` response header (hence `observe: 'response'`). The sentinel string `'all'` means "no filter" and is stripped before the request. Upgrading json-server would break pagination.

**Everything is stored in one `db.json`** (~4.4 MB) with three collections: `users`, `images`, `nodes`. Do not read it whole — uploaded files and images are persisted as **base64 data URLs** inside it, which is why `maxUploadMb` exists and why the file is huge. Query it with `python3`/`jq` instead.

**Drive is a recursive parent-child tree** ([drive.service.ts](src/app/core/services/drive.service.ts)): `DriveNode` has `parentId` pointing at `'root'` (the `DRIVE_ROOT` constant) or another folder id. Ids are client-generated (`folder-xxxxxxx` / `file-xxxxxxx`) because json-server cannot assign them for string-keyed trees. Breadcrumbs and deletion both fetch **all** nodes and walk the tree in memory; `deleteNode` collects descendants and `forkJoin`s the deletes.

**`DataTableComponent` is the reuse hub** for list pages — it composes search, filter drawer, pagination, loader, and empty state, and exposes `searchChange`/`pageChange`/`limitChange`/`filterChange` outputs. Consumers pass `TableColumn[]` plus a `#cellTemplate` for custom cells. Prefer wiring it up over hand-rolling a table.

**Styling is custom CSS design tokens, not Material.** [styles.css](src/styles.css) defines the `--bg`/`--surface`/`--primary`/`--radius`/`--shadow-*` variables every component consumes. Angular Material is present for exactly two things — `MatSnackBar` and `MatPaginator` — themed minimally in [material-theme.scss](src/material-theme.scss). Don't introduce Material components for new UI; extend the shared component catalog instead.

Production build budgets are tight (700 kB warning / 1 MB error on the initial bundle), so keep new pages lazy-loaded.

## Demo credentials (seeded in `db.json`)

| Role | Identifier | Password |
| :--- | :--- | :--- |
| admin | `admin` or `admin@gmail.com` | `Admin@123` |
| manager | `manager` or `manager@gmail.com` | `Manager@123` |
| employee | `employee@gmail.com` | `Employee@123` |
| employees 4–40 | `<name>@demo.com` | `Demo@123` |

Signup always assigns the `employee` role.

## Existing docs

[README.md](README.md) and [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) cover setup and feature walkthroughs; [ANTIGRAVITY.md](ANTIGRAVITY.md) is an architecture blueprint from a prior assistant. All three have drifted — they reference a `toast-container/` component and `environment.prod.ts` that do not exist (the real files are `snackbar-content/` and a single `environment.ts`), and paths are written as `d:/user-managment/`. Trust the source tree over these documents.
