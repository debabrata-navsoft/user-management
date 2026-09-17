import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ActiveFilterState, FilterGroup } from '../../../core/models/filter.model';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, UiButtonComponent],
  templateUrl: './filter-drawer.component.html',
  styleUrl: './filter-drawer.component.css',
})
export class FilterDrawerComponent {
  isOpen = input<boolean>(false);
  title = input<string>('Filters');
  groups = input.required<FilterGroup[]>();
  totalResults = input<number>(0);
  entityLabel = input<string>('users');
  matchingCountCalculator = input<((filters: ActiveFilterState) => number) | undefined>(undefined);
  initialSelected = input<ActiveFilterState>({});

  close = output<void>();
  apply = output<ActiveFilterState>();
  clear = output<void>();

  // Internal state
  selectedFilters = signal<ActiveFilterState>({});
  expandedGroups = signal<Record<string, boolean>>({});
  groupSearchQueries = signal<Record<string, string>>({});

  matchingResultsCount = computed(() => {
    const calc = this.matchingCountCalculator();
    if (calc) {
      return calc(this.selectedFilters());
    }
    return this.totalResults();
  });

  ngOnChanges(): void {
    if (this.initialSelected()) {
      // Clone initial selections
      const cloned: ActiveFilterState = {};
      for (const key of Object.keys(this.initialSelected())) {
        cloned[key] = [...this.initialSelected()[key]];
      }
      this.selectedFilters.set(cloned);
    }

    // Default first 2 groups to expanded if not set
    const exp = { ...this.expandedGroups() };
    this.groups().forEach((g, idx) => {
      if (exp[g.id] === undefined) {
        exp[g.id] = g.isExpanded !== undefined ? g.isExpanded : idx < 2;
      }
    });
    this.expandedGroups.set(exp);
  }

  toggleGroup(groupId: string): void {
    this.expandedGroups.update((map) => ({
      ...map,
      [groupId]: !map[groupId],
    }));
  }

  isGroupExpanded(groupId: string): boolean {
    return !!this.expandedGroups()[groupId];
  }

  onGroupSearch(groupId: string, query: string): void {
    this.groupSearchQueries.update((map) => ({
      ...map,
      [groupId]: query.toLowerCase(),
    }));
  }

  getFilteredOptions(group: FilterGroup) {
    const query = (this.groupSearchQueries()[group.id] || '').trim();
    if (!query) return group.options;
    return group.options.filter((opt) => opt.label.toLowerCase().includes(query));
  }

  isOptionSelected(groupId: string, value: string): boolean {
    const list = this.selectedFilters()[groupId] || [];
    return list.includes(value);
  }

  toggleOption(groupId: string, value: string): void {
    this.selectedFilters.update((state) => {
      const current = state[groupId] || [];
      let updated: string[];
      if (current.includes(value)) {
        updated = current.filter((v) => v !== value);
      } else {
        updated = [...current, value];
      }
      return {
        ...state,
        [groupId]: updated,
      };
    });
  }

  totalActiveFiltersCount = computed(() => {
    let count = 0;
    const state = this.selectedFilters();
    for (const key of Object.keys(state)) {
      count += state[key]?.length || 0;
    }
    return count;
  });

  onClear(): void {
    this.selectedFilters.set({});
    this.clear.emit();
  }

  onApply(): void {
    this.apply.emit(this.selectedFilters());
    this.close.emit();
  }

  onBackdropClick(): void {
    this.close.emit();
  }
}
