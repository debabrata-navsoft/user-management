import { FormControl } from '@angular/forms';
import { phoneRulesForDial } from './countries';
import { AppValidators } from './validators';

const validate = (value: string) => AppValidators.phoneNumber()(new FormControl(value));

describe('AppValidators.phoneNumber', () => {
  it('accepts a correct number for its country', () => {
    expect(validate('+91 9820010001')).toBeNull(); // India, 10 digits
    expect(validate('+971 501234567')).toBeNull(); // UAE, 9 digits
    expect(validate('+44 7400123456')).toBeNull(); // UK
  });

  it('rejects an Indian number with 11 digits, naming the expected length', () => {
    const result = validate('+91 98200100011');
    expect(result).not.toBeNull();
    expect(result!['phone'].country).toBe('India');
    expect(result!['phone'].expected).toBe(10);
  });

  it('rejects an Indian number with 9 digits', () => {
    expect(validate('+91 982001000')).not.toBeNull();
  });

  it('applies each country its own length', () => {
    // 10 digits is right for India but too many for the UAE.
    expect(validate('+91 9820010001')).toBeNull();
    expect(validate('+971 9820010001')).not.toBeNull();
  });

  it('leaves an empty value to Validators.required', () => {
    expect(validate('')).toBeNull();
    expect(validate('   ')).toBeNull();
    expect(AppValidators.phoneNumber()(new FormControl(null))).toBeNull();
  });

  it('reports each country its own expected digit count', () => {
    expect(phoneRulesForDial('+91')).toEqual({ country: 'India', digits: 10 });
    expect(phoneRulesForDial('+971')).toEqual({ country: 'United Arab Emirates', digits: 9 });
    expect(phoneRulesForDial('+9999')).toEqual({ country: '' });
  });

  it('does not throw on an unknown dial code', () => {
    expect(() => validate('+999 12345')).not.toThrow();
  });
});
