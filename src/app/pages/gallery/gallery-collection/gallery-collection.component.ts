import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ImageItem } from '../../../core/models/image.model';
import { formatBytes } from '../../../core/utils/formatters';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

const DOUBLE_CLICK_MS = 250;

@Component({
  selector: 'app-gallery-collection',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    LoaderComponent,
    SearchInputComponent,
    UiButtonComponent,
    LucideAngularModule,
  ],
  templateUrl: './gallery-collection.component.html',
  styleUrl: './gallery-collection.component.css',
})
export class GalleryCollectionComponent {
  images = input<ImageItem[]>([]);
  isLoading = input<boolean>(false);
  isDeleting = input<boolean>(false);
  canUpload = input<boolean>(true);
  searchQuery = input<string>('');
  activeImageId = input<string | number | null>(null);
  selectedIds = input<Set<string | number>>(new Set());
  allSelected = input<boolean>(false);

  searchChange = output<string>();
  upload = output<void>();
  setActive = output<ImageItem>();
  openLightbox = output<number>();
  toggleSelection = output<string | number>();
  toggleSelectAll = output<void>();
  clearSelection = output<void>();
  deleteSelected = output<void>();
  deleteImage = output<ImageItem>();

  selectedCount = computed(() => this.selectedIds().size);

  formatBytes = formatBytes;

  private pendingClick?: ReturnType<typeof setTimeout>;

  ngOnDestroy(): void {
    clearTimeout(this.pendingClick);
  }

  isSelected(id: string | number): boolean {
    return this.selectedIds().has(id);
  }

  onCardClick(image: ImageItem): void {
    clearTimeout(this.pendingClick);
    this.pendingClick = setTimeout(() => this.setActive.emit(image), DOUBLE_CLICK_MS);
  }

  onCardDoubleClick(index: number): void {
    clearTimeout(this.pendingClick);
    this.openLightbox.emit(index);
  }
}
