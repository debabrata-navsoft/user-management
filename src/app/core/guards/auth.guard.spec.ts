import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Navigation,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LucideAngularModule,
  TriangleAlert,
  X,
} from 'lucide-angular';
import { SnackbarService } from '../services/snackbar.service';
import { authGuard } from './auth.guard';

describe('authGuard (signed out)', () => {
  let router: Router;
  let warned: string[];

  const run = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  /** A redirect as the URL it lands on, plus whether it replaces the history entry. */
  const target = (result: unknown) =>
    result instanceof RedirectCommand
      ? {
          url: router.serializeUrl(result.redirectTo),
          replaceUrl: !!result.navigationBehaviorOptions?.replaceUrl,
        }
      : { url: router.serializeUrl(result as UrlTree), replaceUrl: false };

  /** Pretends the guard is running inside a browser Back/Forward navigation. */
  const fromBackButton = () => {
    Object.defineProperty(router, 'currentNavigation', {
      value: signal({ trigger: 'popstate' } as Navigation),
    });
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(
          LucideAngularModule.pick({ Info, CheckCircle2, AlertCircle, TriangleAlert, X }),
        ),
      ],
    });
    router = TestBed.inject(Router);
    warned = [];
    TestBed.inject(SnackbarService).warning = (message: string) => {
      warned.push(message);
    };
  });

  it('sends a dashboard to a bare /login, silently', () => {
    expect(target(run('/admin/dashboard'))).toEqual({ url: '/login', replaceUrl: true });
    expect(warned).toEqual([]);
  });

  it('sends any page reached with Back after logout to a bare /login, silently', () => {
    fromBackButton();

    expect(target(run('/gallery'))).toEqual({ url: '/login', replaceUrl: true });
    expect(warned).toEqual([]);
  });

  it('keeps the returnUrl and the warning for a link the user opened', () => {
    expect(target(run('/gallery')).url).toBe('/login?returnUrl=%2Fgallery');
    expect(warned.length).toBe(1);
  });
});
