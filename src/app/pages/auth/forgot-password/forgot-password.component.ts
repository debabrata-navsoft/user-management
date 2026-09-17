import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { LucideAngularModule } from 'lucide-angular';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, UiButtonComponent, LucideAngularModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

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

    const email = this.form.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: (user) => {
        this.isLoading.set(false);
        this.snackbar.success(
          'Account found! Please set your new password.',
          'Verification Successful',
        );
        this.router.navigate(['/reset-password'], {
          queryParams: { email: user.email, userId: user.id },
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'No account found with this email.');
      },
    });
  }
}
