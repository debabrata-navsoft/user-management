import { FormControl } from '@angular/forms';
import { AppValidators, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './validators';

const check = (value: string) => AppValidators.passwordStrength()(new FormControl(value));

/** A valid password of exactly `length` characters. */
const ofLength = (length: number) => 'Ab1' + 'x'.repeat(Math.max(0, length - 3));

describe('AppValidators.passwordStrength', () => {
  it('says nothing about an empty field — that is required()’s job', () => {
    expect(check('')).toBeNull();
  });

  it('accepts a password inside the length bounds', () => {
    expect(check('Abc123')).toBeNull();
    expect(check(ofLength(PASSWORD_MIN_LENGTH))).toBeNull();
    expect(check(ofLength(PASSWORD_MAX_LENGTH))).toBeNull();
  });

  it('rejects one character either side of the bounds', () => {
    expect(check(ofLength(PASSWORD_MIN_LENGTH - 1))?.['passwordStrength']).toMatchObject({
      hasMinLength: false,
      hasMaxLength: true,
    });

    expect(check(ofLength(PASSWORD_MAX_LENGTH + 1))?.['passwordStrength']).toMatchObject({
      hasMinLength: true,
      hasMaxLength: false,
    });
  });

  it('reports which character classes are missing', () => {
    expect(check('abc123')?.['passwordStrength']).toMatchObject({ hasUpper: false });
    expect(check('ABC123')?.['passwordStrength']).toMatchObject({ hasLower: false });
    expect(check('Abcdef')?.['passwordStrength']).toMatchObject({ hasNumber: false });
  });
});
