import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { DriveNode } from '../../../core/models/drive.model';
import { DriveService } from '../../../core/services/drive.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { isValidFolderName } from '../../../core/utils/folder-validator';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-rename-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, UiButtonComponent],
  templateUrl: './rename-modal.component.html',
  styleUrl: './rename-modal.component.css',
})
export class RenameModalComponent {
  private driveService = inject(DriveService);
  private snackbar = inject(SnackbarService);

  isOpen = input<boolean>(false);
  node = input<DriveNode | null>(null);
  siblingNodes = input<DriveNode[]>([]);

  close = output<void>();
  renamed = output<{ node: DriveNode; newName: string }>();

  renameValue = signal<string>('');
  renameError = signal<string>('');
  isSubmitting = signal<boolean>(false);

  constructor() {
    effect(() => {
      if (this.isOpen() && this.node()) {
        this.renameValue.set(this.node()!.name);
        this.renameError.set('');
        this.isSubmitting.set(false);
      }
    });
  }

  onInput(e: Event): void {
    this.renameValue.set((e.target as HTMLInputElement).value);
    this.renameError.set('');
  }

  onClose(): void {
    this.close.emit();
    this.renameError.set('');
  }

  submit(): void {
    const currentNode = this.node();
    if (!currentNode) return;

    const raw = this.renameValue();
    if (currentNode.type === 'folder') {
      const validation = isValidFolderName(raw);
      if (!validation.valid) {
        this.renameError.set(validation.error || 'Invalid name.');
        this.snackbar.warning(validation.error || 'Invalid name.');
        return;
      }
    } else if (!raw.trim()) {
      this.renameError.set('File name cannot be empty.');
      this.snackbar.warning('File name cannot be empty.');
      return;
    }

    const newName = raw.trim();
    if (newName.toLowerCase() === currentNode.name.toLowerCase()) {
      this.onClose();
      return;
    }

    const isDuplicate = this.siblingNodes().some(
      (n) => n.id !== currentNode.id && n.name.toLowerCase() === newName.toLowerCase(),
    );

    if (isDuplicate) {
      const err = `An item named "${newName}" already exists in this folder.`;
      this.renameError.set(err);
      this.snackbar.error(err, 'Duplicate Name');
      return;
    }

    this.isSubmitting.set(true);
    this.driveService.renameNode(currentNode.id, newName).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.snackbar.success(`Renamed to "${newName}"`);
        this.renamed.emit({ node: currentNode, newName });
        this.onClose();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.snackbar.error('Failed to rename item.');
      },
    });
  }
}
