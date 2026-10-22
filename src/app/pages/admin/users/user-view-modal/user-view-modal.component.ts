import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
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
    effect((onCleanup) => {
      const owner = this.isOpen() ? this.user() : null;
      this.images.set([]);
      this.files.set([]);
      this.isLoadingUploads.set(!!owner);
      if (!owner) return;

      // Cancelled on cleanup, so a slow response for the previous user can
      // never land in this one's modal.
      const sub = forkJoin({
        images: this.imageService.getImagesFor(owner).pipe(catchError(() => of([]))),
        files: this.driveService.getFilesFor(owner).pipe(catchError(() => of([]))),
      }).subscribe(({ images, files }) => {
        this.images.set(images);
        this.files.set(files);
        this.isLoadingUploads.set(false);
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  openImage(index: number): void {
    this.lightbox.open(
      this.images().map((img) => ({ url: img.url, title: img.name })),
      index,
    );
  }

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
