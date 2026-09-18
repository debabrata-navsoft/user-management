import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UiButtonComponent,
    FormFieldComponent,
    LucideAngularModule,
  ],
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

  constructor() {
    this.form.get('email')?.valueChanges.subscribe(() => {
      const emailControl = this.form.get('email');
      if (emailControl?.hasError('notFound')) {
        const errors = { ...emailControl.errors };
        delete errors['notFound'];
        emailControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    });
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
        const msg = err.message || 'No account found with this email.';
        if (msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('email')) {
          const emailControl = this.form.get('email');
          emailControl?.setErrors({ ...(emailControl.errors || {}), notFound: true });
          emailControl?.markAsTouched();
          emailControl?.markAsDirty();
          this.errorMessage.set('');
        } else {
          this.errorMessage.set(msg);
        }
      },
    });
  }
}
