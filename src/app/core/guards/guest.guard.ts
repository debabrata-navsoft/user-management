import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // The role is what names a dashboard. A session without one has nowhere to be sent —
  // bouncing it to `homeUrl()` would land back on this page and loop.
  if (authService.isAuthenticated() && authService.currentRole()) {
    return router.createUrlTree([authService.homeUrl()]);
  }

  return true;
};
