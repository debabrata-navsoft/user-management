import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SnackbarService } from '../services/snackbar.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackbar = inject(SnackbarService);

  if (authService.isAuthenticated()) {
    return true;
  }

  const fromHistory = router.currentNavigation()?.trigger === 'popstate';
  if (fromHistory || authService.isLandingUrl(state.url)) {
    return new RedirectCommand(router.createUrlTree(['/login']), { replaceUrl: true });
  }

  snackbar.warning('Please log in to access this page.', 'Access Restricted');
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
