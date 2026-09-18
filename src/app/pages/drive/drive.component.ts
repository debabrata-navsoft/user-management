import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BreadcrumbItem, DriveNode, DriveStats } from '../../core/models/drive.model';
import { AuthService } from '../../core/services/auth.service';
import { DRIVE_ROOT, DriveService } from '../../core/services/drive.service';
import { ImageModalService } from '../../core/services/image-modal.service';
import { MediaUploadService } from '../../core/services/media-upload.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { openDataUrlInNewTab } from '../../core/utils/data-url';
import { isImageType, isVideoType } from '../../core/utils/file-types';
import { isValidFolderName } from '../../core/utils/folder-validator';
import { formatBytes, formatDate, getInitials } from '../../core/utils/formatters';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CreateFolderModalComponent } from './create-folder-modal/create-folder-modal.component';
import { DriveContentComponent } from './drive-content/drive-content.component';
import { FilePreviewModalComponent } from './file-preview-modal/file-preview-modal.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RenameModalComponent } from './rename-modal/rename-modal.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button.component';
import { UploadModalComponent } from '../../shared/components/upload-modal/upload-modal.component';

const CONTEXT_MENU_HEIGHT_PX = 200;

@Component({
  selector: 'app-drive',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    UiButtonComponent,
    SearchInputComponent,
    ConfirmDialogComponent,
    DriveContentComponent,
    CreateFolderModalComponent,
    RenameModalComponent,
    FilePreviewModalComponent,
    UploadModalComponent,
    LucideAngularModule,
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

  isUploadModalOpen = signal<boolean>(false);
  isCreateFolderOpen = signal<boolean>(false);
  isRenameOpen = signal<boolean>(false);
  nodeToRename = signal<DriveNode | null>(null);

  isPreviewOpen = signal<boolean>(false);
  previewNode = signal<DriveNode | null>(null);

  isDeleteOpen = signal<boolean>(false);
  nodeToDelete = signal<DriveNode | null>(null);

  activeMenuNode = signal<DriveNode | null>(null);
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

  existingFolderNames = computed(() => {
    return this.currentFolders().map((f) => f.name);
  });

  existingFileNames = computed(() => {
    return this.currentFiles().map((f) => f.name);
  });

  siblingNodesForRename = computed(() => {
    const node = this.nodeToRename();
    if (!node) return [];
    return node.type === 'folder' ? this.currentFolders() : this.currentFiles();
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

  isPlayableFile(node: DriveNode): boolean {
    return this.isImageFile(node) || this.isVideoFile(node);
  }

  openUploadModal(): void {
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
  }

  onFilesUploaded(): void {
    this.loadFolder(this.currentFolderId());
    this.loadStats();
  }

  openCreateFolderModal(): void {
    this.isCreateFolderOpen.set(true);
  }

  closeCreateFolderModal(): void {
    this.isCreateFolderOpen.set(false);
  }

  onFolderCreated(): void {
    this.loadFolder(this.currentFolderId());
    this.loadStats();
  }

  async onUploadFileInput(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const existingFileNames = new Set(this.currentFiles().map((f) => f.name.toLowerCase().trim()));

    const validFiles: File[] = [];
    const duplicateFileNames: string[] = [];
    const seenInBatch = new Set<string>();

    for (const file of files) {
      const normalized = file.name.toLowerCase().trim();
      if (existingFileNames.has(normalized) || seenInBatch.has(normalized)) {
        duplicateFileNames.push(file.name);
      } else {
        seenInBatch.add(normalized);
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      const user = this.authService.currentUser();
      const outcome = await this.mediaUpload.readAndUploadToDrive(validFiles, {
        uploadedBy: user?.email || user?.name || 'User',
        driveParentId: this.currentFolderId(),
      });
      outcome.duplicates.push(...duplicateFileNames);
      this.mediaUpload.report(outcome);

      this.loadFolder(this.currentFolderId());
      this.loadStats();
    } else {
      this.mediaUpload.report({
        uploaded: [],
        tooLarge: [],
        duplicates: duplicateFileNames,
        failed: [],
      });
    }
  }

  openRenameModal(node: DriveNode): void {
    this.nodeToRename.set(node);
    this.isRenameOpen.set(true);
  }

  closeRenameModal(): void {
    this.isRenameOpen.set(false);
    this.nodeToRename.set(null);
  }

  onNodeRenamed(): void {
    this.loadFolder(this.currentFolderId());
  }

  openPreview(node: DriveNode): void {
    if (node.type === 'folder') {
      this.navigateToFolder(node.id);
      return;
    }

    // Direct web URL (e.g. Google Docs, Google Sheets, external link)
    if (node.url) {
      window.open(node.url, '_blank');
      return;
    }

    // Images and Videos: in-app lightbox modal
    if (this.isPlayableFile(node) && node.dataUrl) {
      const playable = this.currentFiles()
        .filter((f) => this.isPlayableFile(f) && f.dataUrl)
        .map((f) => ({ url: f.dataUrl!, title: f.name, mimeType: f.mimeType }));

      const idx = playable.findIndex((f) => f.title === node.name);
      this.imageModalService.open(playable, Math.max(0, idx));
      return;
    }

    // Documents (Word, Excel, PDF, Text, Markdown, etc.) with stored file data:
    // Decodes and opens the real file data in a new tab.
    if (node.dataUrl && openDataUrlInNewTab(node.dataUrl)) {
      return;
    }
    if (node.dataUrl) {
      this.snackbar.info(`Allow pop-ups to open "${node.name}" in a new tab.`);
    }

    const ext = (node.name || '').split('.').pop()?.toLowerCase() || '';
    const mime = (node.mimeType || '').toLowerCase();

    // Word / Docs Document fallback if no dataUrl
    const isDoc =
      ['doc', 'docx', 'gdoc', 'rtf', 'odt'].includes(ext) ||
      mime.includes('word') ||
      mime.includes('document');
    if (isDoc) {
      window.open('https://docs.google.com/document/u/0/', '_blank');
      return;
    }

    // Excel / Spreadsheet fallback if no dataUrl
    const isExcel =
      ['xls', 'xlsx', 'csv', 'gsheet', 'ods'].includes(ext) ||
      mime.includes('excel') ||
      mime.includes('spreadsheet') ||
      mime.includes('csv');
    if (isExcel) {
      window.open('https://docs.google.com/spreadsheets/u/0/', '_blank');
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
