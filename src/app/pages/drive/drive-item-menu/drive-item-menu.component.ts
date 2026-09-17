import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DriveNode } from '../../../core/models/drive.model';

@Component({
  selector: 'app-drive-item-menu',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './drive-item-menu.component.html',
  styleUrl: './drive-item-menu.component.css',
})
export class DriveItemMenuComponent {
  node = input.required<DriveNode>();
  dropUp = input<boolean>(false);

  preview = output<DriveNode>();
  download = output<DriveNode>();
  rename = output<DriveNode>();
  remove = output<DriveNode>();
  closed = output<void>();

  get isFile(): boolean {
    return this.node().type === 'file';
  }

  emit(action: 'preview' | 'download' | 'rename' | 'remove'): void {
    this[action].emit(this.node());
    this.closed.emit();
  }
}
