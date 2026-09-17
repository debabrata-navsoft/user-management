import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AuthService } from './core/services/auth.service';

export const routes: Routes = [
  // Public Auth Routes
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/auth/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // Protected App Shell Routes
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const authService = inject(AuthService);
          const role = authService.currentRole();
          if (role === 'admin') return 'admin/dashboard';
          if (role === 'manager') return 'manager/dashboard';
          return 'user/dashboard';
        },
      },
      // Admin Routes
      {
        path: 'admin/dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'admin/users',
        loadComponent: () =>
          import('./pages/admin/users/user-list.component').then((m) => m.UserListComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },

      // Manager Routes
      {
        path: 'manager/dashboard',
        loadComponent: () =>
          import('./pages/manager/dashboard/manager-dashboard.component').then(
            (m) => m.ManagerDashboardComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['manager', 'admin'] },
      },

      // User / Employee Dashboard Routes
      {
        path: 'user/dashboard',
        loadComponent: () =>
          import('./pages/user/dashboard/user-dashboard.component').then(
            (m) => m.UserDashboardComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['employee', 'manager', 'admin'] },
      },

      // Shared Operational Features
      {
        path: 'drive',
        loadComponent: () => import('./pages/drive/drive.component').then((m) => m.DriveComponent),
      },
      {
        path: 'gallery',
        loadComponent: () =>
          import('./pages/gallery/gallery.component').then((m) => m.GalleryComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'unauthorized',
        loadComponent: () =>
          import('./pages/auth/unauthorized/unauthorized.component').then(
            (m) => m.UnauthorizedComponent,
          ),
      },
    ],
  },

  // 404 Catch-All
  {
    path: '**',
    loadComponent: () =>
      import('./pages/auth/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
