import { CommonModule } from '@angular/common';
import {
  Component,
  ContentChild,
  TemplateRef,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ActiveFilterState, FilterGroup } from '../../../core/models/filter.model';
import { TableColumn } from '../../../core/models/table.model';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { FilterDrawerComponent } from '../filter-drawer/filter-drawer.component';
import { LoaderComponent } from '../loader/loader.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { SearchInputComponent } from '../search-input/search-input.component';

export interface ActiveChip {
  groupId: string;
  groupTitle: string;
  value: string;
  label: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    SearchInputComponent,
    FilterDrawerComponent,
    PaginationComponent,
    EmptyStateComponent,
    LoaderComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css',
})
export class DataTableComponent {
  data = input<any[]>([]);
  columns = input<TableColumn[]>([]);

  title = input<string>('');
  subtitle = input<string>('');
  searchPlaceholder = input<string>('Search records...');
  isLoading = input<boolean>(false);
  total = input<number>(0);
  page = input<number>(1);
  limit = input<number>(10);
  pageSizeOptions = input<number[]>([5, 10, 20, 50]);

  @ContentChild('cellTemplate') customCellTemplate?: TemplateRef<any>;

  // Filter drawer config
  filterGroups = input<FilterGroup[]>([]);
  activeFilters = input<ActiveFilterState>({});
  entityLabel = input<string>('users');
  showTotalCount = input<boolean>(true);
  matchingCountCalculator = input<((filters: ActiveFilterState) => number) | undefined>(undefined);

  sort = input<string>('');
  order = input<'asc' | 'desc'>('asc');

  searchChange = output<string>();
  pageChange = output<number>();
  limitChange = output<number>();
  filterChange = output<ActiveFilterState>();
  sortChange = output<{ sort: string; order: 'asc' | 'desc' }>();

  isFilterDrawerOpen = signal<boolean>(false);

  toggleSort(key: string): void {
    const next: 'asc' | 'desc' = this.sort() === key && this.order() === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ sort: key, order: next });
  }

  sortIcon(key: string): string {
    if (this.sort() === key && this.order() === 'asc') return 'arrow-up';
    return 'arrow-down';
  }

  ariaSort(key: string): 'ascending' | 'descending' | 'none' {
    if (this.sort() !== key) return 'none';
    return this.order() === 'asc' ? 'ascending' : 'descending';
  }

  openFilterDrawer(): void {
    this.isFilterDrawerOpen.set(true);
  }

  closeFilterDrawer(): void {
    this.isFilterDrawerOpen.set(false);
  }

  onApplyFilters(filters: ActiveFilterState): void {
    this.filterChange.emit(filters);
  }

  onClearAllFilters(): void {
    this.filterChange.emit({});
  }

  activeFilterChips = computed<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];
    const state = this.activeFilters();
    const groups = this.filterGroups();

    for (const groupId of Object.keys(state)) {
      const values = state[groupId] || [];
      const group = groups.find((g) => g.id === groupId);
      const groupTitle = group ? group.title : groupId;

      for (const val of values) {
        if (group?.type === 'date') {
          let label = val;
          if (val === 'today') label = 'Today';
          else if (val === '7days') label = 'Last 7 days';
          else if (val === '30days') label = 'Last 30 days';
          else if (val.startsWith('custom:')) {
            const parts = val.replace('custom:', '').split('_to_');
            if (parts[0] && parts[1]) label = `${parts[0]} - ${parts[1]}`;
            else if (parts[0]) label = `From ${parts[0]}`;
            else if (parts[1]) label = `Up to ${parts[1]}`;
          }
          chips.push({ groupId, groupTitle, value: val, label });
        } else {
          const opt = group?.options.find((o) => o.value === val);
          const label = opt ? opt.label : val;
          chips.push({ groupId, groupTitle, value: val, label });
        }
      }
    }
    return chips;
  });

  removeChip(chip: ActiveChip): void {
    const state = { ...this.activeFilters() };
    const current = state[chip.groupId] || [];
    const updated = current.filter((v) => v !== chip.value);
    if (updated.length === 0) {
      delete state[chip.groupId];
    } else {
      state[chip.groupId] = updated;
    }
    this.filterChange.emit(state);
  }

  totalActiveFiltersCount = computed(() => {
    return this.activeFilterChips().length;
  });
}
