import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ImageModalService } from '../../../core/services/image-modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  private lightbox = inject(ImageModalService);

  isOpen = input<boolean>(false);
  title = input<string>('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  closable = input<boolean>(true);
  hasFooter = input<boolean>(true);

  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // A lightbox opened from inside this modal owns Escape while it is up.
    if (this.lightbox.isOpen()) return;
    if (this.isOpen() && this.closable()) {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closable()) {
      this.close.emit();
    }
  }
}
