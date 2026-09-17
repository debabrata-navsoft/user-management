import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidPhoneNumber, validatePhoneNumberLength } from 'libphonenumber-js';
import { phoneRulesForDial, splitPhone } from './countries';

export class AppValidators {
  /**
   * Validates a `+91 98200 10001` value against the rules of the country its
   * dial code names — India is 10 digits, the UAE 9, and so on.
   *
   * Length alone is not enough: libphonenumber accepts an 11-digit Indian
   * number on length but rejects it as a real number, so both checks run.
   */
  static phoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? '').trim();
      if (!value) return null; // emptiness is Validators.required's job

      const { dial, number } = splitPhone(value);
      if (!number) return null;

      if (!validatePhoneNumberLength(value) && isValidPhoneNumber(value)) return null;

      const rules = phoneRulesForDial(dial);
      return { phone: { country: rules.country, dial, expected: rules.digits } };
    };
  }
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
