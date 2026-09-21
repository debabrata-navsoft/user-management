import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidPhoneNumber, validatePhoneNumberLength } from 'libphonenumber-js/mobile';
import { phoneRulesForDial, splitPhone } from './countries';

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 15;

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

  static required(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      const blank = value === null || value === undefined || String(value).trim() === '';
      return blank ? { required: true } : null;
    };
  }

  static passwordStrength(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;

      const hasMinLength = val.length >= PASSWORD_MIN_LENGTH;
      const hasMaxLength = val.length <= PASSWORD_MAX_LENGTH;
      const hasUpper = /[A-Z]/.test(val);
      const hasLower = /[a-z]/.test(val);
      const hasNumber = /[0-9]/.test(val);

      const isValid = hasMinLength && hasMaxLength && hasUpper && hasLower && hasNumber;
      return isValid
        ? null
        : {
            passwordStrength: {
              hasMinLength,
              hasMaxLength,
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
