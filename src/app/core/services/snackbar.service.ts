import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { SnackbarItem, SnackbarType } from '../models/snackbar.model';
import { SnackbarContentComponent } from '../../shared/components/snackbar-content/snackbar-content.component';

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  private snackBar = inject(MatSnackBar);
  items = signal<SnackbarItem[]>([]);

  show(type: SnackbarType, message: string, title?: string, duration: number = 4000): void {
    const id = 'snackbar-' + Math.random().toString(36).substring(2, 9);
    const item: SnackbarItem = { id, type, message, title, duration };

    this.items.update((list) => [...list, item]);

    const config: MatSnackBarConfig = {
      duration: duration > 0 ? duration : 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['custom-snack-bar-panel', `panel-${type}`],
      data: {
        type,
        message,
        title,
      },
    };

    this.snackBar.openFromComponent(SnackbarContentComponent, config);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string, title: string = 'Success'): void {
    this.show('success', message, title);
  }

  error(message: string, title: string = 'Error'): void {
    this.show('error', message, title, 5000);
  }

  info(message: string, title: string = 'Information'): void {
    this.show('info', message, title);
  }

  warning(message: string, title: string = 'Warning'): void {
    this.show('warning', message, title);
  }

  remove(id: string): void {
    this.items.update((list) => list.filter((item) => item.id !== id));
  }

  clear(): void {
    this.items.set([]);
    this.snackBar.dismiss();
  }
}
