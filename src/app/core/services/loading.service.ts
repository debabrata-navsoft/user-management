import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private activeRequests = signal(0);

  isLoading = signal(false);

  show(): void {
    this.activeRequests.update((count) => count + 1);
    this.isLoading.set(true);
  }

  hide(): void {
    this.activeRequests.update((count) => {
      const next = Math.max(0, count - 1);
      if (next === 0) {
        this.isLoading.set(false);
      }
      return next;
    });
  }

  reset(): void {
    this.activeRequests.set(0);
    this.isLoading.set(false);
  }
}
