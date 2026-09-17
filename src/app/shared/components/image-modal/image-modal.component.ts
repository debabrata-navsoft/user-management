import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ImageModalService, LightboxImage } from '../../../core/services/image-modal.service';
import { isVideoType } from '../../../core/utils/file-types';

@Component({
  selector: 'app-image-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './image-modal.component.html',
  styleUrl: './image-modal.component.css',
})
export class ImageModalComponent {
  modalService = inject(ImageModalService);

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.modalService.isOpen()) return;

    if (event.key === 'Escape') {
      this.modalService.close();
    } else if (event.key === 'ArrowRight') {
      this.modalService.next();
    } else if (event.key === 'ArrowLeft') {
      this.modalService.prev();
    }
  }

  isVideo(item: LightboxImage): boolean {
    return isVideoType(item.title, item.mimeType);
  }

  onBackdropClick(event: MouseEvent): void {
    if (
      (event.target as HTMLElement).classList.contains('image-modal-backdrop') ||
      (event.target as HTMLElement).classList.contains('image-modal-stage')
    ) {
      this.modalService.close();
    }
  }
}
