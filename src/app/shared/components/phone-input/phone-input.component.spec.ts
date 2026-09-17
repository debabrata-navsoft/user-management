import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { COUNTRIES } from '../../../core/utils/countries';
import { PhoneInputComponent } from './phone-input.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, PhoneInputComponent],
  template: `<app-phone-input [formControl]="phone"></app-phone-input>`,
})
class HostComponent {
  phone = new FormControl<string>('');
}

describe('PhoneInputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let phoneInput: PhoneInputComponent;

  const numberInput = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('input[type="tel"]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    phoneInput = fixture.debugElement.children[0].componentInstance;
  });

  it('splits an existing value across the code and number fields', () => {
    host.phone.setValue('+971 50 123 4567');
    fixture.detectChanges();

    expect(phoneInput.dial()).toBe('+971');
    expect(phoneInput.number()).toBe('50 123 4567');
    expect(numberInput().value).toBe('50 123 4567');
  });

  it('writes back in the stored format when the number changes', () => {
    numberInput().value = '98200 10001';
    numberInput().dispatchEvent(new Event('input'));

    expect(host.phone.value).toBe('+91 98200 10001');
  });

  it('writes back when the country changes, keeping the number', () => {
    host.phone.setValue('+91 98200 10001');
    fixture.detectChanges();

    phoneInput.onDialChange('+44');
    expect(host.phone.value).toBe('+44 98200 10001');
  });

  it('stays empty rather than storing a bare dial code', () => {
    numberInput().value = '';
    numberInput().dispatchEvent(new Event('input'));

    expect(host.phone.value).toBe('');
  });

  it('strips characters that are not part of a phone number', () => {
    numberInput().value = '98abc200-10001';
    numberInput().dispatchEvent(new Event('input'));

    expect(host.phone.value).toBe('+91 98200-10001');
  });

  it('offers every country until a search narrows it', () => {
    expect(phoneInput.filteredCountries().length).toBe(COUNTRIES.length);

    phoneInput.search.set('emirates');
    expect(phoneInput.filteredCountries().map((c) => c.code)).toEqual(['AE']);
  });

  it('searches by dial code as well as by name', () => {
    phoneInput.search.set('971');
    expect(phoneInput.filteredCountries().some((c) => c.code === 'AE')).toBe(true);

    phoneInput.search.set('+971');
    expect(phoneInput.filteredCountries().some((c) => c.code === 'AE')).toBe(true);
  });

  it('resets the search when the panel closes', () => {
    phoneInput.search.set('india');
    phoneInput.onPanelClosed();

    expect(phoneInput.search()).toBe('');
    expect(host.phone.touched).toBe(true);
  });

  it('marks the control touched on blur, so validation can show', () => {
    expect(host.phone.touched).toBe(false);
    numberInput().dispatchEvent(new Event('blur'));
    expect(host.phone.touched).toBe(true);
  });

  it('honours a disabled control', () => {
    host.phone.disable();
    fixture.detectChanges();

    expect(phoneInput.disabled()).toBe(true);
    expect(numberInput().disabled).toBe(true);
  });
});
