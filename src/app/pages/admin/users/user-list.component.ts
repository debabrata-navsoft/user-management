import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ActiveFilterState, FilterGroup } from '../../../core/models/filter.model';
import { TableColumn } from '../../../core/models/table.model';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { UserService } from '../../../core/services/user.service';
import { ALL_DEPARTMENTS } from '../../../core/utils/departments';
import { formatDate, getInitials, roleBadgeVariant } from '../../../core/utils/formatters';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UserFormMode, UserFormModalComponent } from './user-form-modal/user-form-modal.component';
import { UserViewModalComponent } from './user-view-modal/user-view-modal.component';

interface FilterDef {
  id: 'role' | 'department' | 'status';
  title: string;
  searchable: boolean;
  singleSelect?: boolean;
  values: string[];
}

const FILTER_DEFS: FilterDef[] = [
  { id: 'role', title: 'Role', searchable: true, values: ['admin', 'manager', 'employee'] },
  {
    id: 'department',
    title: 'Department',
    searchable: true,
    values: [...ALL_DEPARTMENTS],
  },
  {
    id: 'status',
    title: 'Status',
    searchable: false,
    singleSelect: true,
    values: ['active', 'inactive'],
  },
];

const fieldValue = (user: User, id: FilterDef['id']): string => (user[id] || '').toLowerCase();

const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    PageHeaderComponent,
    UiButtonComponent,
    DataTableComponent,
    BadgeComponent,
    ConfirmDialogComponent,
    LucideAngularModule,
    UserFormModalComponent,
    UserViewModalComponent,
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private snackbar = inject(SnackbarService);
  private auth = inject(AuthService);

  isSelf = (user: User): boolean => this.auth.isCurrentUser(user.id);

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
  sort = signal<string>('id');
  order = signal<'asc' | 'desc'>('desc');

  columns: TableColumn[] = [
    { key: 'id', header: 'ID', width: '80px', align: 'center', sortable: true },
    { key: 'name', header: 'User', width: '24%', sortable: true },
    { key: 'role', header: 'Role', width: '130px', align: 'center', sortable: true },
    { key: 'department', header: 'Department', width: '14%', sortable: true },
    { key: 'phone', header: 'Phone', width: '16%' },
    { key: 'status', header: 'Status', width: '130px', align: 'center', sortable: true },
    { key: 'createdAt', header: 'Joined Date', width: '130px', sortable: true },
    { key: 'actions', header: 'Actions', width: '130px', align: 'center' },
  ];

  // Create and edit share one dialog, so one open flag plus a mode drives both.
  isFormModalOpen = signal<boolean>(false);
  formMode = signal<UserFormMode>('add');
  isViewModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);

  selectedUser = signal<User | null>(null);
  userToDelete = signal<User | null>(null);

  formatDate = formatDate;
  getInitials = getInitials;
  getRoleBadge = roleBadgeVariant;

  /** Option counts tallied in one pass over every user. */
  filterGroups = computed<FilterGroup[]>(() => {
    const counts = new Map<string, number>();
    for (const user of this.allUsers()) {
      for (const def of FILTER_DEFS) {
        const key = `${def.id}:${fieldValue(user, def.id)}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const groups: FilterGroup[] = FILTER_DEFS.map(
      ({ id, title, searchable, singleSelect, values }) => ({
        id,
        title,
        type: 'checkbox' as const,
        searchable,
        singleSelect,
        options: values.map((value) => ({
          label: titleCase(value),
          value,
          count: counts.get(`${id}:${value.toLowerCase()}`) ?? 0,
        })),
      }),
    );

    // Append Created Date filter group
    groups.push({
      id: 'createdAt',
      title: 'Created Date',
      type: 'date',
      options: [],
    });

    return groups;
  });

  private isDateInRange(dateStr: string | undefined, filterVal: string): boolean {
    if (!dateStr || !filterVal) return true;
    const itemDate = new Date(dateStr).getTime();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (filterVal === 'today') {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      return itemDate >= todayStart;
    }
    if (filterVal === '7days') {
      return itemDate >= now - 7 * oneDay;
    }
    if (filterVal === '30days') {
      return itemDate >= now - 30 * oneDay;
    }
    if (filterVal.startsWith('custom:')) {
      const parts = filterVal.replace('custom:', '').split('_to_');
      const from = parts[0] ? new Date(parts[0]).setHours(0, 0, 0, 0) : null;
      const to = parts[1] ? new Date(parts[1]).setHours(23, 59, 59, 999) : null;

      if (from && itemDate < from) return false;
      if (to && itemDate > to) return false;
      return true;
    }
    return true;
  }

  calculateMatchingCount = (filters: ActiveFilterState): number =>
    this.allUsers().filter((user) => {
      const matchesStandard = FILTER_DEFS.every(({ id }) => {
        const selected = filters[id] ?? [];
        return (
          selected.length === 0 || selected.some((v) => v.toLowerCase() === fieldValue(user, id))
        );
      });
      if (!matchesStandard) return false;

      const dateFilter = filters['createdAt']?.[0];
      if (dateFilter && dateFilter !== 'all') {
        return this.isDateInRange(user.createdAt, dateFilter);
      }
      return true;
    }).length;

  ngOnInit(): void {
    this.refresh();
  }

  /** Reload the page of rows and the unpaged set the drawer counts against. */
  refresh(): void {
    this.fetchUsers();
    this.userService.getAllUsers().subscribe({ next: (data) => this.allUsers.set(data) });
  }

  fetchUsers(): void {
    this.isLoading.set(true);
    const filters = this.activeFilters();
    let startDate: string | undefined;
    let endDate: string | undefined;

    const dateFilter = filters['createdAt']?.[0];
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'today') {
        startDate = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      } else if (dateFilter === '7days') {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateFilter === '30days') {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateFilter.startsWith('custom:')) {
        const parts = dateFilter.replace('custom:', '').split('_to_');
        if (parts[0]) startDate = new Date(parts[0]).toISOString();
        if (parts[1])
          endDate = new Date(new Date(parts[1]).setHours(23, 59, 59, 999)).toISOString();
      }
    }

    this.userService
      .getUsers({
        page: this.page(),
        limit: this.limit(),
        search: this.search(),
        sort: this.sort(),
        order: this.order(),
        role: filters['role'],
        status: filters['status'],
        department: filters['department'],
        startDate,
        endDate,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.totalUsers.set(res.total);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  /** Anything that changes the result set invalidates the current page. */
  private reload(resetPage = true): void {
    if (resetPage) this.page.set(1);
    this.fetchUsers();
  }

  onSortChange({ sort, order }: { sort: string; order: 'asc' | 'desc' }): void {
    this.sort.set(sort);
    this.order.set(order);
    this.reload();
  }

  onSearchChange(query: string): void {
    this.search.set(query);
    this.reload();
  }

  onFilterChange(filters: ActiveFilterState): void {
    this.activeFilters.set(filters);
    this.reload();
  }

  onLimitChange(limit: number): void {
    this.limit.set(limit);
    this.reload();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.reload(false);
  }

  openAddModal(): void {
    this.selectedUser.set(null);
    this.formMode.set('add');
    this.isFormModalOpen.set(true);
  }

  openEditModal(user: User): void {
    this.closeViewModal();
    this.selectedUser.set(user);
    this.formMode.set('edit');
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
  }

  onFormInvalid(): void {
    this.snackbar.warning('Please check the highlighted fields.');
  }

  /** The dialog emits only once its form is valid, so this just persists. */
  submitUserForm(value: Partial<User>): void {
    const id = this.formMode() === 'edit' ? value.id : undefined;
    const verb = id === undefined ? 'create' : 'update';

    this.isSubmitting.set(true);
    const request =
      id === undefined
        ? this.userService.createUser(value)
        : this.userService.updateUser(id, value);

    request.subscribe({
      next: (saved) => {
        this.isSubmitting.set(false);
        this.closeFormModal();
        this.snackbar.success(`User "${saved.name}" ${verb}d successfully!`);
        this.refresh();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.snackbar.error(`Failed to ${verb} user. Please try again.`);
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
        this.refresh();
      },
      error: () => {
        this.isDeleting.set(false);
        this.snackbar.error('Failed to delete user.');
      },
    });
  }
}
