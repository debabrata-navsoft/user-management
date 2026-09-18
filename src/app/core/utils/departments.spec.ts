import { FormControl, FormGroup } from '@angular/forms';
import { departmentsForRole, linkDepartmentToRole } from './departments';

const buildForm = () =>
  new FormGroup({
    role: new FormControl(''),
    department: new FormControl(''),
  });

describe('departmentsForRole', () => {
  it('has no departments to offer without a role', () => {
    expect(departmentsForRole('')).toEqual([]);
    expect(departmentsForRole(null)).toEqual([]);
    expect(departmentsForRole('nonsense')).toEqual([]);
  });

  it('gives admins their own list, and staff a shared one', () => {
    expect(departmentsForRole('admin')).toContain('Administration');
    expect(departmentsForRole('admin')).not.toContain('Engineering');
    expect(departmentsForRole('manager')).toEqual(departmentsForRole('employee'));
  });
});

describe('linkDepartmentToRole', () => {
  it('keeps department unavailable until a role is picked', () => {
    const form = buildForm();
    linkDepartmentToRole(form);

    // Nothing to choose from yet, so the field must not be clickable.
    expect(form.controls.department.disabled).toBe(true);

    form.controls.role.setValue('employee');
    expect(form.controls.department.disabled).toBe(false);

    form.controls.role.setValue('');
    expect(form.controls.department.disabled).toBe(true);
  });

  it('clears a department the newly chosen role cannot have', () => {
    const form = buildForm();
    linkDepartmentToRole(form);

    form.controls.role.setValue('admin');
    form.controls.department.setValue('Administration');

    form.controls.role.setValue('employee');
    expect(form.controls.department.value).toBe('');
    expect(form.controls.department.disabled).toBe(false);
  });

  it('opens the field for a seeded record and keeps its saved department listed', () => {
    const form = buildForm();
    const link = linkDepartmentToRole(form);

    link.seed('admin', 'Legacy Department');

    expect(form.controls.department.disabled).toBe(false);
    expect(link.options()).toContain('Legacy Department');
    expect(link.options()).toContain('Administration');
  });
});
