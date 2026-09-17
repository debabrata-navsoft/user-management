import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ModalComponent } from '../modal/modal.component';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ModalComponent, UiButtonComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
  isOpen = input<boolean>(false);
  title = input<string>('Confirm Action');
  message = input<string>('Are you sure you want to proceed with this action?');
  confirmText = input<string>('Confirm');
  cancelText = input<string>('Cancel');
  danger = input<boolean>(false);
  loading = input<boolean>(false);

  confirmed = output<void>();
  cancelled = output<void>();
}
