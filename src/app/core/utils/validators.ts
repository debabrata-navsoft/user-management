import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class AppValidators {
  /**
   * Password strength validator: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
   */
  static passwordStrength(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;

      const hasMinLength = val.length >= 6;
      const hasUpper = /[A-Z]/.test(val);
      const hasLower = /[a-z]/.test(val);
      const hasNumber = /[0-9]/.test(val);

      const isValid = hasMinLength && hasUpper && hasLower && hasNumber;
      return isValid
        ? null
        : {
            passwordStrength: {
              hasMinLength,
              hasUpper,
              hasLower,
              hasNumber,
            },
          };
    };
  }

  /**
   * Password match validator to be applied on a FormGroup
   */
  static match(controlName: string, matchingControlName: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const control = group.get(controlName);
      const matchingControl = group.get(matchingControlName);

      if (!control || !matchingControl) return null;

      if (matchingControl.errors && !matchingControl.errors['mismatch']) {
        return null;
      }

      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mismatch: true });
        return { mismatch: true };
      } else {
        matchingControl.setErrors(null);
        return null;
      }
    };
  }
}
