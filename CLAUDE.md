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

**Never add `--watch` back to the `api` script.** The app is the only writer of `db.json`, so `--watch` only ever fires on json-server's _own_ writes: it reloads the multi-MB file after every POST/DELETE, aborts any request in flight during that reload, and silently kills the process — the whole batch then fails with `ERR_EMPTY_RESPONSE` / `ERR_CONNECTION_REFUSED`. Writes still persist without it.

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

**There is only ever one loader on screen, and the request count owns it.** [loading.service.ts](src/app/core/services/loading.service.ts) counts in-flight requests; [layout.component.html](src/app/layout/layout.component.html) renders one fullscreen `app-loader` while that count is above zero, and `LoaderComponent.shouldDisplay` makes every _inline_ loader hide itself while the overlay is up — so a page's own loader and the global one are never visible together. The catch is multi-request actions: the count drops to zero between requests, the overlay unmounts, the page's inline loader appears in the gap, and the next request swaps them back — one flicker per request. Any action that issues several requests must therefore hold the count open itself (`loading.show()` … `loading.hide()` in a `finally`, which nests safely) and **not** also set a page-level loading signal. `runUploads` in [media-upload.service.ts](src/app/core/services/media-upload.service.ts) is the worked example.

**`json-server` v0.17 query semantics are baked into the services.** [user.service.ts](src/app/core/services/user.service.ts) relies on `_page`/`_limit`/`_sort`/`_order`, the `q` full-text param, and reads total count from the `X-Total-Count` response header (hence `observe: 'response'`). The sentinel string `'all'` means "no filter" and is stripped before the request. Upgrading json-server would break pagination.

**Everything is stored in one `db.json`** (several MB, and it grows with every upload) with three collections: `users`, `images` (Gallery), `nodes` (Drive). Do not read it whole — uploaded files and images are persisted as **base64 data URLs** inside it, which is why the upload ceilings exist and why the file is huge. Query it with `python3`/`jq` instead. [environment.ts](src/environments/environment.ts) sets two separate ceilings: `maxUploadMb` (2, Gallery) and `maxDriveUploadMb` (6, Drive — the largest raw size that stays under json-server's 10 MB body limit after base64's ~1.33x inflation).

**Drive is a recursive parent-child tree** ([drive.service.ts](src/app/core/services/drive.service.ts)): `DriveNode` has `parentId` pointing at `'root'` (the `DRIVE_ROOT` constant) or another folder id. Ids are client-generated (`folder-xxxxxxx` / `file-xxxxxxx`) because json-server cannot assign them for string-keyed trees. Breadcrumbs and deletion both fetch **all** nodes and walk the tree in memory; `deleteNode` collects descendants and deletes them through `runPacedWrites` (see write pacing below), failing loudly with a "deleted N of M" error if any drop out.

Clicking a node routes three ways in `openPreview`: folders navigate, images and videos go to the in-app lightbox, and **documents open in a new browser tab**. That last path cannot use the stored `dataUrl` directly — Chrome has blocked top-frame navigation to `data:` URLs since v60, so `window.open` on one silently yields a blank tab. [data-url.ts](src/app/core/utils/data-url.ts) re-wraps the bytes in a `Blob` and opens an object URL instead (revoked on a timer; revoking immediately races the new tab's load). Chrome renders PDFs, text and CSV itself and downloads what it cannot display — Word and Excel always download, and no browser-side change alters that. The old preview modal survives as the fallback for a blocked pop-up or a node with no bytes.

**Gallery and Drive are independent stores — uploads never cross over.** [media-upload.service.ts](src/app/core/services/media-upload.service.ts) is the single entry point for both, but it keeps two disjoint paths: `uploadToGallery()` POSTs to `/images` only, `uploadToDrive()` (and `readAndUploadToDrive()`, which reads the `File[]` first) POSTs to `/nodes` only. An earlier design mirrored every image upload into both collections and cross-linked them with `galleryId`/`driveNodeId` fields; that was removed deliberately — uploading in the Gallery must not make the file appear in Drive, and vice versa. Do not reintroduce a mirror, and do not add link fields back to `DriveNode`/`ImageItem`. `readFiles()` handles the size ceiling and unreadable files, and every path returns the same `MediaUploadOutcome` (`uploaded` / `tooLarge` / `failed`) which `report()` turns into snackbars — callers pass a destination label and otherwise only handle their own refresh.

**Batched writes are paced, never parallel** ([write-pacing.ts](src/app/core/utils/write-pacing.ts)). json-server rewrites the whole multi-MB `db.json` on every write, so a back-to-back batch makes it start dropping connections mid-run — this is what left bulk delete half-finished. `pause()` puts `WRITE_GAP_MS` (150 ms) between writes, and `isConnectionLost()` (status 0) means the rest of the batch cannot land either, so the loop records the remainder and stops rather than raising a toast per item. `runPacedWrites()` wraps the whole pattern and returns `{ done, failed, aborted }` — it is what [drive.service.ts](src/app/core/services/drive.service.ts) `deleteNode` and the Gallery's bulk delete use. Treat sequential-and-paced as the default for any loop of writes; `forkJoin` over a list of POSTs/DELETEs will fail under load.

**`DataTableComponent` is the reuse hub** for list pages — it composes search, filter drawer, pagination, loader, and empty state, and exposes `searchChange`/`pageChange`/`limitChange`/`filterChange` outputs. Consumers pass `TableColumn[]` plus a `#cellTemplate` for custom cells. Prefer wiring it up over hand-rolling a table.

**Styling is custom CSS design tokens, not Material.** [styles.css](src/styles.css) defines the `--bg`/`--surface`/`--primary`/`--radius`/`--shadow-*` variables every component consumes. Angular Material is present for exactly two things — `MatSnackBar` and `MatPaginator` — themed minimally in [material-theme.scss](src/material-theme.scss). Don't introduce Material components for new UI; extend the shared component catalog instead.

**Phone and tablet live in one global override layer**, [src/styles/responsive.css](src/styles/responsive.css), registered in the `styles` array of [angular.json](angular.json) alongside `styles.css`. Rules are grouped by breakpoint (**phone ≤ 640px**, **tablet 641–1024px**, plus one `≤1024px` app-frame block), then by the piece of UI they touch. Two things to know before editing it:

- **Declarations are `!important` on purpose.** Angular appends component styles to `<head>` _after_ this sheet, and a component rule like `.metrics-grid[_ngcontent-x]` outranks a plain `.metrics-grid`, so the override layer has to say so explicitly.
- **Never re-split this by role.** It used to be `admin.css` / `manager.css` / `employee.css`, but all three were loaded for every user regardless of role, and the pages share components (page header, `DataTableComponent`, paginator, modals), so the split only produced three drifting copies of the same rules. Group by breakpoint and UI area, never by who is signed in.

Desktop styling stays in each component's own `.css` file; this sheet only adds the two narrower tiers.

Production build budgets are tight (700 kB warning / 1 MB error on the initial bundle), so keep new pages lazy-loaded.

## Testing notes

`HttpTestingController.expectOne` does not work against paced batches: the second write is not issued until 150 ms after the first is flushed, so the request does not exist yet when the spec looks for it. Both [media-upload.service.spec.ts](src/app/core/services/media-upload.service.spec.ts) and [drive.component.spec.ts](src/app/pages/drive/drive.component.spec.ts) keep a small `waitForRequest`/`waitForPost` helper that polls `httpMock.match(url)` until the request appears, then flush one at a time in order. Use `httpMock.expectNone(...)` to assert the _absence_ of a write — that is how the Gallery/Drive separation is pinned.

Loader behaviour is testable without a fixture: inject `LoadingService` and sample `isLoading()` on an interval shorter than `WRITE_GAP_MS` across a batch — if it ever reads `false` mid-batch, the flicker is back.

## Demo credentials (seeded in `db.json`)

| Role           | Identifier                       | Password       |
| :------------- | :------------------------------- | :------------- |
| admin          | `admin` or `admin@gmail.com`     | `Admin@123`    |
| manager        | `manager` or `manager@gmail.com` | `Manager@123`  |
| employee       | `employee@gmail.com`             | `Employee@123` |
| employees 4–40 | `<name>@demo.com`                | `Demo@123`     |

Signup always assigns the `employee` role.

## Existing docs

[README.md](README.md) and [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) cover setup and feature walkthroughs; [ANTIGRAVITY.md](ANTIGRAVITY.md) is an architecture blueprint from a prior assistant. All three have drifted — they reference a `toast-container/` component and `environment.prod.ts` that do not exist (the real files are `snackbar-content/` and a single `environment.ts`), and paths are written as `d:/user-managment/`. Trust the source tree over these documents.
