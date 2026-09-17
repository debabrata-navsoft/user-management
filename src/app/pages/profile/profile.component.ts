import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { formatDate, getInitials } from '../../core/utils/formatters';
import { AppValidators } from '../../core/utils/validators';
import { LucideAngularModule } from 'lucide-angular';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    UiButtonComponent,
    BadgeComponent,
    LucideAngularModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  userInitials = computed(() => getInitials(this.currentUser()?.name || ''));

  formatDate = formatDate;

  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  passwordForm: FormGroup = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, AppValidators.passwordStrength()]],
      confirmNewPassword: ['', [Validators.required]],
    },
    {
      validators: [AppValidators.match('newPassword', 'confirmNewPassword')],
    },
  );

  isFieldInvalid(name: string): boolean {
    const control = this.passwordForm.get(name);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onChangePassword(): void {
    const user = this.currentUser();
    if (!user) return;

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const val = this.passwordForm.value;

    this.authService
      .changePassword(user.id, {
        currentPassword: val.currentPassword,
        newPassword: val.newPassword,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackbar.success('Your password has been changed successfully!', 'Security Updated');
          this.passwordForm.reset();
          // Clearing the fields should clear their revealed state too, so the
          // next entry starts masked.
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
