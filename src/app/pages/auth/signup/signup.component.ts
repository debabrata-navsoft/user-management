import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AppValidators } from '../../../core/utils/validators';
import { LucideAngularModule } from 'lucide-angular';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UiButtonComponent,
    FormFieldComponent,
    PhoneInputComponent,
    LucideAngularModule,
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);
  private router = inject(Router);

  form: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      department: ['Engineering'],
      phone: ['', [AppValidators.phoneNumber()]],
      password: ['', [Validators.required, AppValidators.passwordStrength()]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [AppValidators.match('password', 'confirmPassword')],
    },
  );

  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
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
      .signUp({
        name: val.name,
        email: val.email,
        password: val.password,
        department: val.department,
        phone: val.phone,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackbar.success(
            'Account successfully created! Please sign in with your credentials.',
            'Registration Complete',
          );
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.message || 'Failed to create account.');
        },
      });
  }
}
