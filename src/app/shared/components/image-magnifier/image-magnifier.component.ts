import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, input, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ImageModalService, LightboxImage } from '../../../core/services/image-modal.service';

@Component({
  selector: 'app-image-magnifier',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './image-magnifier.component.html',
  styleUrl: './image-magnifier.component.css',
})
export class ImageMagnifierComponent {
  private imageModalService = inject(ImageModalService);

  @ViewChild('imageWrapper') imageWrapperRef!: ElementRef<HTMLDivElement>;

  imageUrl = input.required<string>();
  alt = input<string>('Zoom Preview');
  zoomLevel = input<number>(6);
  galleryImages = input<(string | LightboxImage)[]>([]);
  currentIndex = input<number>(0);

  isHovering = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);

  lensSize = 100;
  lensPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  bgPosition = signal<string>('0% 0%');

  onMouseEnter(): void {
    if (!this.hasError() && !this.isLoading()) {
      this.isHovering.set(true);
    }
  }

  onMouseLeave(): void {
    this.isHovering.set(false);
  }

  onImageLoaded(): void {
    this.isLoading.set(false);
    this.hasError.set(false);
  }

  onImageError(): void {
    this.isLoading.set(false);
    this.hasError.set(true);
  }

  onImageClick(): void {
    if (this.hasError() || this.isLoading()) return;
    const list = this.galleryImages();
    if (list && list.length > 0) {
      this.imageModalService.open(list, this.currentIndex());
    } else {
      this.imageModalService.openSingle(this.imageUrl(), this.alt());
    }
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.imageWrapperRef) return;
    const rect = this.imageWrapperRef.nativeElement.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let lensX = mouseX - this.lensSize / 2;
    let lensY = mouseY - this.lensSize / 2;

    lensX = Math.max(0, Math.min(lensX, rect.width - this.lensSize));
    lensY = Math.max(0, Math.min(lensY, rect.height - this.lensSize));

    this.lensPosition.set({ x: lensX, y: lensY });

    const percentX = (mouseX / rect.width) * 100;
    const percentY = (mouseY / rect.height) * 100;

    this.bgPosition.set(`${percentX}% ${percentY}%`);
  }
}
