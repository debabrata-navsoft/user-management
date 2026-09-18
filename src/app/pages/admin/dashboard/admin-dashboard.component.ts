import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { DriveService } from '../../../core/services/drive.service';
import { ImageService } from '../../../core/services/image.service';
import { UserService } from '../../../core/services/user.service';
import { formatBytes, formatDate, getInitials } from '../../../core/utils/formatters';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    UiButtonComponent,
    BadgeComponent,
    LoaderComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private userService = inject(UserService);
  private imageService = inject(ImageService);
  private driveService = inject(DriveService);

  isLoading = signal<boolean>(true);
  users = signal<User[]>([]);
  totalImages = signal<number>(0);
  totalDriveNodes = signal<number>(0);
  driveSizeBytes = signal<number>(0);

  formatDate = formatDate;
  getInitials = getInitials;

  totalUsers = computed(() => this.users().length);
  activeUsers = computed(() => this.users().filter((u) => u.status === 'active').length);
  inactiveUsers = computed(() => this.users().filter((u) => u.status === 'inactive').length);
  activePercentage = computed(() => {
    if (this.totalUsers() === 0) return 0;
    return Math.round((this.activeUsers() / this.totalUsers()) * 100);
  });

  adminCount = computed(() => this.users().filter((u) => u.role === 'admin').length);
  managerCount = computed(() => this.users().filter((u) => u.role === 'manager').length);
  employeeCount = computed(() => this.users().filter((u) => u.role === 'employee').length);

  recentUsers = computed(() => this.users().slice(0, 4));

  departmentStats = computed(() => {
    const counts: Record<string, number> = {};
    for (const u of this.users()) {
      const dept = u.department || 'General';
      counts[dept] = (counts[dept] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  });

  formattedDriveSize = computed(() => formatBytes(this.driveSizeBytes()));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    forkJoin({
      users: this.userService.getAllUsers(),
      images: this.imageService.getImages(),
      driveStats: this.driveService.getStats(),
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

  getRoleBadge(role: string): 'primary' | 'purple' | 'indigo' | 'neutral' {
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
