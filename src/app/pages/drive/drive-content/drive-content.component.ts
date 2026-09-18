import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DriveNode } from '../../../core/models/drive.model';
import { isImageType, isVideoType } from '../../../core/utils/file-types';
import { formatBytes, formatDate, getInitials } from '../../../core/utils/formatters';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FileTypeIconComponent } from '../../../shared/components/file-type-icon/file-type-icon.component';
import { IconButtonComponent } from '../../../shared/components/icon-button/icon-button.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
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
    DriveItemMenuComponent,
    LucideAngularModule,
  ],
  templateUrl: './drive-content.component.html',
  styleUrl: './drive-content.component.css',
})
export class DriveContentComponent {
  isLoading = input<boolean>(false);
  currentFolders = input<DriveNode[]>([]);
  currentFiles = input<DriveNode[]>([]);
  viewMode = input<'grid' | 'list'>('grid');
  activeMenuNode = input<DriveNode | null>(null);
  menuDropUp = input<boolean>(false);

  createFolder = output<void>();
  navigateToFolder = output<string>();
  toggleMenu = output<{ node: DriveNode; event: MouseEvent }>();
  closeMenu = output<void>();
  preview = output<DriveNode>();
  download = output<DriveNode>();
  rename = output<DriveNode>();
  delete = output<DriveNode>();

  formatBytes = formatBytes;
  formatDate = formatDate;
  getInitials = getInitials;

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
