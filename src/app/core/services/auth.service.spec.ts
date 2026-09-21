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

  it('sends each role to its own dashboard, and a session-less visitor to login', () => {
    expect(service.homeUrl('admin')).toBe('/admin/dashboard');
    expect(service.homeUrl('manager')).toBe('/manager/dashboard');
    expect(service.homeUrl('employee')).toBe('/user/dashboard');

    // Guessing a dashboard here is what used to leak `/user/dashboard` into the
    // login returnUrl for signed out visitors, whatever role they then signed in as.
    expect(service.homeUrl(null)).toBe('/login');
    expect(service.homeUrl()).toBe('/login');
  });

  it('should authenticate user and store session on valid login without requiring role input', () => {
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

    service.login({ identifier: 'admin@demo.com', password: 'Password123' }).subscribe((user) => {
      expect(user.email).toBe('admin@demo.com');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentRole()).toBe('admin');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  describe('ownedScope', () => {
    /** Signs a role in through the normal login path, so the session is the real thing. */
    const signIn = (role: string, name: string, email: string) => {
      service.login({ identifier: email, password: 'Password123' }).subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/users`)
        .flush([{ id: 9, name, email, password: 'Password123', role, status: 'active' }]);
    };

    it('limits an employee to their own rows, by email or display name', () => {
      signIn('employee', 'Emma Employee', 'emma@demo.com');

      const params = service.ownedScope({ _sort: 'createdAt', _order: 'desc' });
      // Older rows stored the display name, newer ones the email — json-server ORs them.
      expect(params.getAll('uploadedBy')).toEqual(['emma@demo.com', 'Emma Employee']);
      expect(params.get('_sort')).toBe('createdAt');
    });

    it('scopes an admin to their own rows as well', () => {
      signIn('admin', 'System Admin', 'admin@demo.com');

      // Admins review someone else's uploads from the user list, not from their own gallery.
      expect(service.ownedScope({ parentId: 'root' }).getAll('uploadedBy')).toEqual([
        'admin@demo.com',
        'System Admin',
      ]);
    });

    it('scopes a query to any named owner, for that user-list review', () => {
      const params = service.ownerScope({ email: 'emma@demo.com', name: 'Emma Employee' });

      expect(params.getAll('uploadedBy')).toEqual(['emma@demo.com', 'Emma Employee']);
    });

    it('does not filter at all without an owner, which would hide every row', () => {
      expect(service.ownerScope(null, { parentId: 'root' }).has('uploadedBy')).toBe(false);
    });
  });

  it('should reject login when user is not found or password is wrong', () => {
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

    service.login({ identifier: 'admin@demo.com', password: 'WrongPassword' }).subscribe({
      next: () => expect.unreachable('login should not succeed with wrong password'),
      error: (err: Error) => (error = err),
    });

    httpMock.expectOne(`${environment.apiUrl}/users`).flush(mockUsers);

    expect(error?.message).toBe('Incorrect password. Please try again.');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should register a new user with the selected role', () => {
    const newUserPayload = {
      name: 'Jane Manager',
      email: 'jane@example.com',
      role: 'manager' as const,
      password: 'Password123!',
      department: 'Sales',
    };

    service.signUp(newUserPayload).subscribe((createdUser) => {
      expect(createdUser.role).toBe('manager');
      expect(createdUser.name).toBe('Jane Manager');
    });

    const checkReq = httpMock.expectOne(`${environment.apiUrl}/users?email=jane@example.com`);
    expect(checkReq.request.method).toBe('GET');
    checkReq.flush([]);

    const postReq = httpMock.expectOne(`${environment.apiUrl}/users`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body.role).toBe('manager');
    postReq.flush({
      id: 2,
      ...newUserPayload,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  });

  it('should clear session on logout', () => {
    service.logout(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });
});
