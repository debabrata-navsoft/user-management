import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UiButtonComponent,
    FormFieldComponent,
    LucideAngularModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  isLoading = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  isFieldInvalid(name: string): boolean {
    const control = this.form.get(name);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const val = this.form.value;
    this.authService
      .login({
        identifier: val.identifier || undefined,
        password: val.password || '',
      })
      .subscribe({
        next: (user) => {
          this.isLoading.set(false);
          this.snackbar.success(`Welcome back, ${user.name}!`, 'Logged in');

          // A bookmarked or stale returnUrl can name another role's dashboard, which
          // roleGuard would bounce with an "Access Denied" toast. Every dashboard is
          // role-owned, so let redirectAfterLogin pick the right one instead.
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] as string | undefined;
          if (returnUrl && returnUrl !== '/' && !returnUrl.endsWith('/dashboard')) {
            this.router.navigateByUrl(returnUrl, { replaceUrl: true });
          } else {
            this.authService.redirectAfterLogin(user.role);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.message || 'Unable to sign in. Please try again.');
        },
      });
  }
}
