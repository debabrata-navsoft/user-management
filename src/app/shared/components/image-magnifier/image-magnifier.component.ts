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
  @ViewChild('mainImg') mainImgRef!: ElementRef<HTMLImageElement>;
  @ViewChild('zoomWindow') zoomWindowRef?: ElementRef<HTMLDivElement>;

  imageUrl = input.required<string>();
  alt = input<string>('Zoom Preview');
  zoomLevel = input<number>(3);
  galleryImages = input<(string | LightboxImage)[]>([]);
  currentIndex = input<number>(0);

  isHovering = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);

  lensWidth = signal<number>(140);
  lensHeight = signal<number>(140);
  lensPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  bgPosition = signal<string>('0px 0px');
  bgSize = signal<string>('auto');

  onMouseEnter(): void {
    if (!this.hasError() && !this.isLoading()) {
      this.isHovering.set(true);
    }
  }

  onMouseLeave(): void {
    this.isHovering.set(false);
  }

  onTouchStart(e: TouchEvent): void {
    if (this.hasError() || this.isLoading() || e.touches.length === 0) return;
    this.isHovering.set(true);
    this.updateMagnifier(e.touches[0].clientX, e.touches[0].clientY);
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.isHovering() || e.touches.length === 0) return;
    this.updateMagnifier(e.touches[0].clientX, e.touches[0].clientY);
  }

  onTouchEnd(): void {
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
    if (!this.isHovering()) {
      this.isHovering.set(true);
    }
    this.updateMagnifier(e.clientX, e.clientY);
  }

  private updateMagnifier(clientX: number, clientY: number): void {
    if (!this.mainImgRef || !this.imageWrapperRef) return;
    const imgEl = this.mainImgRef.nativeElement;
    const imgRect = imgEl.getBoundingClientRect();
    const wrapperRect = this.imageWrapperRef.nativeElement.getBoundingClientRect();

    if (imgRect.width === 0 || imgRect.height === 0) return;

    // Check pointer inside rendered img
    const mouseX = clientX - imgRect.left;
    const mouseY = clientY - imgRect.top;

    if (mouseX < 0 || mouseX > imgRect.width || mouseY < 0 || mouseY > imgRect.height) {
      return;
    }

    const zoom = Math.max(1.5, this.zoomLevel() || 3);

    // Zoom preview window dimensions
    let zoomWinW = 440;
    let zoomWinH = 440;
    if (this.zoomWindowRef?.nativeElement) {
      const zwRect = this.zoomWindowRef.nativeElement.getBoundingClientRect();
      if (zwRect.width > 0 && zwRect.height > 0) {
        zoomWinW = zwRect.width;
        zoomWinH = zwRect.height;
      }
    } else if (typeof window !== 'undefined') {
      if (window.innerWidth <= 640) {
        zoomWinW = 160;
        zoomWinH = 160;
      } else if (window.innerWidth <= 1024) {
        zoomWinW = Math.min(360, window.innerWidth * 0.8);
        zoomWinH = zoomWinW;
      }
    }

    const lensW = Math.max(30, Math.min(imgRect.width, Math.round(zoomWinW / zoom)));
    const lensH = Math.max(30, Math.min(imgRect.height, Math.round(zoomWinH / zoom)));
    this.lensWidth.set(lensW);
    this.lensHeight.set(lensH);

    // Center lens over cursor
    let lensX = mouseX - lensW / 2;
    let lensY = mouseY - lensH / 2;

    // Clamp lens strictly inside the rendered image
    lensX = Math.max(0, Math.min(lensX, imgRect.width - lensW));
    lensY = Math.max(0, Math.min(lensY, imgRect.height - lensH));

    // Calculate position inside imageWrapper (which centers the image)
    const lensWrapperX = imgRect.left - wrapperRect.left + lensX;
    const lensWrapperY = imgRect.top - wrapperRect.top + lensY;
    this.lensPosition.set({ x: Math.round(lensWrapperX), y: Math.round(lensWrapperY) });

    // Set background size and exact position for 1:1 match with the lens
    const bgSizeW = Math.round(imgRect.width * zoom);
    const bgSizeH = Math.round(imgRect.height * zoom);
    this.bgSize.set(`${bgSizeW}px ${bgSizeH}px`);

    const bgPosX = -Math.round(lensX * zoom);
    const bgPosY = -Math.round(lensY * zoom);
    this.bgPosition.set(`${bgPosX}px ${bgPosY}px`);
  }
}
