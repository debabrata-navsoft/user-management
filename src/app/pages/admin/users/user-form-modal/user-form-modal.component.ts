import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { User } from '../../../../core/models/user.model';
import { linkDepartmentToRole } from '../../../../core/utils/departments';
import { AppValidators } from '../../../../core/utils/validators';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input.component';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';

export type UserFormMode = 'add' | 'edit';

const BLANK_USER = {
  id: '',
  name: '',
  email: '',
  role: '',
  department: '',
  phone: '',
  status: 'active',
  password: '',
};

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LucideAngularModule,
    ModalComponent,
    FormFieldComponent,
    PhoneInputComponent,
    UiButtonComponent,
  ],
  templateUrl: './user-form-modal.component.html',
  styleUrl: './user-form-modal.component.css',
})
export class UserFormModalComponent {
  private fb = inject(FormBuilder);

  mode = input<UserFormMode>('add');
  isOpen = input<boolean>(false);
  isSubmitting = input<boolean>(false);
  user = input<User | null>(null);

  save = output<Partial<User>>();
  cancel = output<void>();
  invalid = output<void>();

  isEdit = computed(() => this.mode() === 'edit');
  title = computed(() => (this.isEdit() ? 'Edit User Profile' : 'Create New User'));
  submitLabel = computed(() => (this.isEdit() ? 'Save Changes' : 'Create User'));

  readonly roleOptions = [
    { value: '', label: 'Please Select' },
    { value: 'employee', label: 'Employee' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
  ];

  showPassword = signal<boolean>(false);

  form: FormGroup = this.fb.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['', [Validators.required]],
    department: ['', [Validators.required]],
    phone: ['', [AppValidators.phoneNumber()]],
    status: ['active', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  private department = linkDepartmentToRole(this.form);
  departmentOptions = this.department.options;

  constructor() {
    effect(() => {
      if (!this.isOpen()) return;

      const editing = this.isEdit();
      const u = this.user();
      const record = editing && u ? u : null;

      this.form.reset(
        record
          ? {
              id: record.id,
              name: record.name,
              email: record.email,
              role: record.role,
              department: record.department || '',
              phone: record.phone || '',
              status: record.status,
              password: '',
            }
          : BLANK_USER,
        { emitEvent: false },
      );
      this.department.seed(record?.role ?? '', record?.department ?? '');
      this.showPassword.set(false);
      this.setEnabled('password', !editing);
      this.setEnabled('id', editing);
    });
  }

  private setEnabled(name: string, enabled: boolean): void {
    const control = this.form.controls[name];
    if (enabled) {
      control.enable();
    } else {
      control.disable();
    }
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.invalid.emit();
      return;
    }
    this.save.emit(this.form.value);
  }
}
