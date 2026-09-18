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

Nothing works without `npm run api` — every service targets `environment.apiUrl` (`http://localhost:3000`), and `error.interceptor.ts` surfaces a specific "run `npm run api`" toast on status 0. The script serves **`backend/json-server/db.json`** (~32 MB); that folder also carries its own `package.json` whose `start`/`dev`/`serve` scripts run the same file. There is no database anywhere else in the repo.

**Never add `--watch` to any of those scripts.** The app is the only writer of `db.json`, so `--watch` only ever fires on json-server's _own_ writes: it reloads the multi-MB file after every POST/DELETE, aborts any request in flight during that reload, and silently kills the process — the whole batch then fails with `ERR_EMPTY_RESPONSE` / `ERR_CONNECTION_REFUSED`. Writes still persist without it. If a multi-file upload or bulk delete starts failing with "Network Connection Error", check how the server was started before touching app code.

## Stack constraints that shape all code

- **Angular 21, zoneless** (`provideZonelessChangeDetection()` in [app.config.ts](src/app/app.config.ts)). State that drives templates must be a `signal`/`computed`, or the view will not update. Never reach for zone-based patterns.
- **Standalone components only.** No NgModules. Inputs/outputs use the signal APIs (`input()`, `output()`), not decorators — see [ui-button.component.ts](src/app/shared/components/ui-button/ui-button.component.ts) and [data-table.component.ts](src/app/shared/components/data-table/data-table.component.ts). `@ContentChild` is still used for template projection.
- **TypeScript is fully strict**, including `noPropertyAccessFromIndexSignature` and `strictTemplates`. Route data is read as `route.data['roles']`, not `route.data.roles`.
- Components keep template and styles in sibling `.html`/`.css` files — always `templateUrl`/`styleUrl`, never inline `template`/`styles`.

### Two signal traps this codebase has already hit

**A `computed` only recomputes when something it _read_ changes.** [form-field.component.ts](src/app/shared/components/form-field/form-field.component.ts) shows the shape of the bug: `invalid()` subscribed to the control's `events`, but `message()` read only `invalid()` and `control.errors`. Swapping one error for another (`required` → `passwordStrength` as the user types) leaves `invalid()` reading `true` throughout, so its value never changes and the memoised message froze on the first failure. Any computed derived from a non-signal source — a `FormControl`, a DOM measurement — must read the change signal itself, not a boolean derived from it.

**A helper called from an `effect` must not read a signal it writes.** `linkDepartmentToRole` in [departments.ts](src/app/core/utils/departments.ts) is called from the user modal's `effect`; when its `seed()` read the internal `role` signal, that effect started depending on it, so picking a role re-ran the effect and `form.reset()` wiped the selection. The fix is to pass the value in as an argument (or `untracked()` the read). Symptom to recognise: a form control accepts a value and change detection immediately reverts it.

## Icons: the most common build/test break

Lucide icons are tree-shaken through `LucideAngularModule.pick({...})` in [app.config.ts](src/app/app.config.ts). An icon used in a template but missing from that `pick` map silently renders nothing. Templates reference icons by **kebab-case name** (`'layout-dashboard'`), while the `pick` map takes the **PascalCase import**.

The same applies in tests: any spec that instantiates a component or service touching icons must replicate the `importProvidersFrom(LucideAngularModule.pick({...}))` provider — [auth.service.spec.ts](src/app/core/services/auth.service.spec.ts) does this because `AuthService` injects `SnackbarService`.

## Architecture

**Auth is signal-based and entirely client-side.** [auth.service.ts](src/app/core/services/auth.service.ts) holds one `sessionSignal` fed from `localStorage` (`user_manage_session`); `currentUser`, `isAuthenticated`, and `currentRole` are `computed` off it. Login fetches `/users`, matches identifier + role in memory, and compares plaintext passwords — there is no real auth endpoint. The "token" is a `btoa` JSON blob with an `exp`, and `sessionMinutes` in [environment.ts](src/environments/environment.ts) controls expiry. On boot the constructor either clears an expired session or calls `refreshCurrentUser()` to resync against `db.json`.

**Route protection is two-layered** in [app.routes.ts](src/app/app.routes.ts): the shell route carries `authGuard`, and each child carries `roleGuard` with `data: { roles: [...] }`. Roles are `'admin' | 'manager' | 'employee'`; `guestGuard` keeps a signed-in user off the auth pages. All pages are lazily `loadComponent`-ed.

**One method decides where a role belongs: `AuthService.homeUrl(role?)`.** The empty child path's functional `redirectTo`, both guards and `redirectAfterLogin` all call it, because four copies of the same role→dashboard ladder drifted into a real bug. Without a role it returns **`/login`**, and that matters: `redirectTo` is resolved during URL recognition, _before_ `authGuard` runs, so a ladder that fell through to the employee dashboard made a signed-out visitor land on `/login?returnUrl=%2Fuser%2Fdashboard` — then an admin signing in there got bounced by `roleGuard` with an "Access Denied" toast. For the same reason [login.component.ts](src/app/pages/auth/login/login.component.ts) ignores a `returnUrl` pointing at any `/dashboard` and lets `redirectAfterLogin` choose; real deep links are still honoured. `guestGuard` also checks the role before redirecting, or a session without one would bounce `/login` → `/login` forever.

**Three interceptors run in a fixed order** (`auth → loading → error`): bearer injection, a request-counter loading signal consumed by the shell's loader, and centralized `HttpErrorResponse` → snackbar mapping (401 forces logout). Because the error interceptor already toasts, page components generally only need to handle their own success paths.

**There is only ever one loader on screen, and the request count owns it.** [loading.service.ts](src/app/core/services/loading.service.ts) counts in-flight requests; [layout.component.html](src/app/layout/layout.component.html) renders one fullscreen `app-loader` while that count is above zero, and `LoaderComponent.shouldDisplay` makes every _inline_ loader hide itself while the overlay is up — so a page's own loader and the global one are never visible together. The catch is multi-request actions: the count drops to zero between requests, the overlay unmounts, the page's inline loader appears in the gap, and the next request swaps them back — one flicker per request. Any action that issues several requests must therefore hold the count open itself (`loading.show()` … `loading.hide()` in a `finally`, which nests safely) and **not** also set a page-level loading signal. `runUploads` in [media-upload.service.ts](src/app/core/services/media-upload.service.ts) is the worked example.

**`json-server` v0.17 query semantics are baked into the services.** [user.service.ts](src/app/core/services/user.service.ts) relies on `_page`/`_limit`/`_sort`/`_order`, the `q` full-text param, and reads total count from the `X-Total-Count` response header (hence `observe: 'response'`). The sentinel string `'all'` means "no filter" and is stripped before the request. Upgrading json-server would break pagination.

**Everything is stored in one `backend/json-server/db.json`** (tens of MB, and it grows with every upload) with three collections: `users`, `images` (Gallery), `nodes` (Drive). Do not read it whole — uploaded files and images are persisted as **base64 data URLs** inside it, which is why the upload ceilings exist and why the file is huge. Query it with `python3`/`jq` instead. [environment.ts](src/environments/environment.ts) sets two separate ceilings: `maxUploadMb` (2, Gallery) and `maxDriveUploadMb` (6, Drive — the largest raw size that stays under json-server's 10 MB body limit after base64's ~1.33x inflation).

**Gallery and Drive lists are scoped to the signed-in user; admins and managers see everything.** `seesAllUploads()` and `ownedScope()` on [auth.service.ts](src/app/core/services/auth.service.ts) are the single place that decides. `ownedScope(baseParams)` returns the query params for a list request and appends an owner filter unless the role is admin or manager, so the filtering happens server-side and an employee never downloads other people's base64. `uploadedBy` is stored inconsistently — the **display name** on older rows, the **email** on newer ones — so the scope appends both, which json-server reads as OR for a repeated param. Applied in `ImageService.getImages()`, `DriveService.getNodes()` and `DriveService.getVisibleNodes()`. `DriveService.getAllNodes()` stays **deliberately unscoped**: breadcrumbs walk ancestors and `deleteNode` collects descendants, and skipping a node owned by someone else would break a path or orphan a child. Use `getVisibleNodes()` for anything that displays a list.

**Drive is a recursive parent-child tree** ([drive.service.ts](src/app/core/services/drive.service.ts)): `DriveNode` has `parentId` pointing at `'root'` (the `DRIVE_ROOT` constant) or another folder id. Ids are client-generated (`folder-xxxxxxx` / `file-xxxxxxx`) because json-server cannot assign them for string-keyed trees. Breadcrumbs and deletion both fetch **all** nodes and walk the tree in memory; `deleteNode` collects descendants and deletes them through `runPacedWrites` (see write pacing below), failing loudly with a "deleted N of M" error if any drop out.

Clicking a node routes three ways in `openPreview`: folders navigate, images and videos go to the in-app lightbox, and **documents open in a new browser tab**. That last path cannot use the stored `dataUrl` directly — Chrome has blocked top-frame navigation to `data:` URLs since v60, so `window.open` on one silently yields a blank tab. [data-url.ts](src/app/core/utils/data-url.ts) re-wraps the bytes in a `Blob` and opens an object URL instead (revoked on a timer; revoking immediately races the new tab's load). Chrome renders PDFs, text and CSV itself and downloads what it cannot display — Word and Excel always download, and no browser-side change alters that. The old preview modal survives as the fallback for a blocked pop-up or a node with no bytes.

**Gallery and Drive are independent stores — uploads never cross over.** [media-upload.service.ts](src/app/core/services/media-upload.service.ts) is the single entry point for both, but it keeps two disjoint paths: `uploadToGallery()` POSTs to `/images` only, `uploadToDrive()` (and `readAndUploadToDrive()`, which reads the `File[]` first) POSTs to `/nodes` only. An earlier design mirrored every image upload into both collections and cross-linked them with `galleryId`/`driveNodeId` fields; that was removed deliberately — uploading in the Gallery must not make the file appear in Drive, and vice versa. Do not reintroduce a mirror, and do not add link fields back to `DriveNode`/`ImageItem`. `readFiles()` handles the size ceiling and unreadable files, and every path returns the same `MediaUploadOutcome` (`uploaded` / `tooLarge` / `duplicates` / `failed`, plus `connectionLost` when the API stopped responding mid-batch) which `report()` turns into snackbars — callers pass a destination label and otherwise only handle their own refresh.

**`accept` is a hint, so the upload modal enforces it in code.** The OS file dialog lets the user switch its filter to "All files", and a drag-and-drop never consults `accept` at all — that is how an `.mp4` once landed in the Gallery. `isAccepted()` in [upload-modal.component.ts](src/app/shared/components/upload-modal/upload-modal.component.ts) re-applies the rules (exact MIME, `type/*`, `.ext`, `*/*`), falling back to the filename through `describeFileType` when the browser hands over a file with no MIME type. A rejected file **never enters the preview queue** — it is skipped before a preview is built and reported in one snackbar, rather than shown as a card with an error. Rejected and oversized files are also not read into memory.

**Batched writes are paced, never parallel** ([write-pacing.ts](src/app/core/utils/write-pacing.ts)). json-server rewrites the whole multi-MB `db.json` on every write, so a back-to-back batch makes it start dropping connections mid-run — this is what left bulk delete half-finished. `pause()` puts `WRITE_GAP_MS` (150 ms) between writes. A status-0 drop is usually **transient** — the server is mid-rewrite, not dead — so `attemptWrite()` retries the same write `WRITE_RETRIES` (2) more times with a growing `RETRY_BACKOFF_MS` (700 ms) wait before giving up; only then is the connection treated as lost and the remainder recorded as never-attempted. `runPacedWrites()` wraps the whole pattern and returns `{ done, failed, pending, aborted }` — it is the **single** batch loop: [drive.service.ts](src/app/core/services/drive.service.ts) `deleteNode`, the Gallery's bulk delete and `runUploads` in [media-upload.service.ts](src/app/core/services/media-upload.service.ts) all go through it, the last one only mapping the result onto `MediaUploadOutcome`.

Every request in such a batch must carry `context: batchedWrite()`. That sets the `BATCHED_WRITE` token which `error.interceptor.ts` checks to **suppress its status-0 toast**: the batch retries and then reports its own one-line summary, so the interceptor firing per attempt would bury it under "Network Connection Error" toasts. Treat sequential-and-paced as the default for any loop of writes; `forkJoin` over a list of POSTs/DELETEs will fail under load.

**The Gallery page is two exclusive views.** [gallery.component.html](src/app/pages/gallery/gallery.component.html) is an `@if (activeImage())` / `@else`: the Product Magnifier Studio, or [gallery-collection/](src/app/pages/gallery/gallery-collection/) — never both. The page owns all the state and the collection component only renders and emits, in the same shape as `drive-content`. Two consequences worth knowing before changing it: `fetchImages()` must **not** auto-select an image (that would open the studio over the page the user asked for; it only re-resolves one already open), and because a single click swaps the view away, the card click waits `DOUBLE_CLICK_MS` (250 ms) for a second click — single click magnifies, double click opens the lightbox and cancels the pending magnify.

**Anything that hands an index to the lightbox must index the _filtered_ list.** The grid renders `filteredImages()`, so `galleryModalItems`, `activeImageIndex`, `visibleThumbnails` and `overflowThumbnailsCount` all derive from it too. Keying them off the full `images()` opens a different picture than the one clicked as soon as a search is active.

**Lightbox zoom lives in [image-modal.component.ts](src/app/shared/components/image-modal/image-modal.component.ts)**: buttons, wheel, double-click, pinch and drag-pan, 100–500%. All zoom paths funnel through one private `zoomTo(next, anchor?)` and one `apply(scale, x, y)` that clamps the pan. The measurements come from an untransformed wrapper (`#imageFrame`), not the image's own `getBoundingClientRect()` — the image's rect lags the signal until change detection flushes, which makes the clamp use a stale width mid-gesture.

**`DataTableComponent` is the reuse hub** for list pages — it composes search, filter drawer, pagination, loader, and empty state, and exposes `searchChange`/`pageChange`/`limitChange`/`filterChange` outputs. Consumers pass `TableColumn[]` plus a `#cellTemplate` for custom cells. Prefer wiring it up over hand-rolling a table. Only [user-list.component.html](src/app/pages/admin/users/user-list.component.html) uses it today; Drive and Gallery have their own grids.

**A native input bound to a signal needs writing back by hand.** `[value]="x()"` only repaints when `x()` _changes_, so any handler that rewrites or rejects what the user typed has to set `element.value` itself — otherwise the rejected text stays on screen while the model holds something else. Both [search-input.component.ts](src/app/shared/components/search-input/search-input.component.ts) (a `value` input plus an effect that pushes the parent's query into the `FormControl` with `emitEvent: false`, so the box can never show a term that is no longer filtering) and [phone-input.component.ts](src/app/shared/components/phone-input/phone-input.component.ts) (digits-only, re-writing the element and restoring the caret) exist because of this.

**Forms: what is shared and what bites.**

- `AppValidators` in [validators.ts](src/app/core/utils/validators.ts) carries `phoneNumber()`, `passwordStrength()`, `match()` and a blank-aware **`required()`** — Angular's own `Validators.required` accepts a value of only spaces, which then fails the strength rule while the field still looks empty. Password fields use `AppValidators.required()`.
- Placeholder options are `<option value="" disabled hidden>`: the prompt stays as the closed-state label but never appears as a pickable row, where choosing it would only clear the field.
- Department is driven by `linkDepartmentToRole` ([departments.ts](src/app/core/utils/departments.ts)) in both the signup form and the user modal: it owns the option list, clears a department the new role cannot have, and **disables the control until a role is picked**.
- Error text is centralised in `FormFieldComponent.message()`. Add new messages there rather than in a page.

**Styling is custom CSS design tokens, not Material.** [styles.css](src/styles.css) defines the `--bg`/`--surface`/`--primary`/`--radius`/`--shadow-*` variables every component consumes. Angular Material is present for exactly two things — `MatSnackBar` and `MatPaginator` — themed minimally in [material-theme.scss](src/material-theme.scss). Don't introduce Material components for new UI; extend the shared component catalog instead.

**`.form-control` belongs to [styles.css](src/styles.css) — do not re-declare it in a component.** Angular appends component styles after the global sheet and a scoped `.form-control[_ngcontent-x]` outranks the plain selector, so a local copy silently overrides the global one. That is not theoretical: the global `select.form-control` rule strips the native arrow (`appearance: none`) and paints its own chevron as a `background-image`, and a component redeclaring `background:` reset that image, leaving selects with no arrow at all. Same reason `.form-control:disabled` sets `background-color`, not the shorthand. Several auth pages still carry their own copies; none of them contain a `<select>`, which is the only reason they are harmless.

**Phone and tablet live in one global override layer**, [src/styles/responsive.css](src/styles/responsive.css), registered in the `styles` array of [angular.json](angular.json) alongside `styles.css`. Rules are grouped by breakpoint (**phone ≤ 640px**, **tablet 641–1024px**, plus one `≤1024px` app-frame block), then by the piece of UI they touch. Two things to know before editing it:

- **Declarations are `!important` on purpose.** Angular appends component styles to `<head>` _after_ this sheet, and a component rule like `.metrics-grid[_ngcontent-x]` outranks a plain `.metrics-grid`, so the override layer has to say so explicitly.
- **Never re-split this by role.** It used to be `admin.css` / `manager.css` / `employee.css`, but all three were loaded for every user regardless of role, and the pages share components (page header, `DataTableComponent`, paginator, modals), so the split only produced three drifting copies of the same rules. Group by breakpoint and UI area, never by who is signed in.

Desktop styling stays in each component's own `.css` file; this sheet only adds the two narrower tiers.

Production build budgets are tight (700 kB warning / 1 MB error on the initial bundle), so keep new pages lazy-loaded.

## Testing notes

`HttpTestingController.expectOne` does not work against paced batches: the second write is not issued until 150 ms after the first is flushed, so the request does not exist yet when the spec looks for it. Both [media-upload.service.spec.ts](src/app/core/services/media-upload.service.spec.ts) and [drive.component.spec.ts](src/app/pages/drive/drive.component.spec.ts) keep a small `waitForRequest`/`waitForPost` helper that polls `httpMock.match(url)` until the request appears, then flush one at a time in order. Use `httpMock.expectNone(...)` to assert the _absence_ of a write — that is how the Gallery/Drive separation is pinned.

Loader behaviour is testable without a fixture: inject `LoadingService` and sample `isLoading()` on an interval shorter than `WRITE_GAP_MS` across a batch — if it ever reads `false` mid-batch, the flicker is back.

Other things specs here have to account for:

- **Adding an icon to a template breaks that component's spec** until the icon is added to the spec's own `LucideAngularModule.pick({...})` — the error is `The "<name>" icon has not been provided by any available icon providers`.
- Gallery card gestures need a wait longer than `DOUBLE_CLICK_MS` before asserting; [gallery.component.spec.ts](src/app/pages/gallery/gallery.component.spec.ts) keeps a `settle()` helper for that.
- When a form control "does not accept a value", assert **after** `fixture.detectChanges()`. Setting it and reading it back immediately passes even when an effect resets the form on the next cycle — that is precisely how the department/role bug hid.
- One spec fails on `main` and is unrelated to whatever you are changing: `drive.component.spec.ts > opening a file > falls back to the modal when a document has no stored bytes`. Check against it before assuming you broke something.

## Demo credentials (seeded in `backend/json-server/db.json`)

| Role               | Identifier                       | Password       |
| :----------------- | :------------------------------- | :------------- |
| admin              | `admin` or `admin@gmail.com`     | `Admin@123`    |
| manager            | `manager` or `manager@gmail.com` | `Manager@123`  |
| employee           | `employee@gmail.com`             | `Employee@123` |
| ~37 demo employees | `<name>@demo.com`                | `Demo@123`     |

Only the admin and manager rows carry a `username`; everyone else signs in with their email. The signup form offers a role, and `AuthService.signUp()` falls back to `employee` only when none is supplied — do not assume a new account is always an employee.

## Existing docs

[README.md](README.md) and [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) cover setup and feature walkthroughs; [ANTIGRAVITY.md](ANTIGRAVITY.md) is an architecture blueprint from a prior assistant. All three have drifted — they reference a `toast-container/` component and `environment.prod.ts` that do not exist (the real files are `snackbar-content/` and a single `environment.ts`), and paths are written as `d:/user-managment/`. Trust the source tree over these documents.
