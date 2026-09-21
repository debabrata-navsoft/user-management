import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PhoneInputComponent } from './phone-input.component';

describe('PhoneInputComponent', () => {
  let fixture: ComponentFixture<PhoneInputComponent>;
  let component: PhoneInputComponent;
  let emitted: string[];

  const numberInput = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('.number-field input');

  const type = (text: string) => {
    const el = numberInput();
    el.value = text;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhoneInputComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhoneInputComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.registerOnChange((value) => emitted.push(value));
    fixture.detectChanges();
  });

  it('keeps only digits, on screen as well as in the form value', () => {
    type('5354354535fgfhgfhfghgfh');
    expect(numberInput().value).toBe('5354354535');
    expect(component.number()).toBe('5354354535');
    expect(emitted.at(-1)).toBe('+91 5354354535');
  });

  it('drops spaces, punctuation and symbols from a pasted number', () => {
    type('+1 (555) 010-2030');

    // 11 digits pasted, but +91 tops out at 10.
    expect(numberInput().value).toBe('1555010203');
    expect(component.number()).toBe('1555010203');
  });

  it('emits nothing but the dial code once every character is rejected', () => {
    type('abc');

    expect(numberInput().value).toBe('');
    expect(emitted.at(-1)).toBe('');
  });

  it('stops at the number of digits the dial code allows', () => {
    type('97456464353543543535345345435');

    expect(numberInput().value).toBe('9745646435');
    expect(component.number()).toBe('9745646435');
    expect(emitted.at(-1)).toBe('+91 9745646435');
  });

  it('caps at the mobile length, not at every length the country dials', () => {
    // India's numbering plan stretches to 13 digits for service numbers; a mobile is 10.
    expect(component.maxDigits()).toBe(10);
    expect(numberInput().getAttribute('maxlength')).toBe('10');
  });

  it('re-caps what is already typed when the country changes', () => {
    type('9745646435');
    component.onDialChange('+971'); // UAE mobiles are 9 digits
    fixture.detectChanges();

    expect(component.maxDigits()).toBe(9);
    expect(component.number()).toBe('974564643');
    expect(numberInput().value).toBe('974564643');
    expect(emitted.at(-1)).toBe('+971 974564643');
  });

  it('allows the longest mobile length of countries that vary', () => {
    component.onDialChange('+49'); // Germany: 10 or 11 digits
    type('49123456789');

    expect(component.number()).toBe('49123456789');
  });
});
