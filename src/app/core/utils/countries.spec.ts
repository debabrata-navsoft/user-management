import { COUNTRIES, DEFAULT_DIAL, joinPhone, splitPhone } from './countries';

describe('COUNTRIES', () => {
  it('lists every dialable country, not a hand-picked subset', () => {
    // libphonenumber-js knows ~245 territories; assert the order of magnitude
    // rather than an exact count, which shifts as the dataset is updated.
    expect(COUNTRIES.length).toBeGreaterThan(200);
  });

  it('puts the preferred countries first', () => {
    expect(COUNTRIES.slice(0, 5).map((c) => c.code)).toEqual(['IN', 'AE', 'SA', 'US', 'GB']);
  });

  it('carries a name, flag, flagSvg and well-formed dial code for each', () => {
    expect(COUNTRIES.every((c) => /^\+\d{1,4}$/.test(c.dial))).toBe(true);
    expect(COUNTRIES.every((c) => c.name.length > 0)).toBe(true);
    expect(COUNTRIES.every((c) => c.flag.length > 0)).toBe(true);
    expect(COUNTRIES.every((c) => c.flagSvg.startsWith('https://flagcdn.com/'))).toBe(true);
  });

  it('resolves recognisable names and flags', () => {
    const india = COUNTRIES.find((c) => c.code === 'IN')!;
    expect(india.name).toBe('India');
    expect(india.dial).toBe('+91');
    expect(india.flag).toBe('🇮🇳');
    expect(india.flagSvg).toBe('https://flagcdn.com/in.svg');

    const uae = COUNTRIES.find((c) => c.code === 'AE')!;
    expect(uae.name).toBe('United Arab Emirates');
    expect(uae.dial).toBe('+971');
    expect(uae.flagSvg).toBe('https://flagcdn.com/ae.svg');
  });

  it('lists no country twice', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('splitPhone', () => {
  it('splits a stored number into dial code and rest', () => {
    expect(splitPhone('+91 98200 10001')).toEqual({ dial: '+91', number: '98200 10001' });
    expect(splitPhone('+971 50 123 4567')).toEqual({ dial: '+971', number: '50 123 4567' });
  });

  it('prefers the longest dial code, so +1 never shadows +91', () => {
    expect(splitPhone('+91 9200053828').dial).toBe('+91');
    expect(splitPhone('+1 5550123').dial).toBe('+1');
  });

  it('falls back to the default when there is no dial code', () => {
    expect(splitPhone('9820010001')).toEqual({ dial: DEFAULT_DIAL, number: '9820010001' });
    expect(splitPhone('')).toEqual({ dial: DEFAULT_DIAL, number: '' });
    expect(splitPhone(null)).toEqual({ dial: DEFAULT_DIAL, number: '' });
  });
});

describe('joinPhone', () => {
  it('recombines into the stored format', () => {
    expect(joinPhone('+91', '98200 10001')).toBe('+91 98200 10001');
  });

  it('stays empty without a number, so an optional field is not just "+91"', () => {
    expect(joinPhone('+91', '')).toBe('');
    expect(joinPhone('+91', '   ')).toBe('');
  });

  it('round-trips the formats already stored in db.json', () => {
    for (const value of ['+91 98200 10001', '+1 555-0123', '+971 50 123 4567']) {
      const { dial, number } = splitPhone(value);
      expect(joinPhone(dial, number)).toBe(value);
    }
  });
});
