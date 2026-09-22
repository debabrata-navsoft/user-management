import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BreadcrumbItem, DriveNode, DriveStats } from '../../core/models/drive.model';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { DRIVE_ROOT, DriveService } from '../../core/services/drive.service';
import { ImageModalService } from '../../core/services/image-modal.service';
import { MediaUploadService } from '../../core/services/media-upload.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { UploaderService } from '../../core/services/uploader.service';
import { UserService } from '../../core/services/user.service';
import { openDataUrlInNewTab } from '../../core/utils/data-url';
import { isImageType, isVideoType } from '../../core/utils/file-types';
import { isValidFolderName } from '../../core/utils/folder-validator';
import { onSelectionShortcut } from '../../core/utils/keyboard';
import { formatBytes, formatDate, getInitials } from '../../core/utils/formatters';
import { PacedWriteOutcome } from '../../core/utils/write-pacing';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CreateFolderModalComponent } from './create-folder-modal/create-folder-modal.component';
import { DriveContentComponent } from './drive-content/drive-content.component';
import { FilePreviewModalComponent } from './file-preview-modal/file-preview-modal.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RenameModalComponent } from './rename-modal/rename-modal.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button.component';
import { UploadModalComponent } from '../../shared/components/upload-modal/upload-modal.component';
import { UserPickerComponent } from '../../shared/components/user-picker/user-picker.component';

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
    UserPickerComponent,
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
  private uploaders = inject(UploaderService);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal<boolean>(true);
  isActionSubmitting = signal<boolean>(false);

  users = signal<User[]>([]);
  /** Whose drive is on screen. Null while the user list is showing. */
  viewedUser = signal<User | null>(null);

  /** Admins and managers start on the user list; everyone else only ever has their own. */
  canBrowseUsers = computed(() => this.authService.hasRole('admin', 'manager'));
  showUserList = computed(() => this.canBrowseUsers() && !this.viewedUser());
  // An admin or manager reviews what others uploaded; an upload of theirs would be stored
  // against their own account, never the user on screen.
  canUpload = computed(() => !this.canBrowseUsers());

  headerSubtitle = computed(() => {
    const owner = this.viewedUser();
    if (this.showUserList()) return 'Open a user to see the folders and files they uploaded';
    if (owner) return `Folders and files uploaded by ${owner.name}`;
    return 'Google Drive-inspired workplace asset management with folders, nested navigation and file previews';
  });

  headerBadge = computed(() =>
    this.showUserList()
      ? `${this.users().length} Users`
      : `${this.stats().totalFolders} Folders, ${this.stats().totalFiles} Files`,
  );

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
  pendingDeletes = signal<DriveNode[]>([]);

  selectedIds = signal<Set<string>>(new Set());

  activeMenuNode = signal<DriveNode | null>(null);
  menuDropUp = signal<boolean>(false);

  formatBytes = formatBytes;
  formatDate = formatDate;
  getInitials = getInitials;

  filteredNodes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.nodes();

    // Matches the Owner column: `uploadedBy` holds an email on newer rows, so search the
    // display name the column actually shows as well as the raw stored value.
    return this.nodes().filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        this.uploaders.nameFor(n.uploadedBy).toLowerCase().includes(q) ||
        (n.uploadedBy || '').toLowerCase().includes(q),
    );
  });

  currentFolders = computed(() => {
    return this.filteredNodes().filter((n) => n.type === 'folder');
  });

  currentFiles = computed(() => {
    return this.filteredNodes().filter((n) => n.type === 'file');
  });

  selectedNodes = computed(() => this.filteredNodes().filter((n) => this.selectedIds().has(n.id)));

  selectedCount = computed(() => this.selectedNodes().length);

  allVisibleSelected = computed(() => {
    const visible = this.filteredNodes();
    return visible.length > 0 && visible.every((n) => this.selectedIds().has(n.id));
  });

  deleteDialog = computed(() => {
    const pending = this.pendingDeletes();
    const [first] = pending;
    const single = pending.length === 1;
    const folders = pending.some((n) => n.type === 'folder');

    return {
      title: single ? 'Delete Item' : 'Delete Selected Items',
      confirmText: single ? 'Delete' : 'Delete All',
      message: single
        ? `Are you sure you want to delete ${first.name}${folders ? ' and all its subfolders/files?' : '?'}`
        : `Are you sure you want to delete these ${pending.length} items?` +
          (folders ? ' Their subfolders and files go too.' : ''),
    };
  });

  private siblingsOfType(type: DriveNode['type']): DriveNode[] {
    return this.nodes().filter((n) => n.type === type);
  }

  // Duplicate checks run against every sibling, never `filteredNodes()` — a name hidden
  // by the search box is still taken, and matching on the visible list let it through.
  existingFolderNames = computed(() => this.siblingsOfType('folder').map((f) => f.name));

  existingFileNames = computed(() => this.siblingsOfType('file').map((f) => f.name));

  siblingNodesForRename = computed(() => {
    const node = this.nodeToRename();
    return node ? this.siblingsOfType(node.type) : [];
  });

  ngOnInit(): void {
    const savedMode = localStorage.getItem('drive_view_mode') as 'grid' | 'list';
    if (savedMode && (savedMode === 'grid' || savedMode === 'list')) {
      this.viewMode.set(savedMode);
    }

    // Both the folder and, for an admin, the user being viewed live in the URL, so browser
    // Back walks back through them instead of leaving the page.
    this.route.queryParamMap.subscribe((params) => {
      const folderId = params.get('folderId') || DRIVE_ROOT;
      const view = params.get('view') as 'grid' | 'list';
      if (view && (view === 'grid' || view === 'list')) {
        this.viewMode.set(view);
      }

      if (!this.canBrowseUsers()) {
        this.loadFolder(folderId);
        return;
      }
      this.applyUserParam(params.get('userId'), folderId);
    });

    if (this.canBrowseUsers()) this.loadUsers();
    else this.loadStats();
  }

  private applyUserParam(userId: string | null, folderId: string): void {
    if (!userId) {
      this.setViewedUser(null);
      return;
    }

    if (String(this.viewedUser()?.id ?? '') === userId) {
      // Same user, so this is folder navigation — `viewUser` already loaded the root.
      if (folderId !== this.currentFolderId()) this.loadFolder(folderId);
      return;
    }

    this.userService.resolveUser(userId, this.users()).subscribe({
      next: (user) => this.setViewedUser(user, folderId),
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
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { userId: user.id, folderId: null },
      queryParamsHandling: 'merge',
    });
  }

  backToUsers(): void {
    this.setViewedUser(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { userId: null, folderId: null },
      queryParamsHandling: 'merge',
    });
  }

  /** `null` is the user list: same reset, minus the load. */
  private setViewedUser(user: User | null, folderId: string = DRIVE_ROOT): void {
    this.viewedUser.set(user);
    this.searchQuery.set('');
    this.clearSelection();

    if (!user) {
      this.nodes.set([]);
      return;
    }
    this.loadFolder(folderId);
    this.loadStats();
  }

  loadFolder(folderId: string): void {
    this.isLoading.set(true);
    this.currentFolderId.set(folderId);
    // Selection is per folder: carrying ids across a move would delete out of sight.
    this.clearSelection();

    forkJoin({
      nodes: this.driveService.getNodes(folderId, this.viewedUser() ?? undefined),
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
    this.driveService.getStats(this.viewedUser() ?? undefined).subscribe({
      next: (s) => this.stats.set(s),
    });
  }

  navigateToFolder(folderId: string): void {
    // The query survives the move and filters the folder you land in — the search box
    // shows it, so clearing it here would leave the text on screen filtering nothing.
    const queryParams: Record<string, string> = {};
    if (folderId && folderId !== DRIVE_ROOT) {
      queryParams['folderId'] = folderId;
    }
    if (this.viewMode() === 'list') {
      queryParams['view'] = 'list';
    }
    // This call replaces the query, so whose drive is open has to be carried over.
    const owner = this.viewedUser();
    if (owner) {
      queryParams['userId'] = String(owner.id);
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

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.isAnyModalOpen()) return;

    onSelectionShortcut(event, {
      selectAll: () => this.selectAll(),
      clear: () => this.clearSelection(),
    });
  }

  private isAnyModalOpen(): boolean {
    return (
      this.isUploadModalOpen() ||
      this.isCreateFolderOpen() ||
      this.isRenameOpen() ||
      this.isPreviewOpen() ||
      this.isDeleteOpen() ||
      this.imageModalService.isOpen()
    );
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
    this.openDeleteModal([node]);
  }

  confirmDeleteSelected(): void {
    this.openDeleteModal(this.selectedNodes());
  }

  closeDeleteModal(): void {
    this.isDeleteOpen.set(false);
    this.pendingDeletes.set([]);
  }

  submitDelete(): void {
    const targets = this.pendingDeletes();
    if (targets.length === 0) return;

    this.isActionSubmitting.set(true);
    this.driveService.deleteNodes(targets.map((n) => n.id)).subscribe({
      next: (outcome) => this.finishDelete(targets, outcome),
      error: () => {
        this.isActionSubmitting.set(false);
        this.snackbar.error('Failed to delete item.');
      },
    });
  }

  private openDeleteModal(targets: DriveNode[]): void {
    if (targets.length === 0) return;
    this.pendingDeletes.set(targets);
    this.isDeleteOpen.set(true);
  }

  /** `outcome` counts every node deleted, descendants included; the user counts what they picked. */
  private finishDelete(targets: DriveNode[], outcome: PacedWriteOutcome<string>): void {
    this.isActionSubmitting.set(false);
    this.closeDeleteModal();

    const deleted = new Set(outcome.done);
    const removed = targets.filter((node) => deleted.has(node.id)).length;
    const total = targets.length;

    if (removed === total) {
      this.snackbar.success(
        total === 1 ? `Deleted "${targets[0].name}"` : `Deleted ${total} items.`,
      );
    } else if (removed === 0) {
      this.snackbar.error('Failed to delete item.');
    } else {
      this.snackbar.warning(
        `Deleted ${removed} of ${total} items. ` +
          (outcome.aborted
            ? 'The API stopped responding — check that `npm run api` is running, then delete the rest.'
            : 'Please retry the rest.'),
      );
    }

    // `loadFolder` drops the selection, so nothing deleted stays checked.
    if (removed === 0) return;
    this.loadFolder(this.currentFolderId());
    this.loadStats();
  }

  toggleSelection(id: string): void {
    this.editSelection((ids) => {
      if (!ids.delete(id)) ids.add(id);
    });
  }

  toggleSelectAll(): void {
    if (this.allVisibleSelected()) this.clearSelection();
    else this.selectAll();
  }

  selectAll(): void {
    this.editSelection((ids) => this.filteredNodes().forEach((n) => ids.add(n.id)));
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  private editSelection(mutate: (ids: Set<string>) => void): void {
    this.selectedIds.update((curr) => {
      const next = new Set(curr);
      mutate(next);
      return next;
    });
  }
}
