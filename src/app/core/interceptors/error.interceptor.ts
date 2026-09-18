import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SnackbarService } from '../services/snackbar.service';
import { BATCHED_WRITE } from '../utils/write-pacing';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const snackbar = inject(SnackbarService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred.';

      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage = `Client error: ${error.error.message}`;
      } else if (error.status === 0) {
        errorMessage =
          'Unable to connect to mock API server. Please ensure `npm run api` is running on port 3000.';
        // A paced batch retries the drop itself and sums up the result once, so a toast
        // here would fire per attempt for a run that may well recover.
        if (!req.context.get(BATCHED_WRITE)) {
          snackbar.error(errorMessage, 'Network Connection Error');
        }
      } else if (error.status === 401) {
        authService.logout(true);
        errorMessage = 'Your session has expired. Please log in again.';
        snackbar.error(errorMessage, 'Session Expired');
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
        snackbar.error(errorMessage, 'Forbidden');
      } else if (error.status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (error.status >= 500) {
        errorMessage = `Server error (${error.status}): Please try again later.`;
        snackbar.error(errorMessage, 'Server Error');
      }

      return throwError(() => error);
    }),
  );
};
