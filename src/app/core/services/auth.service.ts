import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthSession,
  ChangePasswordPayload,
  LoginCredentials,
  Role,
  SignUpPayload,
  User,
} from '../models/user.model';
import { SnackbarService } from './snackbar.service';

const SESSION_KEY = 'user_manage_session';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  private sessionSignal = signal<AuthSession | null>(this.loadStoredSession());

  currentUser = computed(() => this.sessionSignal()?.user ?? null);
  isAuthenticated = computed(() => !!this.sessionSignal() && !this.isSessionExpired());
  currentRole = computed<Role | null>(() => this.sessionSignal()?.user?.role ?? null);

  constructor() {
    if (this.sessionSignal() && this.isSessionExpired()) {
      this.clearSession();
    } else if (this.sessionSignal()?.user?.id) {
      this.refreshCurrentUser();
    }
  }

  refreshCurrentUser(): void {
    const currentId = this.sessionSignal()?.user?.id;
    if (!currentId) return;
    this.http
      .get<User>(`${environment.apiUrl}/users/${currentId}`)
      .pipe(catchError(() => of(null)))
      .subscribe((latestUser) => {
        if (latestUser) {
          this.setSession(latestUser);
        }
      });
  }

  login(credentials: LoginCredentials): Observable<User> {
    const input = (credentials.identifier || credentials.username || credentials.email || '')
      .trim()
      .toLowerCase();

    return this.http.get<User[]>(`${environment.apiUrl}/users`).pipe(
      map((users) => {
        const user = users.find((u) => {
          const matchId =
            u.email?.toLowerCase() === input ||
            u.username?.toLowerCase() === input ||
            (input === 'admin' && u.role === 'admin') ||
            (input === 'manager' && u.role === 'manager');

          if (!matchId) return false;
          if (credentials.role && u.role?.toLowerCase() !== credentials.role.trim().toLowerCase()) {
            return false;
          }
          return true;
        });

        if (!user) {
          throw new Error('No account found matching the provided credentials.');
        }
        if (user.password !== credentials.password) {
          throw new Error('Invalid username/email or password.');
        }
        if (user.status === 'inactive') {
          throw new Error('Your account has been deactivated. Please contact an administrator.');
        }

        return user;
      }),
      tap((user) => this.setSession(user)),
    );
  }

  checkEmailExists(email: string): Observable<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return of(false);
    }
    return this.http
      .get<User[]>(`${environment.apiUrl}/users`, {
        params: { email: cleanEmail },
      })
      .pipe(
        map((users) => users && users.some((u) => u.email.toLowerCase() === cleanEmail)),
        catchError(() => of(false)),
      );
  }

  signUp(payload: SignUpPayload): Observable<User> {
    const email = payload.email.trim().toLowerCase();

    return this.http
      .get<User[]>(`${environment.apiUrl}/users`, {
        params: { email },
      })
      .pipe(
        switchMap((existingUsers) => {
          if (existingUsers && existingUsers.length > 0) {
            return throwError(() => new Error('An account with this email already exists.'));
          }

          const newUser: Partial<User> = {
            name: payload.name.trim(),
            email,
            password: payload.password,
            role: payload.role || 'employee',
            phone: payload.phone || '',
            department: payload.department || 'General',
            status: 'active',
            createdAt: new Date().toISOString(),
          };

          return this.http.post<User>(`${environment.apiUrl}/users`, newUser);
        }),
      );
  }

  forgotPassword(email: string): Observable<User> {
    const cleanEmail = email.trim().toLowerCase();
    return this.http
      .get<User[]>(`${environment.apiUrl}/users`, {
        params: { email: cleanEmail },
      })
      .pipe(
        map((users) => {
          const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
          if (!user) {
            throw new Error('No account found associated with this email address.');
          }
          return user;
        }),
      );
  }

  resetPassword(userId: string | number, newPassword: string): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/users/${userId}`, {
      password: newPassword,
    });
  }

  changePassword(userId: string | number, payload: ChangePasswordPayload): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/${userId}`).pipe(
      switchMap((user) => {
        if (!user) {
          return throwError(() => new Error('User not found.'));
        }
        if (user.password !== payload.currentPassword) {
          return throwError(() => new Error('Current password does not match.'));
        }
        return this.http.patch<User>(`${environment.apiUrl}/users/${userId}`, {
          password: payload.newPassword,
        });
      }),
    );
  }

  logout(redirect: boolean = true): void {
    this.clearSession();
    this.snackbar.info('You have been logged out.');
    if (redirect) {
      this.router.navigate(['/login']);
    }
  }

  hasRole(...roles: Role[]): boolean {
    const current = this.currentRole();
    return !!current && roles.includes(current);
  }

  redirectAfterLogin(role?: Role): void {
    const target = role || this.currentRole();
    const dest =
      target === 'admin'
        ? '/admin/dashboard'
        : target === 'manager'
          ? '/manager/dashboard'
          : '/user/dashboard';
    this.router.navigate([dest], { replaceUrl: true });
  }

  getToken(): string | null {
    return this.sessionSignal()?.token ?? null;
  }

  private setSession(user: User): void {
    const { password, ...userWithoutPassword } = user;
    const expiresAt = Date.now() + (environment.sessionMinutes || 120) * 60 * 1000;
    const token = btoa(
      JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        exp: expiresAt,
      }),
    );

    const session: AuthSession = {
      token,
      user: userWithoutPassword,
      expiresAt,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.sessionSignal.set(session);
  }

  private clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    this.sessionSignal.set(null);
  }

  private loadStoredSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const session: AuthSession = JSON.parse(stored);
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  private isSessionExpired(): boolean {
    const session = this.sessionSignal();
    return !session || Date.now() > session.expiresAt;
  }
}
