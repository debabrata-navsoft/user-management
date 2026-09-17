import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { LucideAngularModule } from 'lucide-angular';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, UiButtonComponent, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly roleOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Manager', value: 'manager' },
    { label: 'Employee', value: 'employee' },
  ];

  form = this.fb.group({
    role: [''],
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  isLoading = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');
  selectedRole = signal('');

  roleConfig = computed(() => {
    const role = this.selectedRole().toLowerCase();
    const isUserRole = role === 'admin' || role === 'manager';
    return {
      label: isUserRole
        ? 'Username'
        : role === 'employee'
          ? 'Email Address'
          : 'Username / Email Address',
      placeholder:
        role === 'admin'
          ? 'admin'
          : role === 'manager'
            ? 'manager'
            : role === 'employee'
              ? 'employee@gmail.com'
              : 'Enter username or email',
      icon: isUserRole ? 'user' : 'mail',
    };
  });

  onRoleChange(): void {
    this.selectedRole.set(this.form.get('role')?.value || '');
    this.errorMessage.set('');
  }

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
        role: val.role || undefined,
        password: val.password || '',
      })
      .subscribe({
        next: (user) => {
          this.isLoading.set(false);
          this.snackbar.success(`Welcome back, ${user.name}!`, 'Logged in');

          const returnUrl = this.route.snapshot.queryParams['returnUrl'];
          if (returnUrl && returnUrl !== '/' && returnUrl !== '') {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.authService.redirectAfterLogin(user.role);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.message || 'Invalid username/email or password.');
        },
      });
  }
}
