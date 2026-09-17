import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BreadcrumbItem, DriveNode, DriveStats } from '../../core/models/drive.model';
import { AuthService } from '../../core/services/auth.service';
import { DRIVE_ROOT, DriveService } from '../../core/services/drive.service';
import { ImageModalService } from '../../core/services/image-modal.service';
import { MediaUploadService } from '../../core/services/media-upload.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { isImageType, isVideoType } from '../../core/utils/file-types';
import { formatBytes, formatDate, getInitials } from '../../core/utils/formatters';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { FileTypeIconComponent } from '../../shared/components/file-type-icon/file-type-icon.component';
import { DriveItemMenuComponent } from './drive-item-menu/drive-item-menu.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button.component';

/**
 * Worst-case height of the row/card context menu (four items plus padding).
 * Used to decide whether it opens downwards or flips above the trigger.
 */
const CONTEXT_MENU_HEIGHT_PX = 200;

@Component({
  selector: 'app-drive',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    UiButtonComponent,
    SearchInputComponent,
    ModalComponent,
    ConfirmDialogComponent,
    DriveItemMenuComponent,
    EmptyStateComponent,
    FileTypeIconComponent,
    LoaderComponent,
  ],
  templateUrl: './drive.component.html',
  styleUrl: './drive.component.css',
})
export class DriveComponent implements OnInit {
  private driveService = inject(DriveService);
  private mediaUpload = inject(MediaUploadService);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);
  private imageModalService = inject(ImageModalService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal<boolean>(true);
  isActionSubmitting = signal<boolean>(false);

  currentFolderId = signal<string>(DRIVE_ROOT);
  nodes = signal<DriveNode[]>([]);
  breadcrumbs = signal<BreadcrumbItem[]>([{ id: DRIVE_ROOT, name: 'My Drive' }]);
  stats = signal<DriveStats>({ totalFolders: 0, totalFiles: 0, totalSizeBytes: 0 });

  viewMode = signal<'grid' | 'list'>('grid');
  searchQuery = signal<string>('');

  // Modals
  isCreateFolderOpen = signal<boolean>(false);
  newFolderName = signal<string>('');

  isRenameOpen = signal<boolean>(false);
  nodeToRename = signal<DriveNode | null>(null);
  renameValue = signal<string>('');

  isPreviewOpen = signal<boolean>(false);
  previewNode = signal<DriveNode | null>(null);

  isDeleteOpen = signal<boolean>(false);
  nodeToDelete = signal<DriveNode | null>(null);

  // Three-dot row context menu
  activeMenuNode = signal<DriveNode | null>(null);
  /** True when the open context menu has to render above its trigger. */
  menuDropUp = signal<boolean>(false);

  formatBytes = formatBytes;
  formatDate = formatDate;
  getInitials = getInitials;

  filteredNodes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.nodes();
    return this.nodes().filter((n) => n.name.toLowerCase().includes(q));
  });

  currentFolders = computed(() => {
    return this.filteredNodes().filter((n) => n.type === 'folder');
  });

  currentFiles = computed(() => {
    return this.filteredNodes().filter((n) => n.type === 'file');
  });

  ngOnInit(): void {
    const savedMode = localStorage.getItem('drive_view_mode') as 'grid' | 'list';
    if (savedMode && (savedMode === 'grid' || savedMode === 'list')) {
      this.viewMode.set(savedMode);
    }

    this.route.queryParamMap.subscribe((params) => {
      const folderId = params.get('folderId') || DRIVE_ROOT;
      const view = params.get('view') as 'grid' | 'list';
      if (view && (view === 'grid' || view === 'list')) {
        this.viewMode.set(view);
      }
      this.loadFolder(folderId);
    });

    this.loadStats();
  }

  loadFolder(folderId: string): void {
    this.isLoading.set(true);
    this.currentFolderId.set(folderId);

    forkJoin({
      nodes: this.driveService.getNodes(folderId),
      crumbs: this.driveService.getBreadcrumbs(folderId),
    }).subscribe({
      next: (res) => {
        this.nodes.set(res.nodes);
        this.breadcrumbs.set(res.crumbs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  loadStats(): void {
    this.driveService.getStats().subscribe({
      next: (s) => this.stats.set(s),
    });
  }

  navigateToFolder(folderId: string): void {
    this.searchQuery.set('');
    const queryParams: Record<string, string> = {};
    if (folderId && folderId !== DRIVE_ROOT) {
      queryParams['folderId'] = folderId;
    }
    if (this.viewMode() === 'list') {
      queryParams['view'] = 'list';
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.activeMenuNode()) {
      this.closeMenu();
    }
  }

  onFolderClick(folder: DriveNode): void {
    // Single click selects / focuses item; double click opens folder
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
    localStorage.setItem('drive_view_mode', mode);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: mode },
      queryParamsHandling: 'merge',
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  toggleMenu(node: DriveNode, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeMenuNode()?.id === node.id) {
      this.activeMenuNode.set(null);
      return;
    }

    // Open upwards when the menu would not fit below the trigger, so rows near
    // the bottom of the viewport stay fully visible.
    const trigger = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    const spaceBelow = trigger ? window.innerHeight - trigger.bottom : Number.POSITIVE_INFINITY;
    this.menuDropUp.set(spaceBelow < CONTEXT_MENU_HEIGHT_PX);

    this.activeMenuNode.set(node);
  }

  closeMenu(): void {
    this.activeMenuNode.set(null);
  }

  isImageFile(node: DriveNode): boolean {
    return isImageType(node.name, node.mimeType);
  }

  isVideoFile(node: DriveNode): boolean {
    return isVideoType(node.name, node.mimeType);
  }

  /** Images and videos both play in the lightbox. */
  isPlayableFile(node: DriveNode): boolean {
    return this.isImageFile(node) || this.isVideoFile(node);
  }

  // Create Folder
  openCreateFolderModal(): void {
    this.newFolderName.set('');
    this.isCreateFolderOpen.set(true);
  }

  closeCreateFolderModal(): void {
    this.isCreateFolderOpen.set(false);
  }

  onNewFolderNameInput(e: Event): void {
    this.newFolderName.set((e.target as HTMLInputElement).value);
  }

  submitCreateFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) {
      this.snackbar.warning('Please enter a folder name.');
      return;
    }

    this.isActionSubmitting.set(true);
    const uploader = this.authService.currentUser()?.name || 'User';

    this.driveService.createFolder(name, this.currentFolderId(), uploader).subscribe({
      next: (created) => {
        this.isActionSubmitting.set(false);
        this.closeCreateFolderModal();
        this.snackbar.success(`Folder "${created.name}" created!`);
        this.loadFolder(this.currentFolderId());
        this.loadStats();
      },
      error: () => {
        this.isActionSubmitting.set(false);
        this.snackbar.error('Failed to create folder.');
      },
    });
  }

  // Upload Files
  async onUploadFileInput(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    // The input is reset on click, not here: clearing `value` detaches the File
    // objects, and they still have to be readable while the upload runs.
    this.isLoading.set(true);
    const outcome = await this.mediaUpload.readAndUpload(Array.from(input.files), {
      uploadedBy: this.authService.currentUser()?.name || 'User',
      driveParentId: this.currentFolderId(),
    });
    this.mediaUpload.report(outcome);

    this.loadFolder(this.currentFolderId());
    this.loadStats();
  }

  // Rename
  openRenameModal(node: DriveNode): void {
    this.nodeToRename.set(node);
    this.renameValue.set(node.name);
    this.isRenameOpen.set(true);
  }

  closeRenameModal(): void {
    this.isRenameOpen.set(false);
    this.nodeToRename.set(null);
  }

  onRenameInput(e: Event): void {
    this.renameValue.set((e.target as HTMLInputElement).value);
  }

  submitRename(): void {
    const node = this.nodeToRename();
    const newName = this.renameValue().trim();
    if (!node || !newName) return;

    this.isActionSubmitting.set(true);
    this.driveService.renameNode(node.id, newName).subscribe({
      next: () => {
        this.isActionSubmitting.set(false);
        this.closeRenameModal();
        this.snackbar.success(`Renamed to "${newName}"`);
        this.loadFolder(this.currentFolderId());
      },
      error: () => {
        this.isActionSubmitting.set(false);
        this.snackbar.error('Failed to rename item.');
      },
    });
  }

  // Preview
  openPreview(node: DriveNode): void {
    if (node.type === 'folder') {
      this.navigateToFolder(node.id);
      return;
    }
    if (this.isPlayableFile(node) && node.dataUrl) {
      const playable = this.currentFiles()
        .filter((f) => this.isPlayableFile(f) && f.dataUrl)
        .map((f) => ({ url: f.dataUrl!, title: f.name, mimeType: f.mimeType }));

      const idx = playable.findIndex((f) => f.title === node.name);
      this.imageModalService.open(playable, Math.max(0, idx));
      return;
    }
    this.previewNode.set(node);
    this.isPreviewOpen.set(true);
  }

  closePreview(): void {
    this.isPreviewOpen.set(false);
    this.previewNode.set(null);
  }

  downloadFile(node: DriveNode): void {
    if (!node.dataUrl) return;
    const a = document.createElement('a');
    a.href = node.dataUrl;
    a.download = node.name;
    a.click();
    this.snackbar.info(`Downloading ${node.name}...`);
  }

  // Delete
  confirmDelete(node: DriveNode): void {
    this.nodeToDelete.set(node);
    this.isDeleteOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteOpen.set(false);
    this.nodeToDelete.set(null);
  }

  submitDelete(): void {
    const node = this.nodeToDelete();
    if (!node) return;

    this.isActionSubmitting.set(true);
    this.driveService.deleteNode(node.id).subscribe({
      next: () => {
        this.isActionSubmitting.set(false);
        this.closeDeleteModal();
        this.snackbar.success(`Deleted "${node.name}"`);
        this.loadFolder(this.currentFolderId());
        this.loadStats();
      },
      error: () => {
        this.isActionSubmitting.set(false);
        this.snackbar.error('Failed to delete item.');
      },
    });
  }
}
