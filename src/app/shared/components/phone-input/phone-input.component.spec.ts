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

    // The box itself has to lose the letters — a rejected keystroke does not change the
    // bound signal, so nothing would repaint it otherwise.
    expect(numberInput().value).toBe('5354354535');
    expect(component.number()).toBe('5354354535');
    expect(emitted.at(-1)).toBe('+91 5354354535');
  });

  it('drops spaces, punctuation and symbols from a pasted number', () => {
    type('+1 (555) 010-2030');

    expect(numberInput().value).toBe('15550102030');
    expect(component.number()).toBe('15550102030');
  });

  it('emits nothing but the dial code once every character is rejected', () => {
    type('abc');

    expect(numberInput().value).toBe('');
    expect(emitted.at(-1)).toBe('');
  });
});
