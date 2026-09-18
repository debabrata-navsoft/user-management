import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ImageModalService, LightboxImage } from '../../../core/services/image-modal.service';
import { isVideoType } from '../../../core/utils/file-types';

const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.5;
const ZOOM_DOUBLE_CLICK = 2.5;
const WHEEL_FACTOR = 1.15;

interface Point {
  clientX: number;
  clientY: number;
}

const symmetricClamp = (value: number, limit: number): number =>
  Math.min(limit, Math.max(-limit, value));

const distance = (a: Point, b: Point): number =>
  Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

const midpoint = (a: Point, b: Point): Point => ({
  clientX: (a.clientX + b.clientX) / 2,
  clientY: (a.clientY + b.clientY) / 2,
});

@Component({
  selector: 'app-image-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './image-modal.component.html',
  styleUrl: './image-modal.component.css',
})
export class ImageModalComponent {
  modalService = inject(ImageModalService);

  @ViewChild('imageFrame') frameRef?: ElementRef<HTMLDivElement>;

  scale = signal(ZOOM_MIN);
  offset = signal({ x: 0, y: 0 });
  isPanning = signal(false);
  smoothZoom = signal(true);

  isZoomed = computed(() => this.scale() > ZOOM_MIN);
  canZoomIn = computed(() => this.scale() < ZOOM_MAX);
  canZoomOut = computed(() => this.scale() > ZOOM_MIN);
  zoomPercent = computed(() => Math.round(this.scale() * 100));
  imageTransform = computed(
    () => `translate(${this.offset().x}px, ${this.offset().y}px) scale(${this.scale()})`,
  );

  private pointers = new Map<number, Point>();
  private gesture = { x: 0, y: 0, offsetX: 0, offsetY: 0, spread: 0, scale: ZOOM_MIN };

  constructor() {
    // Opening the lightbox, or moving to another item, always starts back at 100%.
    effect(() => {
      this.modalService.currentIndex();
      this.modalService.isOpen();
      untracked(() => this.resetZoom());
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.modalService.isOpen()) return;

    switch (event.key) {
      case 'Escape':
        return this.modalService.close();
      case 'ArrowRight':
        return this.modalService.next();
      case 'ArrowLeft':
        return this.modalService.prev();
      case '+':
      case '=':
        return this.zoomIn();
      case '-':
      case '_':
        return this.zoomOut();
      case '0':
        return this.resetZoom();
    }
  }

  isVideo(item: LightboxImage): boolean {
    return isVideoType(item.title, item.mimeType);
  }

  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.classList.contains('image-modal-backdrop') ||
      target.classList.contains('image-modal-stage')
    ) {
      this.modalService.close();
    }
  }

  zoomIn(): void {
    this.smoothZoom.set(true);
    this.zoomTo(this.scale() + ZOOM_STEP);
  }

  zoomOut(): void {
    this.smoothZoom.set(true);
    this.zoomTo(this.scale() - ZOOM_STEP);
  }

  resetZoom(): void {
    this.smoothZoom.set(true);
    this.pointers.clear();
    this.isPanning.set(false);
    this.apply(ZOOM_MIN, 0, 0);
  }

  toggleZoom(event: MouseEvent): void {
    event.preventDefault();
    this.smoothZoom.set(true);
    if (this.isZoomed()) {
      this.resetZoom();
    } else {
      this.zoomTo(ZOOM_DOUBLE_CLICK, event);
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.smoothZoom.set(false);
    this.zoomTo(this.scale() * (event.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR), event);
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

    // A lone pointer on an un-zoomed image is a click, not a drag — leave it alone.
    if (this.pointers.size < 2 && !this.isZoomed()) return;

    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.smoothZoom.set(false);
    this.isPanning.set(this.pointers.size === 1);
    this.startGesture();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

    const [a, b] = [...this.pointers.values()];
    const from = this.gesture;

    if (b && from.spread > 0) {
      this.zoomTo((from.scale * distance(a, b)) / from.spread, midpoint(a, b));
    } else if (!b && this.isPanning()) {
      this.apply(
        this.scale(),
        from.offsetX + a.clientX - from.x,
        from.offsetY + a.clientY - from.y,
      );
    }
  }

  onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    const target = event.target as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    this.isPanning.set(this.pointers.size === 1 && this.isZoomed());
    this.startGesture();
  }

  /** Snapshots the pointers and current transform, so every move is a delta from here. */
  private startGesture(): void {
    const [a, b] = [...this.pointers.values()];
    if (!a) return;

    const center = b ? midpoint(a, b) : a;
    const { x, y } = this.offset();
    this.gesture = {
      x: center.clientX,
      y: center.clientY,
      offsetX: x,
      offsetY: y,
      spread: b ? distance(a, b) : 0,
      scale: this.scale(),
    };
  }

  /** Zooms to `next`, holding the point under `anchor` still (default: the image centre). */
  private zoomTo(next: number, anchor?: Point): void {
    const from = this.scale();
    const to = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100));
    if (to === from) return;

    const { x, y } = this.offset();
    const rect = this.frameRef?.nativeElement.getBoundingClientRect();
    if (!anchor || !rect) return this.apply(to, x, y);

    // The visible centre sits at the layout centre plus the current translate; holding the
    // anchor still means pushing that centre away from it in proportion to the scale change.
    const ratio = to / from - 1;
    this.apply(
      to,
      x + (rect.left + rect.width / 2 + x - anchor.clientX) * ratio,
      y + (rect.top + rect.height / 2 + y - anchor.clientY) * ratio,
    );
  }

  /** Commits a transform, clamping the pan so the image stays over its un-zoomed footprint. */
  private apply(scale: number, x: number, y: number): void {
    const rect = this.frameRef?.nativeElement.getBoundingClientRect();
    this.scale.set(scale);
    this.offset.set({
      x: symmetricClamp(x, rect ? (rect.width * (scale - 1)) / 2 : 0),
      y: symmetricClamp(y, rect ? (rect.height * (scale - 1)) / 2 : 0),
    });
  }
}
