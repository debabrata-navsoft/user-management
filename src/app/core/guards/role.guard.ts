import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { SnackbarService } from '../services/snackbar.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackbar = inject(SnackbarService);

  const allowedRoles = route.data['roles'] as Role[] | undefined;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (authService.hasRole(...allowedRoles)) {
    return true;
  }

  snackbar.error(
    `You do not have permission to view this page. Required: ${allowedRoles.join(', ')}`,
    'Access Denied',
  );

  return router.createUrlTree(['/unauthorized']);
};
