import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { DriveNode } from '../../../core/models/drive.model';
import { AuthService } from '../../../core/services/auth.service';
import { DRIVE_ROOT, DriveService } from '../../../core/services/drive.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { isValidFolderName } from '../../../core/utils/folder-validator';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
  selector: 'app-create-folder-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, UiButtonComponent],
  templateUrl: './create-folder-modal.component.html',
  styleUrl: './create-folder-modal.component.css',
})
export class CreateFolderModalComponent {
  private driveService = inject(DriveService);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService);

  isOpen = input<boolean>(false);
  parentId = input<string>(DRIVE_ROOT);
  existingFolderNames = input<string[]>([]);

  close = output<void>();
  created = output<DriveNode>();

  newFolderName = signal<string>('');
  folderNameError = signal<string>('');
  isSubmitting = signal<boolean>(false);

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.newFolderName.set('');
        this.folderNameError.set('');
        this.isSubmitting.set(false);
      }
    });
  }

  onInput(e: Event): void {
    this.newFolderName.set((e.target as HTMLInputElement).value);
    this.folderNameError.set('');
  }

  onClose(): void {
    this.close.emit();
    this.folderNameError.set('');
  }

  submit(): void {
    const raw = this.newFolderName();
    const validation = isValidFolderName(raw);
    if (!validation.valid) {
      this.folderNameError.set(validation.error || 'Invalid folder name.');
      this.snackbar.warning(validation.error || 'Invalid folder name.');
      return;
    }

    const name = raw.trim();
    const isDuplicate = this.existingFolderNames().some(
      (existing) => existing.toLowerCase() === name.toLowerCase(),
    );
    if (isDuplicate) {
      const err = `A folder named "${name}" already exists in this location.`;
      this.folderNameError.set(err);
      this.snackbar.error(err, 'Duplicate Folder');
      return;
    }

    this.isSubmitting.set(true);
    const user = this.authService.currentUser();
    const uploader = user?.email || user?.name || 'User';

    this.driveService.createFolder(name, this.parentId(), uploader).subscribe({
      next: (newNode) => {
        this.isSubmitting.set(false);
        this.snackbar.success(`Folder "${newNode.name}" created!`);
        this.created.emit(newNode);
        this.onClose();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.snackbar.error('Failed to create folder.');
      },
    });
  }
}
