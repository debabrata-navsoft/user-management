import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActiveFilterState, FilterGroup } from '../../../core/models/filter.model';
import { TableColumn } from '../../../core/models/table.model';
import { Role, User, UserStatus } from '../../../core/models/user.model';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { UserService } from '../../../core/services/user.service';
import { formatDate, getInitials } from '../../../core/utils/formatters';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    UiButtonComponent,
    DataTableComponent,
    BadgeComponent,
    ModalComponent,
    ConfirmDialogComponent,
    LucideAngularModule,
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private snackbar = inject(SnackbarService);
  private fb = inject(FormBuilder);

  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  isDeleting = signal<boolean>(false);

  users = signal<User[]>([]);
  allUsers = signal<User[]>([]);
  totalUsers = signal<number>(0);
  page = signal<number>(1);
  limit = signal<number>(10);
  search = signal<string>('');
  activeFilters = signal<ActiveFilterState>({});

  columns: TableColumn[] = [
    { key: 'user', header: 'User' },
    { key: 'role', header: 'Role' },
    { key: 'department', header: 'Department' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
    { key: 'createdAt', header: 'Joined Date' },
    { key: 'actions', header: 'Actions', align: 'right', width: '130px' },
  ];

  // Dynamic filter groups computed with live counts from all users
  filterGroups = computed<FilterGroup[]>(() => {
    const all = this.allUsers();

    // Counts
    const roleCounts: Record<string, number> = { admin: 0, manager: 0, employee: 0 };
    const statusCounts: Record<string, number> = { active: 0, inactive: 0 };
    const deptCounts: Record<string, number> = {
      Engineering: 0,
      Sales: 0,
      Design: 0,
      Support: 0,
      Finance: 0,
    };

    for (const u of all) {
      const role = (u.role || '').toLowerCase();
      if (roleCounts[role] !== undefined) {
        roleCounts[role]++;
      }

      const status = (u.status || '').toLowerCase();
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }

      if (u.department && deptCounts[u.department] !== undefined) {
        deptCounts[u.department]++;
      }
    }

    const defaultDepts = ['Engineering', 'Sales', 'Design', 'Support', 'Finance'];
    const deptOptions = defaultDepts.map((dept) => ({
      label: dept,
      value: dept,
      count: deptCounts[dept] ?? 0,
    }));

    return [
      {
        id: 'role',
        title: 'Role',
        searchable: true,
        options: [
          { label: 'Admin', value: 'admin', count: roleCounts['admin'] ?? 0 },
          { label: 'Manager', value: 'manager', count: roleCounts['manager'] ?? 0 },
          { label: 'Employee', value: 'employee', count: roleCounts['employee'] ?? 0 },
        ],
      },
      {
        id: 'department',
        title: 'Department',
        searchable: true,
        options: deptOptions,
      },
      {
        id: 'status',
        title: 'Status',
        searchable: false,
        options: [
          { label: 'Active', value: 'active', count: statusCounts['active'] ?? 0 },
          { label: 'Inactive', value: 'inactive', count: statusCounts['inactive'] ?? 0 },
        ],
      },
    ];
  });

  // Calculate live matching users based on currently selected drawer filters
  calculateMatchingCount = (filters: ActiveFilterState): number => {
    const all = this.allUsers();
    const roles = (filters['role'] || []).map((r) => r.toLowerCase());
    const depts = filters['department'] || [];
    const statuses = (filters['status'] || []).map((s) => s.toLowerCase());

    if (roles.length === 0 && depts.length === 0 && statuses.length === 0) {
      return all.length;
    }

    return all.filter((u) => {
      const uRole = (u.role || '').toLowerCase();
      if (roles.length > 0 && !roles.includes(uRole)) return false;
      if (depts.length > 0 && (!u.department || !depts.includes(u.department))) return false;
      if (statuses.length > 0 && !statuses.includes((u.status || '').toLowerCase())) return false;
      return true;
    }).length;
  };

  // Modals state
  isAddModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  isViewModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);

  selectedUser = signal<User | null>(null);
  userToDelete = signal<User | null>(null);

  formatDate = formatDate;
  getInitials = getInitials;

  addForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['user', [Validators.required]],
    department: ['Engineering'],
    phone: [''],
    status: ['active', [Validators.required]],
    password: ['Demo@123', [Validators.required, Validators.minLength(6)]],
  });

  editForm: FormGroup = this.fb.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['user', [Validators.required]],
    department: ['Engineering'],
    phone: [''],
    status: ['active', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadAllUsersForCounts();
    this.fetchUsers();
  }

  loadAllUsersForCounts(): void {
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.allUsers.set(data);
      },
    });
  }

  fetchUsers(): void {
    this.isLoading.set(true);
    const filters = this.activeFilters();

    this.userService
      .getUsers({
        page: this.page(),
        limit: this.limit(),
        search: this.search(),
        role: filters['role'],
        status: filters['status'],
        department: filters['department'],
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.totalUsers.set(res.total);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  onSearchChange(query: string): void {
    this.search.set(query);
    this.page.set(1);
    this.fetchUsers();
  }

  onFilterChange(filters: ActiveFilterState): void {
    this.activeFilters.set(filters);
    this.page.set(1);
    this.fetchUsers();
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.fetchUsers();
  }

  onLimitChange(l: number): void {
    this.limit.set(l);
    this.page.set(1);
    this.fetchUsers();
  }

  openAddModal(): void {
    this.addForm.reset({
      name: '',
      email: '',
      role: 'user',
      department: 'Engineering',
      phone: '',
      status: 'active',
      password: 'Demo@123',
    });
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  submitAddUser(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      this.snackbar.warning('Please fill in all required fields properly.');
      return;
    }

    this.isSubmitting.set(true);
    const val = this.addForm.value;

    this.userService.createUser(val).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.snackbar.success(`User "${created.name}" created successfully!`);
        this.fetchUsers();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.snackbar.error('Failed to create user. Please try again.');
      },
    });
  }

  openEditModal(user: User): void {
    this.selectedUser.set(user);
    this.editForm.patchValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || 'Engineering',
      phone: user.phone || '',
      status: user.status,
    });
    this.isEditModalOpen.set(true);
  }

  openEditModalFromView(): void {
    const u = this.selectedUser();
    this.closeViewModal();
    if (u) {
      this.openEditModal(u);
    }
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  submitEditUser(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.snackbar.warning('Please fill in all required fields properly.');
      return;
    }

    this.isSubmitting.set(true);
    const val = this.editForm.value;

    this.userService.updateUser(val.id, val).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.closeEditModal();
        this.snackbar.success(`User "${updated.name}" updated successfully!`);
        this.fetchUsers();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.snackbar.error('Failed to update user.');
      },
    });
  }

  openViewModal(user: User): void {
    this.selectedUser.set(user);
    this.isViewModalOpen.set(true);
  }

  closeViewModal(): void {
    this.isViewModalOpen.set(false);
  }

  confirmDeleteUser(user: User): void {
    this.userToDelete.set(user);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.userToDelete.set(null);
  }

  submitDeleteUser(): void {
    const user = this.userToDelete();
    if (!user) return;

    this.isDeleting.set(true);
    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.snackbar.success(`User "${user.name}" deleted.`);
        this.fetchUsers();
      },
      error: () => {
        this.isDeleting.set(false);
        this.snackbar.error('Failed to delete user.');
      },
    });
  }

  getRoleBadge(role: Role): 'primary' | 'purple' | 'indigo' | 'neutral' {
    switch (role) {
      case 'admin':
        return 'primary';
      case 'manager':
        return 'purple';
      default:
        return 'indigo';
    }
  }
}
