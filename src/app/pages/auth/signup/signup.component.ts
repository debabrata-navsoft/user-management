import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { linkDepartmentToRole } from '../../../core/utils/departments';
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
      email: ['', [
                    Validators.required, 
                    Validators.email, 
                    // Validators.pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/),
                  ]],
      role: ['', [Validators.required]],
      department: ['', [Validators.required]],
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

  departmentOptions = linkDepartmentToRole(this.form).options;

  constructor() {
    this.form
      .get('email')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((val: string) => {
          const email = (val || '').trim().toLowerCase();
          const ctrl = this.form.get('email');
          if (!email || ctrl?.hasError('required') || ctrl?.hasError('email')) {
            this.setEmailExists(false);
            return of(false);
          }
          return this.authService.checkEmailExists(email);
        }),
      )
      .subscribe((exists) => this.setEmailExists(exists));
  }

  private setEmailExists(exists: boolean): void {
    const ctrl = this.form.get('email');
    if (!ctrl) return;
    if (exists) {
      ctrl.setErrors({ ...(ctrl.errors || {}), emailExists: true });
      ctrl.markAsTouched();
      ctrl.markAsDirty();
    } else if (ctrl.hasError('emailExists')) {
      const { emailExists, ...rest } = ctrl.errors || {};
      ctrl.setErrors(Object.keys(rest).length ? rest : null);
    }
  }

  onEmailBlur(): void {
    const ctrl = this.form.get('email');
    const val = (ctrl?.value || '').trim().toLowerCase();
    if (val && !ctrl?.hasError('required') && !ctrl?.hasError('email')) {
      this.authService.checkEmailExists(val).subscribe((exists) => this.setEmailExists(exists));
    }
  }

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

    const { name, email, role, password, department, phone } = this.form.value;

    this.authService.signUp({ name, email, role, password, department, phone }).subscribe({
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
        const msg = err.message || 'Failed to create account.';
        if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('email')) {
          this.setEmailExists(true);
          this.errorMessage.set('');
        } else {
          this.errorMessage.set(msg);
        }
      },
    });
  }
}
