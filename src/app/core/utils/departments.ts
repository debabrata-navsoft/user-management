import { Signal, computed, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Role } from '../models/user.model';

const ADMIN_DEPARTMENTS = ['Administration', 'IT', 'Human Resources', 'Operations'] as const;

const STAFF_DEPARTMENTS = ['Engineering', 'Sales', 'Design', 'Support', 'Finance'] as const;

const BY_ROLE: Record<Role, readonly string[]> = {
  admin: ADMIN_DEPARTMENTS,
  manager: STAFF_DEPARTMENTS,
  employee: STAFF_DEPARTMENTS,
};

export const ALL_DEPARTMENTS: readonly string[] = [...STAFF_DEPARTMENTS, ...ADMIN_DEPARTMENTS];

export function departmentsForRole(role: string | null | undefined): readonly string[] {
  return role === 'admin' || role === 'manager' || role === 'employee' ? BY_ROLE[role] : [];
}

export function linkDepartmentToRole(form: FormGroup): {
  options: Signal<readonly string[]>;
  seed: (role: string, department: string) => void;
} {
  const role = signal<string>('');
  const kept = signal<string>('');
  const department = form.controls['department'];

  const options = computed<readonly string[]>(() => {
    const list = departmentsForRole(role());
    const extra = kept();
    return extra && !list.includes(extra) ? [...list, extra] : list;
  });

  const syncAvailability = (nextRole: string): void => {
    if (nextRole) department.enable({ emitEvent: false });
    else department.disable({ emitEvent: false });
  };

  syncAvailability('');

  form.controls['role'].valueChanges.subscribe((next: string) => {
    role.set(next || '');
    kept.set('');
    if (department.value && !options().includes(department.value)) {
      department.setValue('');
    }
    syncAvailability(next || '');
  });

  return {
    options,
    seed: (nextRole, nextDepartment) => {
      role.set(nextRole);
      kept.set(nextDepartment);
      syncAvailability(nextRole);
    },
  };
}
