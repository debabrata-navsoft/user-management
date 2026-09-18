import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { DriveNode } from '../../../core/models/drive.model';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { isImageType, isVideoType } from '../../../core/utils/file-types';
import { formatBytes } from '../../../core/utils/formatters';
import { FileTypeIconComponent } from '../../../shared/components/file-type-icon/file-type-icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-file-preview-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, UiButtonComponent, FileTypeIconComponent],
  templateUrl: './file-preview-modal.component.html',
  styleUrl: './file-preview-modal.component.css',
})
export class FilePreviewModalComponent {
  private snackbar = inject(SnackbarService);

  isOpen = input<boolean>(false);
  node = input<DriveNode | null>(null);

  close = output<void>();
  download = output<DriveNode>();

  formatBytes = formatBytes;

  isImageFile(node: DriveNode): boolean {
    return isImageType(node.name, node.mimeType);
  }

  isVideoFile(node: DriveNode): boolean {
    return isVideoType(node.name, node.mimeType);
  }

  onClose(): void {
    this.close.emit();
  }

  onDownload(node: DriveNode): void {
    if (node.dataUrl) {
      const a = document.createElement('a');
      a.href = node.dataUrl;
      a.download = node.name;
      a.click();
      this.snackbar.info(`Downloading ${node.name}...`);
    }
    this.download.emit(node);
  }
}
