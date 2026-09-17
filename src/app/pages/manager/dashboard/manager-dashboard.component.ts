import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { DriveService } from '../../../core/services/drive.service';
import { ImageService } from '../../../core/services/image.service';
import { UserService } from '../../../core/services/user.service';
import { formatBytes, getInitials } from '../../../core/utils/formatters';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

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
    SearchInputComponent,
    EmptyStateComponent,
  ],
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.css',
})
export class ManagerDashboardComponent implements OnInit {
  private userService = inject(UserService);
  private imageService = inject(ImageService);
  private driveService = inject(DriveService);

  isLoading = signal<boolean>(true);
  users = signal<User[]>([]);
  searchQuery = signal<string>('');
  totalImages = signal<number>(0);
  totalDriveNodes = signal<number>(0);
  driveSizeBytes = signal<number>(0);

  getInitials = getInitials;

  totalUsers = computed(() => this.users().length);
  activeUsers = computed(() => this.users().filter((u) => u.status === 'active').length);

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q)),
    );
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

  onSearch(query: string): void {
    this.searchQuery.set(query);
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
