import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DriveNode } from '../../../core/models/drive.model';
import { ImageItem } from '../../../core/models/image.model';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { DriveService } from '../../../core/services/drive.service';
import { ImageModalService } from '../../../core/services/image-modal.service';
import { ImageService } from '../../../core/services/image.service';
import { UserService } from '../../../core/services/user.service';
import { formatBytes, getInitials } from '../../../core/utils/formatters';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, UiButtonComponent, LoaderComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.css',
})
export class UserDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private imageService = inject(ImageService);
  private imageModalService = inject(ImageModalService);
  private driveService = inject(DriveService);

  isLoading = signal<boolean>(true);
  currentUser = this.authService.currentUser;
  userInitials = computed(() => getInitials(this.currentUser()?.name || ''));

  allUsers = signal<User[]>([]);
  images = signal<ImageItem[]>([]);
  allDriveNodes = signal<DriveNode[]>([]);

  myImages = computed(() => this.images().filter((img) => this.isOwnedByUser(img.uploadedBy)));
  myImagesCount = computed(() => this.myImages().length);
  recentImages = computed(() => this.myImages().slice(0, 4));

  myDriveNodes = computed(() =>
    this.allDriveNodes().filter((node) => this.isOwnedByUser(node.uploadedBy)),
  );
  myDriveNodesCount = computed(() => this.myDriveNodes().length);
  myDriveSizeBytes = computed(() =>
    this.myDriveNodes().reduce((acc, node) => acc + (node.size || 0), 0),
  );
  formattedMyDriveSize = computed(() => formatBytes(this.myDriveSizeBytes()));

  departmentPeers = computed(() => {
    const myDept = this.currentUser()?.department || 'General';
    return this.allUsers().filter((u) => (u.department || 'General') === myDept);
  });

  private isOwnedByUser(uploaderRaw?: string): boolean {
    const current = this.currentUser();
    if (!current || !uploaderRaw) return false;
    const uploader = uploaderRaw.trim().toLowerCase();
    const email = (current.email || '').trim().toLowerCase();

    if (uploader.includes('@')) {
      return email !== '' && uploader === email;
    }

    const name = (current.name || '').trim().toLowerCase();
    const username = (current.username || '').trim().toLowerCase();
    const id = String(current.id ?? '')
      .trim()
      .toLowerCase();

    return (
      (name !== '' && uploader === name) ||
      (username !== '' && uploader === username) ||
      (id !== '' && uploader === id)
    );
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    forkJoin({
      users: this.userService.getAllUsers(),
      images: this.imageService.getImages(),
      driveNodes: this.driveService.getVisibleNodes(),
    }).subscribe({
      next: (res) => {
        this.allUsers.set(res.users);
        this.images.set(res.images);
        this.allDriveNodes.set(res.driveNodes);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  openImagePreview(image: ImageItem): void {
    this.imageModalService.openSingle(image.url, image.name);
  }
}
