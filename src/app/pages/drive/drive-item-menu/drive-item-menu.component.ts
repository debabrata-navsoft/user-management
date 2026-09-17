import { Component, input, output } from '@angular/core';
import { DriveNode } from '../../../core/models/drive.model';

/**
 * The three-dot action menu for a drive row or card.
 *
 * Folders and files show the same menu minus Preview/Download, and both grid
 * and list view render it, so it lives here instead of being repeated four
 * times in the drive template.
 */
@Component({
  selector: 'app-drive-item-menu',
  standalone: true,
  templateUrl: './drive-item-menu.component.html',
  styleUrl: './drive-item-menu.component.css',
})
export class DriveItemMenuComponent {
  node = input.required<DriveNode>();
  /** Render above the trigger, for items near the bottom of the viewport. */
  dropUp = input<boolean>(false);

  preview = output<DriveNode>();
  download = output<DriveNode>();
  rename = output<DriveNode>();
  remove = output<DriveNode>();
  closed = output<void>();

  /** Preview and download only make sense for files. */
  get isFile(): boolean {
    return this.node().type === 'file';
  }

  emit(action: 'preview' | 'download' | 'rename' | 'remove'): void {
    this[action].emit(this.node());
    this.closed.emit();
  }
}
