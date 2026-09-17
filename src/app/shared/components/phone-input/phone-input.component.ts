import { Component, computed, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { COUNTRIES, DEFAULT_DIAL, joinPhone, splitPhone } from '../../../core/utils/countries';

/**
 * A "Code" dropdown beside a number field, built from Angular Material controls.
 *
 * It is a ControlValueAccessor, so forms keep using `formControlName="phone"`
 * and keep storing the same `+91 98200 10001` string — splitting it into a dial
 * code and a number is presentation only.
 */
@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.css',
})
export class PhoneInputComponent implements ControlValueAccessor {
  /**
   * Registered by hand rather than through NG_VALUE_ACCESSOR: the component
   * needs its own NgControl to know when it is invalid, and providing the
   * accessor token as well would be a circular dependency.
   */
  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  placeholder = input<string>('Mobile Number');
  codeLabel = input<string>('Code');
  inputId = input<string>('');

  dial = signal<string>(DEFAULT_DIAL);
  number = signal<string>('');
  disabled = signal<boolean>(false);
  search = signal<string>('');

  /** Filtered by country name or dial code, so "971" and "emirates" both work. */
  filteredCountries = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(term) || c.dial.includes(term.replace(/^\+/, '')),
    );
  });

  selectedFlag = computed(() => COUNTRIES.find((c) => c.dial === this.dial())?.flag ?? '');

  /**
   * Paint the field red once the value is invalid and the user has engaged.
   *
   * A method, not a computed: `touched` and the error state are mutated on the
   * same control instance, so a computed would cache the initial state.
   */
  showError(): boolean {
    const c = this.ngControl?.control;
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    const { dial, number } = splitPhone(value);
    this.dial.set(dial);
    this.number.set(number);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onDialChange(dial: string): void {
    this.dial.set(dial);
    this.emit();
  }

  onNumberChange(event: Event): void {
    // Keep digits and the separators people actually type.
    const cleaned = (event.target as HTMLInputElement).value.replace(/[^\d\s-]/g, '');
    this.number.set(cleaned);
    this.emit();
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  /** The panel keeps its filter per opening, not across openings. */
  onPanelClosed(): void {
    this.search.set('');
    this.onTouched();
  }

  markTouched(): void {
    this.onTouched();
  }

  private emit(): void {
    this.onChange(joinPhone(this.dial(), this.number()));
  }
}
