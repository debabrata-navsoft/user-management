import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { concatMap, from, map } from 'rxjs';
import { ImageItem, ImageUploadPreview } from '../../core/models/image.model';
import { AuthService } from '../../core/services/auth.service';
import { ImageModalService } from '../../core/services/image-modal.service';
import { ImageService } from '../../core/services/image.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { formatBytes, formatDate } from '../../core/utils/formatters';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FileDropZoneComponent } from '../../shared/components/file-drop-zone/file-drop-zone.component';
import { ImageMagnifierComponent } from '../../shared/components/image-magnifier/image-magnifier.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    UiButtonComponent,
    FileDropZoneComponent,
    ImageMagnifierComponent,
    SearchInputComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoaderComponent,
  ],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css',
})
export class GalleryComponent implements OnInit {
  private imageService = inject(ImageService);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);
  modalService = inject(ImageModalService);

  isLoading = signal<boolean>(true);
  isUploading = signal<boolean>(false);
  isDeleting = signal<boolean>(false);
  showUploader = signal<boolean>(false);

  images = signal<ImageItem[]>([]);
  searchQuery = signal<string>('');
  selectedPreviews = signal<ImageUploadPreview[]>([]);
  activeImage = signal<ImageItem | null>(null);

  selectedIds = signal<Set<string | number>>(new Set());

  pendingDeletes = signal<ImageItem[]>([]);
  isDeleteModalOpen = signal<boolean>(false);

  formatBytes = formatBytes;
  formatDate = formatDate;

  maxVisibleThumbnails = 8;

  validPreviewsCount = computed(() => {
    return this.selectedPreviews().filter((p) => !p.error && p.dataUrl).length;
  });

  filteredImages = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.images();
    return this.images().filter((img) => img.name.toLowerCase().includes(q));
  });

  galleryModalItems = computed(() => {
    return this.images().map((img) => ({
      url: img.url,
      title: img.name,
    }));
  });

  activeImageIndex = computed(() => {
    const active = this.activeImage();
    if (!active) return 0;
    const idx = this.images().findIndex((img) => img.id === active.id);
    return idx >= 0 ? idx : 0;
  });

  visibleThumbnails = computed(() => {
    return this.images().slice(0, this.maxVisibleThumbnails);
  });

  overflowThumbnailsCount = computed(() => {
    return Math.max(0, this.images().length - this.maxVisibleThumbnails);
  });

  selectedImages = computed(() => {
    const ids = this.selectedIds();
    return this.images().filter((img) => ids.has(img.id));
  });

  selectedCount = computed(() => this.selectedIds().size);

  deleteDialog = computed(() => {
    const pending = this.pendingDeletes();
    const single = pending.length === 1;
    return {
      title: single ? 'Delete Image' : 'Delete Selected Images',
      confirmText: single ? 'Delete' : 'Delete All',
      message: single
        ? `Are you sure you want to permanently delete image ${pending[0].name}?`
        : `Are you sure you want to permanently delete ${pending.length} selected images?`,
    };
  });

  allFilteredSelected = computed(() => {
    const list = this.filteredImages();
    const ids = this.selectedIds();
    return list.length > 0 && list.every((img) => ids.has(img.id));
  });

  ngOnInit(): void {
    this.fetchImages();
  }

  fetchImages(): void {
    this.isLoading.set(true);
    this.imageService.getImages().subscribe({
      next: (data) => {
        this.images.set(data);
        if (data.length > 0 && !this.activeImage()) {
          this.activeImage.set(data[0]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  toggleUploader(): void {
    this.showUploader.update((v) => !v);
  }

  openUploader(): void {
    this.showUploader.set(true);
  }

  async onFilesSelected(files: File[]): Promise<void> {
    const previews: ImageUploadPreview[] = [];
    for (const file of files) {
      const p = await this.imageService.processFileForPreview(file);
      previews.push(p);
    }
    this.selectedPreviews.update((curr) => [...curr, ...previews]);
  }

  removePreview(index: number): void {
    this.selectedPreviews.update((curr) => curr.filter((_, i) => i !== index));
  }

  clearPreviews(): void {
    this.selectedPreviews.set([]);
  }

  uploadAll(): void {
    const valid = this.selectedPreviews().filter((p) => !p.error && p.dataUrl);
    if (valid.length === 0) return;

    this.isUploading.set(true);
    const uploadedBy = this.authService.currentUser()?.name || 'User';
    const created: ImageItem[] = [];

    from(valid)
      .pipe(
        concatMap(({ name, dataUrl, size, type, dimensions }) =>
          this.imageService.uploadImage({ name, url: dataUrl, size, type, dimensions, uploadedBy }),
        ),
      )
      .subscribe({
        next: (image) => created.push(image),
        complete: () => {
          this.clearPreviews();
          this.showUploader.set(false);
          this.snackbar.success(`Successfully uploaded ${created.length} image(s)!`);
          this.finishUpload(created);
        },
        error: () => {
          // concatMap keeps order, so the first `created.length` previews landed.
          const done = valid.slice(0, created.length);
          this.selectedPreviews.update((curr) => curr.filter((p) => !done.includes(p)));

          if (created.length > 0) {
            this.snackbar.warning(
              `Uploaded ${created.length} of ${valid.length} image(s). Please retry the rest.`,
            );
          } else {
            this.snackbar.error('Failed to upload images. Please try again.');
          }
          this.finishUpload(created);
        },
      });
  }

  private finishUpload(created: ImageItem[]): void {
    this.isUploading.set(false);
    if (created.length === 0) return;
    this.activeImage.set(created[0]);
    this.fetchImages();
  }

  setActiveImage(image: ImageItem): void {
    this.activeImage.set(image);
  }

  openLightbox(index?: number): void {
    const list = this.galleryModalItems();
    if (list.length === 0) return;
    const startIndex = index !== undefined ? index : this.activeImageIndex();
    this.modalService.open(list, startIndex);
  }

  onSearchChange(q: string): void {
    this.searchQuery.set(q);
  }

  downloadImage(image: ImageItem): void {
    const a = document.createElement('a');
    a.href = image.url;
    a.download = image.name;
    a.click();
    this.snackbar.info(`Downloading ${image.name}...`);
  }

  confirmDeleteImage(image: ImageItem): void {
    this.openDeleteModal([image]);
  }

  confirmDeleteSelected(): void {
    this.openDeleteModal(this.selectedImages());
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.pendingDeletes.set([]);
  }

  submitDelete(): void {
    const targets = this.pendingDeletes();
    if (targets.length === 0) return;

    this.isDeleting.set(true);
    const removed: ImageItem[] = [];

    // Serialised like uploadAll(), so a failure part-way leaves a known state.
    from(targets)
      .pipe(concatMap((img) => this.imageService.deleteImage(img.id).pipe(map(() => img))))
      .subscribe({
        next: (img) => removed.push(img),
        complete: () => this.finishDelete(removed, targets.length),
        error: () => this.finishDelete(removed, targets.length),
      });
  }

  private openDeleteModal(targets: ImageItem[]): void {
    if (targets.length === 0) return;
    this.pendingDeletes.set(targets);
    this.isDeleteModalOpen.set(true);
  }

  private finishDelete(removed: ImageItem[], total: number): void {
    this.isDeleting.set(false);
    this.closeDeleteModal();

    if (removed.length === total) {
      this.snackbar.success(
        total === 1 ? `Image "${removed[0].name}" deleted.` : `Deleted ${total} images.`,
      );
    } else if (removed.length > 0) {
      this.snackbar.warning(`Deleted ${removed.length} of ${total} images. Please retry the rest.`);
    } else {
      this.snackbar.error('Failed to delete images. Please try again.');
    }

    if (removed.length === 0) return;
    this.forgetImages(removed.map((img) => img.id));
    this.fetchImages();
  }

  isSelected(id: string | number): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelection(id: string | number): void {
    this.editSelection((ids) => {
      if (!ids.delete(id)) ids.add(id);
    });
  }

  /** Select every filtered image, or deselect them when they are all selected. */
  toggleSelectAll(): void {
    const selectAll = !this.allFilteredSelected();
    this.editSelection((ids) => {
      for (const img of this.filteredImages()) {
        if (selectAll) ids.add(img.id);
        else ids.delete(img.id);
      }
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  private editSelection(mutate: (ids: Set<string | number>) => void): void {
    this.selectedIds.update((curr) => {
      const next = new Set(curr);
      mutate(next);
      return next;
    });
  }

  /** Drop deleted ids from the selection and clear the inspector if it showed one. */
  private forgetImages(ids: (string | number)[]): void {
    this.editSelection((set) => ids.forEach((id) => set.delete(id)));

    const active = this.activeImage();
    if (active && ids.includes(active.id)) {
      this.activeImage.set(null);
    }
  }
}
