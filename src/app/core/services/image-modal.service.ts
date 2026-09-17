import { Injectable, computed, signal } from '@angular/core';

export interface LightboxImage {
  url: string;
  title?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageModalService {
  isOpen = signal<boolean>(false);
  images = signal<LightboxImage[]>([]);
  currentIndex = signal<number>(0);

  currentImage = computed(() => {
    const list = this.images();
    const idx = this.currentIndex();
    return list[idx] || null;
  });

  hasMultiple = computed(() => this.images().length > 1);

  open(items: (string | LightboxImage)[], startIndex: number = 0): void {
    if (!items || items.length === 0) return;

    const normalized: LightboxImage[] = items.map((item) =>
      typeof item === 'string' ? { url: item } : item,
    );

    const safeIndex = Math.max(0, Math.min(startIndex, normalized.length - 1));
    this.images.set(normalized);
    this.currentIndex.set(safeIndex);
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  openSingle(url: string, title?: string): void {
    this.open([{ url, title }], 0);
  }

  close(): void {
    this.isOpen.set(false);
    this.images.set([]);
    this.currentIndex.set(0);
    document.body.style.overflow = '';
  }

  next(): void {
    const total = this.images().length;
    if (total <= 1) return;
    this.currentIndex.update((i) => (i + 1) % total);
  }

  prev(): void {
    const total = this.images().length;
    if (total <= 1) return;
    this.currentIndex.update((i) => (i - 1 + total) % total);
  }

  goTo(index: number): void {
    const total = this.images().length;
    if (index >= 0 && index < total) {
      this.currentIndex.set(index);
    }
  }
}
