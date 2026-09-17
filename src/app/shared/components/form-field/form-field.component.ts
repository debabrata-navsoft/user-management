import { Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { EMPTY, switchMap } from 'rxjs';

/**
 * Label + control + validation message, shared by every reactive form.
 *
 * The control itself is projected, so inputs, selects and textareas all work:
 *
 *   <app-form-field label="Email" [control]="form.controls.email" [required]="true">
 *     <input formControlName="email" class="form-control" />
 *   </app-form-field>
 *
 * The `is-invalid` host class styles the projected control from global CSS,
 * which is what lets one component cover controls it does not render itself.
 */
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
  /** Static helper text shown while the field is valid. */
  hint = input<string>('');
  /** Overrides the derived message when a form needs specific wording. */
  errorText = input<string>('');

  /**
   * `touched`, `dirty` and `status` are mutated on the same control instance, so
   * the `control` input signal never changes when they do. Following the
   * control's own event stream is what makes validity genuinely reactive —
   * without it the computed below would cache the initial state forever.
   */
  private controlEvent = toSignal(
    toObservable(this.control).pipe(switchMap((c) => c?.events ?? EMPTY)),
  );

  /** Errors appear once the field is left, or after a submit touches everything. */
  invalid = computed(() => {
    this.controlEvent();
    const c = this.control();
    return !!c && c.invalid && (c.dirty || c.touched);
  });

  message = computed(() => {
    if (!this.invalid()) return '';
    if (this.errorText()) return this.errorText();

    const errors = this.control()?.errors;
    if (!errors) return '';
    const label = this.label() || 'This field';

    if (errors['required']) return `${label} is required.`;
    if (errors['email']) return 'Enter a valid email address.';
    if (errors['minlength']) {
      return `${label} must be at least ${errors['minlength'].requiredLength} characters.`;
    }
    if (errors['maxlength']) {
      return `${label} must be at most ${errors['maxlength'].requiredLength} characters.`;
    }
    if (errors['pattern']) return `${label} is not in the expected format.`;

    // The phone error carries the country and its expected digit count.
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
