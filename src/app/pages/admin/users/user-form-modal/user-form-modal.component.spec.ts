import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  LucideAngularModule,
  TriangleAlert,
  X,
} from 'lucide-angular';
import { UserFormModalComponent } from './user-form-modal.component';

describe('UserFormModalComponent', () => {
  let fixture: ComponentFixture<UserFormModalComponent>;
  let component: UserFormModalComponent;

  const selectEl = (id: string): HTMLSelectElement => fixture.nativeElement.querySelector(`#${id}`);

  const choose = (id: string, value: string) => {
    const el = selectEl(id);
    el.value = value;
    el.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFormModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        importProvidersFrom(
          LucideAngularModule.pick({
            AlertCircle,
            CheckCircle2,
            Eye,
            EyeOff,
            Info,
            TriangleAlert,
            X,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('records the role the user picks', () => {
    choose('userRole', 'admin');

    expect(component.form.controls['role'].value).toBe('admin');
  });

  it('opens the department list once a role is chosen', () => {
    expect(component.form.controls['department'].disabled).toBe(true);

    choose('userRole', 'manager');

    expect(component.form.controls['department'].disabled).toBe(false);
    expect(component.departmentOptions()).toContain('Engineering');
  });
});
