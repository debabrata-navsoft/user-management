import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ImageItem } from '../../core/models/image.model';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ImageModalService } from '../../core/services/image-modal.service';
import { ImageService } from '../../core/services/image.service';
import { MediaUploadOutcome } from '../../core/services/media-upload.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { UploaderService } from '../../core/services/uploader.service';
import { UserService } from '../../core/services/user.service';
import { formatBytes, formatDate } from '../../core/utils/formatters';
import { onSelectionShortcut } from '../../core/utils/keyboard';
import { PacedWriteOutcome, runPacedWrites } from '../../core/utils/write-pacing';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ImageMagnifierComponent } from '../../shared/components/image-magnifier/image-magnifier.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button.component';
import { UploadModalComponent } from '../../shared/components/upload-modal/upload-modal.component';
import { UserPickerComponent } from '../../shared/components/user-picker/user-picker.component';
import { GalleryCollectionComponent } from './gallery-collection/gallery-collection.component';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    UiButtonComponent,
    UploadModalComponent,
    UserPickerComponent,
    ImageMagnifierComponent,
    ConfirmDialogComponent,
    GalleryCollectionComponent,
    LucideAngularModule,
  ],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css',
})
export class GalleryComponent implements OnInit {
  private imageService = inject(ImageService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);
  uploaders = inject(UploaderService);
  modalService = inject(ImageModalService);

  isLoading = signal<boolean>(true);
  isDeleting = signal<boolean>(false);
  showUploadModal = signal<boolean>(false);

  users = signal<User[]>([]);
  /** Whose gallery is on screen. Null while the user list is showing. */
  viewedUser = signal<User | null>(null);

  /** Admins and managers start on the user list; everyone else only ever has their own. */
  canBrowseUsers = computed(() => this.authService.hasRole('admin', 'manager'));
  showUserList = computed(() => this.canBrowseUsers() && !this.viewedUser());
  // An admin or manager reviews what others uploaded; an upload of theirs would be stored
  // against their own account, never the user on screen.
  canUpload = computed(() => !this.canBrowseUsers());

  headerSubtitle = computed(() => {
    const owner = this.viewedUser();
    if (this.showUserList()) return 'Open a user to see the images they uploaded';
    if (owner) return `Images uploaded by ${owner.name}`;
    return 'Upload multiple images, organize media assets, and inspect with product-style zoom magnifier';
  });

  headerBadge = computed(() =>
    this.showUserList() ? `${this.users().length} Users` : `${this.images().length} Images Stored`,
  );

  images = signal<ImageItem[]>([]);
  searchQuery = signal<string>('');
  activeImage = signal<ImageItem | null>(null);

  selectedIds = signal<Set<string | number>>(new Set());

  pendingDeletes = signal<ImageItem[]>([]);
  isDeleteModalOpen = signal<boolean>(false);

  formatBytes = formatBytes;
  formatDate = formatDate;

  existingImageNames = computed(() => this.images().map((img) => img.name));

  maxVisibleThumbnails = 8;
  magnifierZoom = 3;

  filteredImages = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.images();

    return this.images().filter(
      (img) =>
        img.name.toLowerCase().includes(q) ||
        this.uploaders.nameFor(img.uploadedBy).toLowerCase().includes(q) ||
        (img.uploadedBy || '').toLowerCase().includes(q),
    );
  });

  galleryModalItems = computed(() => {
    return this.filteredImages().map((img) => ({
      url: img.url,
      title: img.name,
    }));
  });

  activeImageIndex = computed(() => {
    const active = this.activeImage();
    if (!active) return 0;
    const idx = this.filteredImages().findIndex((img) => img.id === active.id);
    return idx >= 0 ? idx : 0;
  });

  visibleThumbnails = computed(() => {
    return this.filteredImages().slice(0, this.maxVisibleThumbnails);
  });

  overflowThumbnailsCount = computed(() => {
    return Math.max(0, this.filteredImages().length - this.maxVisibleThumbnails);
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
    if (!this.canBrowseUsers()) {
      this.fetchImages();
      return;
    }

    this.loadUsers();
    // Who is being viewed lives in the URL, so browser Back returns to the user list
    // instead of leaving the page altogether.
    this.route.queryParamMap.subscribe((params) => this.applyUserParam(params.get('userId')));
  }

  private applyUserParam(userId: string | null): void {
    if (!userId) {
      this.setViewedUser(null);
      return;
    }
    if (String(this.viewedUser()?.id ?? '') === userId) return;

    this.userService.resolveUser(userId, this.users()).subscribe({
      next: (user) => this.setViewedUser(user),
      error: () => this.setViewedUser(null),
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  viewUser(user: User): void {
    this.setViewedUser(user);
    this.router.navigate([], { relativeTo: this.route, queryParams: { userId: user.id } });
  }

  backToUsers(): void {
    this.setViewedUser(null);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  /** `null` is the user list: same reset, minus the fetch. */
  private setViewedUser(user: User | null): void {
    this.viewedUser.set(user);
    this.activeImage.set(null);
    this.clearSelection();
    this.searchQuery.set('');

    if (user) this.fetchImages();
    else this.images.set([]);
  }

  fetchImages(): void {
    this.isLoading.set(true);
    const owner = this.viewedUser();
    const request = owner ? this.imageService.getImagesFor(owner) : this.imageService.getImages();

    request.subscribe({
      next: (data) => {
        this.images.set(data);

        const active = this.activeImage();
        if (active) {
          this.activeImage.set(data.find((img) => img.id === active.id) ?? null);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  openUploadModal(): void {
    this.showUploadModal.set(true);
  }

  closeUploadModal(): void {
    this.showUploadModal.set(false);
  }

  onImagesUploaded(outcome: MediaUploadOutcome): void {
    if (outcome.uploaded.length > 0) {
      this.activeImage.set(null);
      this.fetchImages();
    }
  }

  setActiveImage(image: ImageItem): void {
    this.activeImage.set(image);
  }

  showAllImages(): void {
    this.activeImage.set(null);
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

  async submitDelete(): Promise<void> {
    const targets = this.pendingDeletes();
    if (targets.length === 0) return;

    this.isDeleting.set(true);
    const outcome = await runPacedWrites(targets, (img) => this.imageService.deleteImage(img.id));
    this.finishDelete(outcome, targets.length);
  }

  private openDeleteModal(targets: ImageItem[]): void {
    if (targets.length === 0) return;
    this.pendingDeletes.set(targets);
    this.isDeleteModalOpen.set(true);
  }

  private finishDelete(outcome: PacedWriteOutcome<ImageItem>, total: number): void {
    this.isDeleting.set(false);
    this.closeDeleteModal();

    const removed = outcome.done;

    if (removed.length === total) {
      this.snackbar.success(
        total === 1 ? `Image "${removed[0].name}" deleted.` : `Deleted ${total} images.`,
      );
    } else if (outcome.aborted) {
      // The connection dropped, so the rest were never attempted.
      this.snackbar.warning(
        `Deleted ${removed.length} of ${total} images before the API stopped responding. ` +
          'Check that `npm run api` is still running, then delete the rest.',
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

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // The studio replaces the grid, selection bar and all, so there is nothing to select.
    if (this.activeImage() || this.showUploadModal() || this.isDeleteModalOpen()) return;
    if (this.modalService.isOpen()) return;

    onSelectionShortcut(event, {
      selectAll: () => this.selectAll(),
      clear: () => this.clearSelection(),
    });
  }

  isSelected(id: string | number): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelection(id: string | number): void {
    this.editSelection((ids) => {
      if (!ids.delete(id)) ids.add(id);
    });
  }

  selectAll(): void {
    this.editSelection((ids) => this.filteredImages().forEach((img) => ids.add(img.id)));
  }

  /** Unchecking only drops what is on screen, so a selection the search hides is not lost. */
  toggleSelectAll(): void {
    const add = !this.allFilteredSelected();
    this.editSelection((ids) =>
      this.filteredImages().forEach((img) => (add ? ids.add(img.id) : ids.delete(img.id))),
    );
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

  private forgetImages(ids: (string | number)[]): void {
    this.editSelection((set) => ids.forEach((id) => set.delete(id)));

    const active = this.activeImage();
    if (active && ids.includes(active.id)) {
      this.activeImage.set(null);
    }
  }
}
