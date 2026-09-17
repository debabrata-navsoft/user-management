import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LucideAngularModule,
  TriangleAlert,
  X,
} from 'lucide-angular';
import { SnackbarType } from '../../../core/models/snackbar.model';

export interface SnackbarData {
  type: SnackbarType;
  message: string;
  title?: string;
}

@Component({
  selector: 'app-snackbar-content',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './snackbar-content.component.html',
  styleUrl: './snackbar-content.component.css',
})
export class SnackbarContentComponent {
  data: SnackbarData = inject(MAT_SNACK_BAR_DATA);
  snackBarRef = inject(MatSnackBarRef);

  iconName = computed(() => {
    switch (this.data.type) {
      case 'success':
        return 'check-circle-2';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'triangle-alert';
      case 'info':
      default:
        return 'info';
    }
  });

  defaultTitle = computed(() => {
    if (this.data.title) return this.data.title;
    switch (this.data.type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
      default:
        return 'Information';
    }
  });

  dismiss(): void {
    this.snackBarRef.dismiss();
  }
}
