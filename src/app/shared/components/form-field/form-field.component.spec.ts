import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { AppValidators } from '../../../core/utils/validators';
import { FormFieldComponent } from './form-field.component';

describe('FormFieldComponent', () => {
  let fixture: ComponentFixture<FormFieldComponent>;
  let component: FormFieldComponent;

  const setup = (control: FormControl, label = 'Email address', required = true) => {
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('label', label);
    fixture.componentRef.setInput('required', required);
    fixture.detectChanges();
  };

  const errorText = (): string =>
    fixture.nativeElement.querySelector('.error-msg')?.textContent.trim() ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormFieldComponent] }).compileComponents();
    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
  });

  it('stays quiet until the field is touched', () => {
    setup(new FormControl('', Validators.required));
    expect(component.invalid()).toBe(false);
    expect(errorText()).toBe('');
  });

  it('shows a required message once the user leaves it empty', () => {
    const control = new FormControl('', Validators.required);
    setup(control);
    control.markAsTouched();
    fixture.detectChanges();

    expect(component.invalid()).toBe(true);
    expect(errorText()).toBe('Email address is required.');
  });

  it('marks the host so the projected control turns red', () => {
    const control = new FormControl('', Validators.required);
    setup(control);
    control.markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.classList.contains('is-invalid')).toBe(true);
  });

  it('reports the specific failure', () => {
    const control = new FormControl('nope', [Validators.required, Validators.email]);
    setup(control);
    control.markAsTouched();
    fixture.detectChanges();
    expect(errorText()).toBe('Please enter a valid email address.');

    const short = new FormControl('a', Validators.minLength(2));
    setup(short, 'Full name');
    short.markAsTouched();
    fixture.detectChanges();
    expect(errorText()).toBe('Full name must be at least 2 characters.');
  });

  it('asks for a password before it complains about the strength of one', () => {
    const control = new FormControl('', [
      AppValidators.required(),
      AppValidators.passwordStrength(),
    ]);
    setup(control, 'Password');
    control.markAsTouched();
    fixture.detectChanges();
    expect(errorText()).toBe('Password is required.');

    // Spaces are not a password. Required has to catch this, or the field looks empty
    // while the strength rule complains about a value the user cannot see.
    control.setValue('   ');
    fixture.detectChanges();
    expect(errorText()).toBe('Password is required.');

    control.setValue('abc');
    fixture.detectChanges();
    expect(errorText()).toBe(
      'Password must be at least 6 characters with uppercase, lowercase, and numbers.',
    );

    control.setValue('Abc123');
    fixture.detectChanges();
    expect(errorText()).toBe('');
  });

  it('clears once the value becomes valid', () => {
    const control = new FormControl('', [Validators.required, Validators.email]);
    setup(control);
    control.markAsTouched();
    fixture.detectChanges();
    expect(errorText()).not.toBe('');

    control.setValue('jane@example.com');
    fixture.detectChanges();
    expect(component.invalid()).toBe(false);
    expect(errorText()).toBe('');
    expect(fixture.nativeElement.classList.contains('is-invalid')).toBe(false);
  });

  it('renders the required marker only when asked', () => {
    setup(new FormControl(''), 'Phone', false);
    expect(fixture.nativeElement.querySelector('.required-mark')).toBeNull();

    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.required-mark')).toBeTruthy();
  });
});
