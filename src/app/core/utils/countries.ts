import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';

export interface Country {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** Includes the leading '+', matching how numbers are stored. */
  dial: string;
  flag: string;
}

/** Shown at the top of the picker, in this order. */
const PREFERRED = ['IN', 'AE', 'SA', 'US', 'GB'];

/** Default when a stored number carries no dial code. */
export const DEFAULT_COUNTRY = 'IN';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** 'IN' -> 🇮🇳, by mapping the letters onto regional indicator symbols. */
function flagOf(code: string): string {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * Every dialable country, derived from libphonenumber-js and Intl rather than a
 * hand-kept list, so codes and names cannot drift out of date.
 */
export const COUNTRIES: Country[] = (() => {
  const all: Country[] = getCountries()
    .map((code) => ({
      code: code as string,
      name: regionNames.of(code) ?? code,
      dial: `+${getCountryCallingCode(code)}`,
      flag: flagOf(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const preferred = PREFERRED.map((code) => all.find((c) => c.code === code)).filter(
    (c): c is Country => c !== undefined,
  );
  const rest = all.filter((c) => !PREFERRED.includes(c.code));
  return [...preferred, ...rest];
})();

export const DEFAULT_DIAL = COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY)?.dial ?? '+91';

/** Longest dial code first, so '+1' never shadows '+91'. */
const DIALS_BY_LENGTH = [...new Set(COUNTRIES.map((c) => c.dial))].sort(
  (a, b) => b.length - a.length,
);

/** Split a stored value such as `+91 98200 10001` into dial code and number. */
export function splitPhone(value: string | null | undefined): { dial: string; number: string } {
  const raw = (value ?? '').trim();
  if (!raw.startsWith('+')) return { dial: DEFAULT_DIAL, number: raw };

  const match = DIALS_BY_LENGTH.find((d) => raw.startsWith(d));
  if (!match) return { dial: DEFAULT_DIAL, number: raw };

  return { dial: match, number: raw.slice(match.length).trim() };
}

/** Recombine into the stored format; empty when there is no number. */
export function joinPhone(dial: string, number: string): string {
  const digits = (number ?? '').trim();
  return digits ? `${dial} ${digits}` : '';
}

/**
 * The country a dial code names, and how many digits its numbers have — 10 for
 * India, 9 for the UAE. The digit count comes from libphonenumber's own example
 * number, so it is never a hand-kept figure. Both are undefined when unknown.
 */
export function phoneRulesForDial(dial: string): { country: string; digits?: number } {
  const country = COUNTRIES.find((c) => c.dial === dial);
  if (!country) return { country: '' };

  try {
    const example = getExampleNumber(country.code as CountryCode, examples);
    return { country: country.name, digits: example?.nationalNumber.length };
  } catch {
    return { country: country.name };
  }
}
