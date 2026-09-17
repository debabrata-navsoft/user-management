# 🚀 UserManage - Comprehensive Project Documentation & Architecture Guide

> **Application Name:** UserManage (SaaS Core Platform)  
> **Framework & Version:** Angular 21 (Standalone Components & Signals Architecture)  
> **Testing Suite:** Vitest + Angular TestBed  
> **Mock Backend:** JSON Server REST API (`db.json`)  
> **Styling & UI:** Custom modern design system + Lucide Icons + Angular Material CDK  
> **Last Updated:** September 2026

---

## 📑 Table of Contents

1. [Project Overview & Architecture](#-project-overview--architecture)
2. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
3. [User Credentials & Seed Accounts](#-user-credentials--seed-accounts)
4. [Authentication & Dynamic Login System](#-authentication--dynamic-login-system)
5. [Feature Modules & Components](#-feature-modules--components)
   - [5.1 Layout & Navigation Shell](#51-layout--navigation-shell)
   - [5.2 Admin Dashboard & Analytics](#52-admin-dashboard--analytics)
   - [5.3 Manager Dashboard](#53-manager-dashboard)
   - [5.4 Employee / User Dashboard](#54-employee--user-dashboard)
   - [5.5 User Management & Advanced Filtering](#55-user-management--advanced-filtering)
   - [5.6 File & Drive Manager (Google Drive Style)](#56-file--drive-manager-google-drive-style)
   - [5.7 Image Gallery & Interactive Zoom Magnifier](#57-image-gallery--interactive-zoom-magnifier)
   - [5.8 User Profile & Security Center](#58-user-profile--security-center)
6. [Reusable UI Component Library](#-reusable-ui-component-library)
7. [Core Services & State Management](#-core-services--state-management)
8. [Routing, Guards & HTTP Interceptors](#-routing-guards--http-interceptors)
9. [Database Schema (`db.json`)](#-database-schema-dbjson)
10. [Local Development, Build & Testing Guide](#-local-development-build--testing-guide)

---

## 🏛️ Project Overview & Architecture

**UserManage** is a production-grade enterprise SaaS web application engineered with modern Angular practices:

- **Signals-First Reactivity**: High-performance UI state using Angular `signal()`, `computed()`, and reactive bindings.
- **Standalone Architecture**: Zero `NgModule` clutter; all components, directives, and pipes are standalone.
- **Strict Separation of Concerns**: Clean modular directories (`/core`, `/layout`, `/pages`, `/shared`).
- **Zero-Dependency Core Styles**: Built with pure CSS custom variables (`--radius-sm`, `--color-primary`, etc.) for seamless maintainability.

---

## 🔐 Role-Based Access Control (RBAC)

The platform is strictly organized around **3 core roles**:

| Role           | Target Users               | Allowed Access Scope                                                                                                                                                       |
| :------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`admin`**    | System Administrators      | • Admin Dashboard & Analytics<br>• User Management (Full CRUD, filter drawer, pagination)<br>• File & Drive Manager<br>• Image Gallery & Magnifier<br>• Profile & Security |
| **`manager`**  | Team Managers / Leads      | • Manager Dashboard & Team Directory (Read-only)<br>• File & Drive Manager<br>• Image Gallery & Magnifier<br>• Profile & Security                                          |
| **`employee`** | Standard Employees / Users | • Employee / User Dashboard<br>• File & Drive Manager<br>• Image Gallery & Magnifier<br>• Profile & Security                                                               |

---

## 🔑 User Credentials & Seed Accounts

The mock database [`db.json`](file:///d:/user-managment/db.json) is seeded with 40 active users:

### 1. Primary Admin Account:

- **Role**: `Admin`
- **Username**: `admin`
- **Email**: `admin@gmail.com`
- **Password**: `Admin@123`
- **Name**: `System Admin`
- **Department**: `Engineering`

### 2. Primary Manager Account:

- **Role**: `Manager`
- **Username**: `manager`
- **Email**: `manager@gmail.com`
- **Password**: `Manager@123`
- **Name**: `System Manager`
- **Department**: `Management`

### 3. Primary Employee Account:

- **Role**: `Employee`
- **Email**: `employee@gmail.com`
- **Password**: `Employee@123`
- **Name**: `Standard Employee`
- **Department**: `Support`

---

## 🔑 Authentication & Dynamic Login System

The authentication module (`/pages/auth`) includes:

- **Dynamic Role Selector**: Dropdown on Login (`Please Select`, `Admin`, `Manager`, `Employee`).
- **Dynamic Identifier Input**:
  - Selecting **Admin** or **Manager**: switches field to **Username** (`admin` or `manager`).
  - Selecting **Employee**: switches field to **Email Address** (`employee@gmail.com`).
- **Password Visibility Toggles**: Interactive show/hide eye buttons (`eye` / `eye-off`) for all password inputs.
- **Self-Service Sign Up** (`/signup`): Public registration with real-time password strength validation, department selection, and password matching.
- **Forgot & Reset Password Flow** (`/forgot-password`, `/reset-password`): Complete recovery flow with email validation and secure password patching.

---

## 📦 Feature Modules & Components

### 5.1 Layout & Navigation Shell (`/layout/app-shell.component`)

- **Responsive Sidebar**: Collapsible desktop sidebar + animated mobile slide-out drawer.
- **Dynamic Navigation Filtering**: Shows only routes allowed for the active user's role.
- **Top Header Bar**: Shows personalized greeting (`Welcome back, Name`), active role badge, and user dropdown menu.
- **Dynamic User Menu**: Displays user initials, full name, email, department, and direct links to profile/logout.

### 5.2 Admin Dashboard (`/pages/admin/dashboard`)

- **KPI Metrics**: Total users, active users, inactive accounts, and platform health percentage.
- **Live Role Breakdown**: Visual horizontal distribution bars for Administrators, Managers, and Employees.
- **Department Headcount Breakdown**: Statistical aggregation across Engineering, Sales, Design, Support, and Finance.
- **Recent Registrations**: Quick table of latest registered accounts.

### 5.3 Manager Dashboard (`/pages/manager/dashboard`)

- **Team Directory**: Filterable directory of all active organization members.
- **Storage & Assets Stats**: Live overview of image assets and cloud drive node consumption.

### 5.4 Employee Dashboard (`/pages/user/dashboard`)

- **Welcome Overview**: Personal dashboard with quick action cards for file management, media gallery, and account security.

### 5.5 User Management (`/pages/admin/users`)

- **Responsive Data Table**: Full-height desktop viewport with sticky header and pinned pagination footer (`bottom: 0`).
- **Filter Drawer**: Slide-over drawer with live option counts for Roles, Departments, and Statuses.
- **Debounced Search**: Instant multi-field searching across names, usernames, and emails.
- **Server Pagination**: Configurable page sizes (`5`, `10`, `20`, `50`) with smooth page switching.
- **CRUD Operations**:
  - Add User Modal with role validation (`Admin`, `Manager`, `Employee`).
  - Edit User Modal with real-time field synchronization.
  - Delete Modal with safe confirmation dialog.
  - User Details Inspector modal.

### 5.6 File & Drive Manager (`/pages/drive`)

- **Nested Folder Architecture**: Unlimited folder nesting with breadcrumbs navigation (`My Drive > Folder > Subfolder`).
- **Dual View Modes**: Switch between Grid Card Tiles and Table List View.
- **File Upload & Storage**: Drag-and-drop file upload with base64 data persistence in `db.json`.
- **Node Management**: In-place renaming, file previewing, and recursive folder deletion.

### 5.7 Image Gallery & Zoom Magnifier (`/pages/gallery`)

- **Multiple Image Upload**: Drag-and-drop zone with multi-file thumbnail preview, resolution metrics, and file size checks.
- **Product-Style Loupe Magnifier**: 2.5x high-definition hover zoom lens following mouse movement with live magnification preview window.
- **Gallery Carousel**: Thumbnail filmstrip carousel to switch images and full-screen lightbox modal preview.

### 5.8 Profile & Security (`/pages/profile`)

- **Profile Inspector**: View current user session, avatar initials, department, and contact info.
- **Change Password Form**: Secure password modification with current password verification against `db.json`.

---

## 🎨 Reusable UI Component Library (`/shared/components`)

| Component           | Selector                | Description                                                                                                   |
| :------------------ | :---------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Button**          | `<app-ui-button>`       | Primary, secondary, danger, ghost, outline buttons with built-in loading spinner.                             |
| **Badge**           | `<app-badge>`           | Role and status pill badges with colored dot indicators (`primary`, `purple`, `indigo`, `success`, `danger`). |
| **Search Input**    | `<app-search-input>`    | Debounced search input box with clear icon.                                                                   |
| **Pagination**      | `<app-pagination>`      | Dynamic pagination controller with page size selector and item counter.                                       |
| **Modal Dialog**    | `<app-modal>`           | Accessible animated backdrop modal with ESC key dismiss and click-outside support.                            |
| **Confirm Dialog**  | `<app-confirm-dialog>`  | Safe confirmation alert modal for destructive actions.                                                        |
| **Filter Drawer**   | `<app-filter-drawer>`   | Slide-in drawer with searchable multi-select checkboxes and live matching counters.                           |
| **Image Magnifier** | `<app-image-magnifier>` | Interactive 2.5x loupe zoom lens for e-commerce style image inspection.                                       |
| **Image Modal**     | `<app-image-modal>`     | Global full-screen lightbox modal for viewing images.                                                         |
| **File Drop Zone**  | `<app-file-drop-zone>`  | Drag-and-drop file upload area with type and size validation.                                                 |
| **Loader**          | `<app-loader>`          | Circular loading indicator supporting overlay and inline modes.                                               |
| **Empty State**     | `<app-empty-state>`     | Clean zero-state illustrations with title and action button slots.                                            |
| **Page Header**     | `<app-page-header>`     | Consistent page title bar with breadcrumbs and action button container.                                       |

---

## ⚙️ Core Services & State Management (`/core/services`)

1. **[`AuthService`](file:///d:/user-managment/src/app/core/services/auth.service.ts)**:
   - Manages authentication state via `sessionSignal = signal<AuthSession | null>()`.
   - Dynamic `login(credentials)` supporting username or email resolution.
   - `refreshCurrentUser()` dynamically fetches live data on app load to ensure browser cache sync.
   - Handles password reset, password changes, and role verification via `hasRole()`.

2. **[`UserService`](file:///d:/user-managment/src/app/core/services/user.service.ts)**:
   - Paginated user queries (`getUsers`), search filtering, create, patch, and delete API calls.

3. **[`DriveService`](file:///d:/user-managment/src/app/core/services/drive.service.ts)**:
   - Manages folder hierarchy (`nodes?parentId=:id`), folder creation, uploads, renaming, and recursive deletion.

4. **[`ImageService`](file:///d:/user-managment/src/app/core/services/image.service.ts)**:
   - Handles multi-image batch uploads, base64 encoding, dimensions calculation, and gallery fetching.

5. **[`SnackbarService`](file:///d:/user-managment/src/app/core/services/snackbar.service.ts)**:
   - Centralized toast notification dispatcher (`success`, `error`, `info`, `warning`).

6. **[`LoadingService`](file:///d:/user-managment/src/app/core/services/loading.service.ts)**:
   - Global HTTP loading state counter for top-level progress indicators.

---

## 🚦 Routing, Guards & Interceptors

### Route Guards:

- **`authGuard`**: Prevents unauthenticated access to private routes; redirects to `/login?returnUrl=...`.
- **`roleGuard`**: Verifies user role permissions against route `data.roles` array; redirects unauthorized attempts to `/unauthorized`.

### HTTP Interceptors:

- **`authInterceptor`**: Injects bearer session token into outgoing HTTP requests.
- **`loadingInterceptor`**: Increments/decrements `LoadingService` active request counter.
- **`errorInterceptor`**: Intercepts HTTP errors (401, 403, 404, 500) and surfaces appropriate notifications.

---

## 💾 Database Schema (`db.json`)

The REST API is structured into three main resource collections:

```json
{
  "users": [
    {
      "id": 1,
      "name": "System Admin",
      "username": "admin",
      "email": "admin@gmail.com",
      "password": "Admin@123",
      "role": "admin",
      "phone": "+91 98200 10001",
      "department": "Engineering",
      "status": "active",
      "createdAt": "2026-01-02T09:00:00.000Z"
    }
  ],
  "images": [
    {
      "id": 1,
      "title": "Sample Image",
      "url": "data:image/jpeg;base64,...",
      "size": 1048576,
      "dimensions": { "width": 1920, "height": 1080 },
      "uploadedBy": "System Admin",
      "createdAt": "2026-09-16T18:00:00.000Z"
    }
  ],
  "nodes": [
    {
      "id": "folder-1",
      "name": "Documents",
      "type": "folder",
      "parentId": "root",
      "uploadedBy": "System Admin",
      "createdAt": "2026-09-16T18:00:00.000Z"
    }
  ]
}
```

---

## 🚀 Local Development, Build & Testing Guide

### 1. Prerequisites

- Node.js (v18+ or v20+)
- NPM (v9+)

### 2. Start Services

```bash
# Terminal 1: Start JSON Server Mock REST API (Port 3000)
npm run api

# Terminal 2: Start Angular Development Server (Port 4200)
npm start
```

_Access application at: `http://localhost:4200`_

### 3. Run Unit Tests (Vitest)

```bash
npm test -- --watch=false
```

_All 11 unit tests across all 5 test suites execute with 100% pass rate._

### 4. Build for Production

```bash
npm run build
```

_Compiles optimized production bundles with zero errors into `/dist/test-app`._
