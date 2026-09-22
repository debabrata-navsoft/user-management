import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { DriveService } from '../../../core/services/drive.service';
import { ImageService } from '../../../core/services/image.service';
import { UserService } from '../../../core/services/user.service';
import {
  formatBytes,
  formatDate,
  getInitials,
  roleBadgeVariant,
} from '../../../core/utils/formatters';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { UserViewModalComponent } from '../../admin/users/user-view-modal/user-view-modal.component';

export interface DepartmentSummary {
  name: string;
  total: number;
  active: number;
  percentage: number;
}

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    UiButtonComponent,
    BadgeComponent,
    LoaderComponent,
    LucideAngularModule,
    UserViewModalComponent,
  ],
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.css',
})
export class ManagerDashboardComponent implements OnInit {
  private userService = inject(UserService);
  private imageService = inject(ImageService);
  private driveService = inject(DriveService);
  private router = inject(Router);

  isLoading = signal<boolean>(true);
  users = signal<User[]>([]);
  totalImages = signal<number>(0);
  totalDriveNodes = signal<number>(0);
  driveSizeBytes = signal<number>(0);

  selectedDept = signal<string>('All');
  isViewModalOpen = signal<boolean>(false);
  selectedUser = signal<User | null>(null);

  formatDate = formatDate;
  getInitials = getInitials;
  getRoleBadge = roleBadgeVariant;

  totalUsers = computed(() => this.users().length);
  activeUsers = computed(() => this.users().filter((u) => u.status === 'active').length);
  inactiveUsers = computed(() => this.users().filter((u) => u.status === 'inactive').length);
  activePercentage = computed(() => {
    if (this.totalUsers() === 0) return 0;
    return Math.round((this.activeUsers() / this.totalUsers()) * 100);
  });

  departmentsList = computed(() => {
    const set = new Set<string>();
    for (const u of this.users()) {
      set.add(u.department || 'General');
    }
    return ['All', ...Array.from(set)];
  });

  departmentSummaries = computed<DepartmentSummary[]>(() => {
    const total = this.totalUsers() || 1;
    const map = new Map<string, { total: number; active: number }>();

    for (const u of this.users()) {
      const dept = u.department || 'General';
      const curr = map.get(dept) || { total: 0, active: 0 };
      curr.total++;
      if (u.status === 'active') curr.active++;
      map.set(dept, curr);
    }

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      active: data.active,
      percentage: Math.round((data.total / total) * 100),
    }));
  });

  filteredRosterUsers = computed(() => {
    const dept = this.selectedDept();
    let list = this.users();
    if (dept !== 'All') {
      list = list.filter((u) => (u.department || 'General') === dept);
    }
    return list.slice(0, 4);
  });

  formattedDriveSize = computed(() => formatBytes(this.driveSizeBytes()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    forkJoin({
      users: this.userService.getAllUsers(),
      images: this.imageService.getAllImages(),
      driveStats: this.driveService.getAllStats(),
    }).subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.totalImages.set(res.images.length);
        this.totalDriveNodes.set(res.driveStats.totalFolders + res.driveStats.totalFiles);
        this.driveSizeBytes.set(res.driveStats.totalSizeBytes);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  setDepartmentFilter(dept: string): void {
    this.selectedDept.set(dept);
  }

  openUserModal(user: User): void {
    this.selectedUser.set(user);
    this.isViewModalOpen.set(true);
  }

  closeUserModal(): void {
    this.isViewModalOpen.set(false);
    this.selectedUser.set(null);
  }

  onEditUser(user: User): void {
    this.closeUserModal();
    this.router.navigate(['/admin/users']);
  }
}
