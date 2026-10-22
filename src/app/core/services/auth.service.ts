import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
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
  currentRole = computed<Role | null>(() => this.sessionSignal()?.user?.role ?? null);

  // A plain method, not a computed: expiry depends on Date.now(), which no
  // signal tracks, so a computed would cache `true` past `expiresAt`.
  isAuthenticated(): boolean {
    return !!this.sessionSignal() && !this.isSessionExpired();
  }

  isCurrentUser(id: string | number | undefined): boolean {
    const me = this.currentUser();
    return !!me && id !== undefined && String(id) === String(me.id);
  }

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
      .pipe(catchError((err: HttpErrorResponse) => (err.status === 404 ? of(null) : EMPTY)))
      .subscribe((latestUser) => {
        const session = this.sessionSignal();
        if (session?.user?.id !== currentId) return;
        if (!latestUser || latestUser.status === 'inactive') {
          this.clearSession();
          this.snackbar.warning('Your account is no longer active. Please sign in again.');
          this.router.navigate(['/login']);
          return;
        }
        this.setSession(latestUser, session.expiresAt);
      });
  }

  login(credentials: LoginCredentials): Observable<User> {
    const input = (credentials.identifier || credentials.username || credentials.email || '')
      .trim()
      .toLowerCase();

    return this.http.get<User[]>(`${environment.apiUrl}/users`).pipe(
      map((users) => {
        const user = users.find((u) => {
          const matchId = u.email?.toLowerCase() === input || u.username?.toLowerCase() === input;

          if (!matchId) return false;
          if (credentials.role && u.role?.toLowerCase() !== credentials.role.trim().toLowerCase()) {
            return false;
          }
          return true;
        });

        if (!user) {
          throw new Error(
            'No account found for that username or email. Please check it, or create a new account.',
          );
        }
        if (user.password !== credentials.password) {
          throw new Error('Incorrect password. Please try again.');
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
            throw new Error('No account found for that email address.');
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
    this.snackbar.info('You have been logged out.', 'Logout');
    if (redirect) {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  hasRole(...roles: Role[]): boolean {
    const current = this.currentRole();
    return !!current && roles.includes(current);
  }

  ownerScope(
    owner: Pick<User, 'email' | 'name'> | null,
    base: Record<string, string | number> = {},
  ): HttpParams {
    let params = new HttpParams({ fromObject: base });
    for (const identity of [owner?.email, owner?.name]) {
      if (identity) params = params.append('uploadedBy', identity);
    }
    return params;
  }

  ownedScope(base: Record<string, string | number> = {}): HttpParams {
    return this.ownerScope(this.currentUser(), base);
  }

  homeUrl(role: Role | null = this.currentRole()): string {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'manager') return '/manager/dashboard';
    if (role === 'employee') return '/user/dashboard';
    return '/login';
  }

  /**
   * A role's landing page (or the bare root) is never worth a `returnUrl`:
   * login picks the dashboard from the role anyway, so carrying it only
   * clutters the URL — and a stale one is what Back lands on after logout.
   */
  isLandingUrl(url: string | null | undefined): boolean {
    const path = (url ?? '').split(/[?#]/)[0].replace(/\/+$/, '');
    return !path || path.endsWith('/dashboard');
  }

  redirectAfterLogin(role?: Role): void {
    this.router.navigate([this.homeUrl(role ?? this.currentRole())], { replaceUrl: true });
  }

  getToken(): string | null {
    return this.sessionSignal()?.token ?? null;
  }

  private setSession(
    user: User,
    expiresAt = Date.now() + (environment.sessionMinutes || 120) * 60 * 1000,
  ): void {
    const { password, ...userWithoutPassword } = user;
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
