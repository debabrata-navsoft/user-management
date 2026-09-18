import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { DRIVE_ROOT } from '../../../core/services/drive.service';
import {
  MediaUploadOutcome,
  MediaUploadService,
} from '../../../core/services/media-upload.service';
import { isImageType, isVideoType } from '../../../core/utils/file-types';
import { formatBytes } from '../../../core/utils/formatters';
import { FileDropZoneComponent } from '../file-drop-zone/file-drop-zone.component';
import { FileTypeIconComponent } from '../file-type-icon/file-type-icon.component';
import { ModalComponent } from '../modal/modal.component';
import { UiButtonComponent } from '../ui-button/ui-button.component';

export interface FileUploadPreviewItem {
  file: File;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  dimensions?: { width: number; height: number };
  error?: string;
}

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ModalComponent,
    FileDropZoneComponent,
    FileTypeIconComponent,
    UiButtonComponent,
  ],
  templateUrl: './upload-modal.component.html',
  styleUrl: './upload-modal.component.css',
})
export class UploadModalComponent {
  private mediaUpload = inject(MediaUploadService);
  private authService = inject(AuthService);

  isOpen = input<boolean>(false);
  title = input<string>('Upload Files');
  accept = input<string>('*/*');
  maxSizeMb = input<number>(50);
  hint = input<string>('');
  existingNames = input<string[]>([]);
  target = input<'gallery' | 'drive'>('drive');
  driveParentId = input<string>(DRIVE_ROOT);

  close = output<void>();
  uploaded = output<MediaUploadOutcome>();

  isUploading = signal<boolean>(false);
  selectedPreviews = signal<FileUploadPreviewItem[]>([]);

  formatBytes = formatBytes;

  validPreviewsCount = computed(() => {
    return this.selectedPreviews().filter((p) => !p.error && (p.dataUrl || p.file)).length;
  });

  computedHint = computed(() => {
    if (this.hint()) return this.hint();
    if (this.target() === 'gallery') {
      return `Supports PNG, JPG, WEBP, GIF, SVG up to ${this.maxSizeMb()}MB each`;
    }
    return `Supports any file type up to ${this.maxSizeMb()}MB each`;
  });

  private normalizedExistingNames = computed(() => {
    return new Set(this.existingNames().map((name) => name.toLowerCase().trim()));
  });

  isImage(item: FileUploadPreviewItem): boolean {
    return isImageType(item.name, item.type);
  }

  isVideo(item: FileUploadPreviewItem): boolean {
    return isVideoType(item.name, item.type);
  }

  async onFilesSelected(files: File[]): Promise<void> {
    const previews: FileUploadPreviewItem[] = [];
    const currentQueueNames = new Set(
      this.selectedPreviews().map((p) => p.name.toLowerCase().trim()),
    );
    const existingSet = this.normalizedExistingNames();
    const maxBytes = this.maxSizeMb() * 1024 * 1024;

    for (const file of files) {
      const normalizedName = file.name.toLowerCase().trim();
      const preview: FileUploadPreviewItem = {
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: '',
      };

      // Check size limit
      if (file.size > maxBytes) {
        preview.error = `File size exceeds ${this.maxSizeMb()}MB limit.`;
      } else if (existingSet.has(normalizedName)) {
        preview.error = `Duplicate: A file with this name already exists in this location.`;
      } else if (currentQueueNames.has(normalizedName)) {
        preview.error = `Duplicate: File already added to this upload queue.`;
      }

      currentQueueNames.add(normalizedName);

      // Read DataURL for preview (or upload)
      try {
        preview.dataUrl = await this.readAsDataUrl(file);
        if (this.isImage(preview)) {
          const dims = await this.getImageDimensions(preview.dataUrl);
          if (dims) {
            preview.dimensions = dims;
          }
        }
      } catch {
        if (!preview.error) {
          preview.error = 'Failed to read file content.';
        }
      }

      previews.push(preview);
    }

    this.selectedPreviews.update((curr) => [...curr, ...previews]);
  }

  removePreview(index: number): void {
    this.selectedPreviews.update((curr) => curr.filter((_, i) => i !== index));
  }

  clearPreviews(): void {
    this.selectedPreviews.set([]);
  }

  onClose(): void {
    if (this.isUploading()) return;
    this.clearPreviews();
    this.close.emit();
  }

  async uploadAll(): Promise<void> {
    const valid = this.selectedPreviews().filter((p) => !p.error && (p.dataUrl || p.file));
    if (valid.length === 0) return;

    this.isUploading.set(true);
    const user = this.authService.currentUser();
    const uploader = user?.email || user?.name || 'User';
    const uploadItems = valid.map((p) => ({
      name: p.name,
      size: p.size,
      type: p.type,
      dataUrl: p.dataUrl,
    }));

    let outcome: MediaUploadOutcome;

    if (this.target() === 'gallery') {
      outcome = await this.mediaUpload.uploadToGallery(uploadItems, {
        uploadedBy: uploader,
      });
      this.mediaUpload.report(outcome, 'Gallery');
    } else {
      outcome = await this.mediaUpload.uploadToDrive(uploadItems, {
        uploadedBy: uploader,
        driveParentId: this.driveParentId(),
      });
      this.mediaUpload.report(outcome, 'current folder');
    }

    this.isUploading.set(false);

    const landed = new Set(outcome.uploaded);
    this.selectedPreviews.update((curr) => curr.filter((p) => !landed.has(p.name)));

    if (outcome.uploaded.length > 0) {
      this.uploaded.emit(outcome);
      if (this.selectedPreviews().length === 0) {
        this.close.emit();
      }
    }
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = (e.target?.result as string) || '';
        resolve(url);
      };
      reader.onerror = () => reject(new Error('Read failed'));
      reader.readAsDataURL(file);
    });
  }

  private getImageDimensions(
    dataUrl: string,
  ): Promise<{ width: number; height: number } | undefined> {
    return new Promise((resolve) => {
      if (!dataUrl || typeof Image === 'undefined') return resolve(undefined);
      const img = new Image();
      const timer = setTimeout(() => resolve(undefined), 50);
      img.onload = () => {
        clearTimeout(timer);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(undefined);
      };
      img.src = dataUrl;
    });
  }
}
