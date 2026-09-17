import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidPhoneNumber, validatePhoneNumberLength } from 'libphonenumber-js';
import { phoneRulesForDial, splitPhone } from './countries';

export class AppValidators {
  static phoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? '').trim();
      if (!value) return null;

      const { dial, number } = splitPhone(value);
      if (!number) return null;

      if (!validatePhoneNumberLength(value) && isValidPhoneNumber(value)) return null;

      const rules = phoneRulesForDial(dial);
      return { phone: { country: rules.country, dial, expected: rules.digits } };
    };
  }

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
