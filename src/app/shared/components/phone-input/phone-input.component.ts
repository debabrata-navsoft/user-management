import { Component, computed, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  COUNTRIES,
  DEFAULT_DIAL,
  joinPhone,
  maxMobileDigits,
  splitPhone,
} from '../../../core/utils/countries';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.css',
})
export class PhoneInputComponent implements ControlValueAccessor {
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

  filteredCountries = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(term) || c.dial.includes(term.replace(/^\+/, '')),
    );
  });

  selectedCountry = computed(() => COUNTRIES.find((c) => c.dial === this.dial()));
  selectedFlag = computed(() => this.selectedCountry()?.flag ?? '');
  maxDigits = computed(() => maxMobileDigits(this.dial()));

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
    this.number.set(this.number().slice(0, this.maxDigits()));
    this.emit();
  }

  onNumberChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    const cleaned = el.value.replace(/\D/g, '').slice(0, this.maxDigits());

    if (el.value !== cleaned) {
      const pos = el.selectionStart ?? el.value.length;
      const caret = Math.min(el.value.slice(0, pos).replace(/\D/g, '').length, cleaned.length);
      el.value = cleaned;
      el.setSelectionRange(caret, caret);
    }

    this.number.set(cleaned);
    this.emit();
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

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
