import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LucideAngularModule,
  TriangleAlert,
  X,
} from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(
          LucideAngularModule.pick({
            Info,
            CheckCircle2,
            AlertCircle,
            TriangleAlert,
            X,
          }),
        ),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created and initially unauthenticated', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should authenticate user and store session on valid login', () => {
    const mockUsers = [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@demo.com',
        password: 'Password123',
        role: 'admin',
        status: 'active',
      },
    ];

    service
      .login({ email: 'admin@demo.com', role: 'admin', password: 'Password123' })
      .subscribe((user) => {
        expect(user.email).toBe('admin@demo.com');
        expect(service.isAuthenticated()).toBe(true);
        expect(service.currentRole()).toBe('admin');
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/users`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('should reject login when no role is selected', () => {
    let error: Error | undefined;

    service.login({ email: 'admin@demo.com', password: 'Password123' }).subscribe({
      next: () => expect.unreachable('login should not succeed without a role'),
      error: (err: Error) => (error = err),
    });

    expect(error?.message).toBe('Please select a role to continue.');
    expect(service.isAuthenticated()).toBe(false);
    httpMock.expectNone(`${environment.apiUrl}/users`);
  });

  it('should reject login when the role does not match the account', () => {
    const mockUsers = [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@demo.com',
        password: 'Password123',
        role: 'admin',
        status: 'active',
      },
    ];
    let error: Error | undefined;

    service
      .login({ email: 'admin@demo.com', role: 'employee', password: 'Password123' })
      .subscribe({
        next: () => expect.unreachable('login should not succeed with a mismatched role'),
        error: (err: Error) => (error = err),
      });

    httpMock.expectOne(`${environment.apiUrl}/users`).flush(mockUsers);

    expect(error?.message).toBe('No account found matching the provided credentials.');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should clear session on logout', () => {
    service.logout(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });
});
