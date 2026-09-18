import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const role = authService.currentRole();
    const dest =
      role === 'admin'
        ? '/admin/dashboard'
        : role === 'manager'
          ? '/manager/dashboard'
          : '/user/dashboard';
    return router.createUrlTree([dest]);
  }

  return true;
};
