import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DriveNode } from '../../../core/models/drive.model';
import { UploaderService } from '../../../core/services/uploader.service';
import { isImageType, isVideoType } from '../../../core/utils/file-types';
import { formatBytes, formatDate, getInitials } from '../../../core/utils/formatters';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FileTypeIconComponent } from '../../../shared/components/file-type-icon/file-type-icon.component';
import { IconButtonComponent } from '../../../shared/components/icon-button/icon-button.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { DriveItemMenuComponent } from '../drive-item-menu/drive-item-menu.component';

@Component({
  selector: 'app-drive-content',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    FileTypeIconComponent,
    IconButtonComponent,
    LoaderComponent,
    UiButtonComponent,
    DriveItemMenuComponent,
    LucideAngularModule,
  ],
  templateUrl: './drive-content.component.html',
  styleUrl: './drive-content.component.css',
})
export class DriveContentComponent {
  uploaders = inject(UploaderService);

  isLoading = input<boolean>(false);
  isDeleting = input<boolean>(false);
  currentFolders = input<DriveNode[]>([]);
  currentFiles = input<DriveNode[]>([]);
  viewMode = input<'grid' | 'list'>('grid');
  activeMenuNode = input<DriveNode | null>(null);
  menuDropUp = input<boolean>(false);
  selectedIds = input<Set<string>>(new Set());
  allSelected = input<boolean>(false);
  /** Drives the empty state: nothing to show because of a search reads very differently
   *  from a folder that really is empty. */
  searchQuery = input<string>('');

  createFolder = output<void>();
  clearSearch = output<void>();
  navigateToFolder = output<string>();
  toggleMenu = output<{ node: DriveNode; event: MouseEvent }>();
  closeMenu = output<void>();
  preview = output<DriveNode>();
  download = output<DriveNode>();
  rename = output<DriveNode>();
  delete = output<DriveNode>();
  toggleSelection = output<string>();
  toggleSelectAll = output<void>();
  clearSelection = output<void>();
  deleteSelected = output<void>();

  formatBytes = formatBytes;
  formatDate = formatDate;
  getInitials = getInitials;

  itemCount = computed(() => this.currentFolders().length + this.currentFiles().length);

  selectedCount = computed(() => this.selectedIds().size);

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  isImageFile(node: DriveNode): boolean {
    return isImageType(node.name, node.mimeType);
  }

  isVideoFile(node: DriveNode): boolean {
    return isVideoType(node.name, node.mimeType);
  }

  onToggleMenu(node: DriveNode, event: MouseEvent): void {
    this.toggleMenu.emit({ node, event });
  }

  isTouchOrMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  onFolderClick(folder: DriveNode): void {
    if (this.isTouchOrMobile()) {
      this.navigateToFolder.emit(folder.id);
    }
  }

  onFolderDblClick(folder: DriveNode): void {
    this.navigateToFolder.emit(folder.id);
  }

  onFileClick(file: DriveNode): void {
    if (this.isTouchOrMobile()) {
      this.preview.emit(file);
    }
  }

  onFileDblClick(file: DriveNode): void {
    this.preview.emit(file);
  }
}
