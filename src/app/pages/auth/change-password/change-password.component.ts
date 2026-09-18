import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AppValidators, PASSWORD_MAX_LENGTH } from '../../../core/utils/validators';
import { LucideAngularModule } from 'lucide-angular';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormFieldComponent,
    UiButtonComponent,
    LucideAngularModule,
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);

  currentUser = this.authService.currentUser;

  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  /** Caps typing in the password boxes at the same bound the validator enforces. */
  passwordMaxLength = PASSWORD_MAX_LENGTH;

  form: FormGroup = this.fb.group(
    {
      currentPassword: ['', [AppValidators.required()]],
      newPassword: ['', [AppValidators.required(), AppValidators.passwordStrength()]],
      confirmNewPassword: ['', [AppValidators.required()]],
    },
    {
      validators: [AppValidators.match('newPassword', 'confirmNewPassword')],
    },
  );

  onSubmit(): void {
    const user = this.currentUser();
    if (!user) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const val = this.form.value;

    this.authService
      .changePassword(user.id, {
        currentPassword: val.currentPassword,
        newPassword: val.newPassword,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackbar.success('Your password has been changed successfully!', 'Security Updated');
          this.form.reset();
          this.showCurrentPassword.set(false);
          this.showNewPassword.set(false);
          this.showConfirmPassword.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.message || 'Failed to update password.');
        },
      });
  }
}
