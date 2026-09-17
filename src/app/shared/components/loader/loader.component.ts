import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css',
})
export class LoaderComponent {
  private loadingService = inject(LoadingService, { optional: true });

  message = input<string>('');
  size = input<'sm' | 'md' | 'lg'>('md');
  fullscreen = input<boolean>(false);

  // Prevent duplicate loaders: If global fullscreen loader is active, hide inline loaders
  shouldDisplay = computed(() => {
    if (this.fullscreen()) {
      return true;
    }
    if (this.loadingService?.isLoading()) {
      return false;
    }
    return true;
  });
}
