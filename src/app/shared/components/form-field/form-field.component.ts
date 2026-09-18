import { Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { EMPTY, switchMap } from 'rxjs';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../core/utils/validators';

@Component({
  selector: 'app-form-field',
  standalone: true,
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
  host: { '[class.is-invalid]': 'invalid()' },
})
export class FormFieldComponent {
  label = input<string>('');
  control = input<AbstractControl | null>(null);
  required = input<boolean>(false);
  hint = input<string>('');
  errorText = input<string>('');

  private controlEvent = toSignal(
    toObservable(this.control).pipe(switchMap((c) => c?.events ?? EMPTY)),
  );

  invalid = computed(() => {
    this.controlEvent();
    const c = this.control();
    return !!c && c.invalid && (c.dirty || c.touched);
  });

  message = computed(() => {
    // Track the control's events here too, not just through `invalid()`. Swapping one
    // error for another — `required` for `passwordStrength` as the user starts typing —
    // leaves `invalid()` reading `true` throughout, so without this the memoised message
    // never recomputes and the field keeps showing the error it first failed with.
    this.controlEvent();

    if (!this.invalid()) return '';
    if (this.errorText()) return this.errorText();

    const errors = this.control()?.errors;
    if (!errors) return '';
    const label = this.label() || 'This field';

    if (errors['emailExists']) return 'An account with this email already exists.';
    if (errors['notFound']) return 'No registered account found with this email.';
    if (errors['required']) return `${label} is required.`;
    if (errors['email']) return 'Please enter a valid email address.';
    if (errors['passwordStrength']) {
      return (
        `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters ` +
        'with uppercase, lowercase, and numbers.'
      );
    }
    if (errors['mismatch']) return 'Passwords do not match.';
    if (errors['minlength']) {
      return `${label} must be at least ${errors['minlength'].requiredLength} characters.`;
    }
    if (errors['maxlength']) {
      return `${label} must be at most ${errors['maxlength'].requiredLength} characters.`;
    }
    if (errors['pattern']) return `${label} is not in the expected format.`;

    const phone = errors['phone'];
    if (phone) {
      const where = phone.country ? ` for ${phone.country}` : '';
      if (phone.expected) {
        return `Enter a valid ${phone.expected}-digit number${where}.`;
      }
      return `Enter a valid phone number${where}.`;
    }

    return `${label} is not valid.`;
  });
}
