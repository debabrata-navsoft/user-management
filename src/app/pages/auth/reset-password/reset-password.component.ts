import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AppValidators } from '../../../core/utils/validators';
import { LucideAngularModule } from 'lucide-angular';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, UiButtonComponent, LucideAngularModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  userId = signal<string | number>('');
  targetEmail = signal<string>('');

  form: FormGroup = this.fb.group(
    {
      newPassword: ['', [Validators.required, AppValidators.passwordStrength()]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [AppValidators.match('newPassword', 'confirmPassword')],
    },
  );

  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  toggleShowNewPassword(): void {
    this.showNewPassword.update((v) => !v);
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.queryParams['userId'];
    const email = this.route.snapshot.queryParams['email'];

    if (!id || !email) {
      this.snackbar.error('Invalid password reset session. Please request a new link.');
      this.router.navigate(['/forgot-password']);
      return;
    }

    this.userId.set(id);
    this.targetEmail.set(email);
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

    const newPassword = this.form.value.newPassword;

    this.authService.resetPassword(this.userId(), newPassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackbar.success(
          'Password has been reset successfully! Please sign in with your new password.',
          'Password Changed',
        );
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Failed to update password.');
      },
    });
  }
}
