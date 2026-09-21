import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DriveNode } from '../../../../core/models/drive.model';
import { ImageItem } from '../../../../core/models/image.model';
import { User } from '../../../../core/models/user.model';
import { DriveService } from '../../../../core/services/drive.service';
import { ImageModalService } from '../../../../core/services/image-modal.service';
import { ImageService } from '../../../../core/services/image.service';
import { openDataUrlInNewTab } from '../../../../core/utils/data-url';
import { isImageType, isVideoType } from '../../../../core/utils/file-types';
import {
  formatBytes,
  formatDate,
  getInitials,
  roleBadgeVariant,
} from '../../../../core/utils/formatters';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { FileTypeIconComponent } from '../../../../shared/components/file-type-icon/file-type-icon.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-user-view-modal',
  standalone: true,
  imports: [ModalComponent, BadgeComponent, UiButtonComponent, FileTypeIconComponent],
  templateUrl: './user-view-modal.component.html',
  styleUrl: './user-view-modal.component.css',
})
export class UserViewModalComponent {
  private imageService = inject(ImageService);
  private driveService = inject(DriveService);
  private lightbox = inject(ImageModalService);

  isOpen = input<boolean>(false);
  user = input<User | null>(null);

  close = output<void>();
  edit = output<User>();

  images = signal<ImageItem[]>([]);
  files = signal<DriveNode[]>([]);
  isLoadingUploads = signal<boolean>(false);

  hasUploads = computed(() => this.images().length > 0 || this.files().length > 0);

  formatBytes = formatBytes;
  formatDate = formatDate;
  getInitials = getInitials;
  roleBadgeVariant = roleBadgeVariant;

  constructor() {
    // The gallery and the drive are scoped to whoever is signed in, so this is the one
    // place another user's uploads can be seen — fetched only while the dialog is open.
    effect(() => {
      const owner = this.isOpen() ? this.user() : null;
      this.images.set([]);
      this.files.set([]);
      if (!owner) return;

      this.isLoadingUploads.set(true);
      this.imageService.getImagesFor(owner).subscribe({
        next: (images) => this.images.set(images),
        error: () => undefined,
      });
      this.driveService.getFilesFor(owner).subscribe({
        next: (files) => this.files.set(files),
        complete: () => this.isLoadingUploads.set(false),
        error: () => this.isLoadingUploads.set(false),
      });
    });
  }

  openImage(index: number): void {
    this.lightbox.open(
      this.images().map((img) => ({ url: img.url, title: img.name })),
      index,
    );
  }

  /** Media opens in the lightbox, anything else in a browser tab — as the Drive page does. */
  openFile(file: DriveNode): void {
    if (!file.dataUrl) return;

    if (isImageType(file.name, file.mimeType) || isVideoType(file.name, file.mimeType)) {
      this.lightbox.open([{ url: file.dataUrl, title: file.name, mimeType: file.mimeType }], 0);
      return;
    }
    openDataUrlInNewTab(file.dataUrl);
  }

  requestEdit(): void {
    const u = this.user();
    if (u) {
      this.edit.emit(u);
    }
  }
}
