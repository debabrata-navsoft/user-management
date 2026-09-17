import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, MatPaginatorModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent {
  total = input.required<number>();
  page = input<number>(1);
  limit = input<number>(10);
  pageSizeOptions = input<number[]>([5, 10, 20, 50]);

  pageChange = output<number>();
  limitChange = output<number>();

  totalPages = computed(() => {
    const t = Math.ceil(this.total() / this.limit());
    return t > 0 ? t : 1;
  });

  startItem = computed(() => {
    if (this.total() === 0) return 0;
    return (this.page() - 1) * this.limit() + 1;
  });

  endItem = computed(() => {
    return Math.min(this.page() * this.limit(), this.total());
  });

  onPageChange(event: PageEvent): void {
    if (event.pageSize !== this.limit()) {
      this.limitChange.emit(event.pageSize);
    }
    if (event.pageIndex + 1 !== this.page()) {
      this.pageChange.emit(event.pageIndex + 1);
    }
  }
}
