import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
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

  const run = (url: string): UrlTree =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as UrlTree;

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

  it('sends a dashboard (what Back hits after logout) to a bare /login, silently', () => {
    expect(router.serializeUrl(run('/admin/dashboard'))).toBe('/login');
    expect(warned).toEqual([]);
  });

  it('keeps the returnUrl and the warning for a real deep link', () => {
    expect(router.serializeUrl(run('/admin/users'))).toBe('/login?returnUrl=%2Fadmin%2Fusers');
    expect(warned.length).toBe(1);
  });
});
