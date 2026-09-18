import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ActiveFilterState, FilterGroup } from '../../../core/models/filter.model';
import { UiButtonComponent } from '../ui-button/ui-button.component';

export interface CalendarDay {
  date: Date;
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

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

  selectedFilters = signal<ActiveFilterState>({});
  expandedGroups = signal<Record<string, boolean>>({});
  groupSearchQueries = signal<Record<string, string>>({});

  // Date Range state per date group (e.g. 'createdDate')
  datePresets = signal<Record<string, 'today' | '7days' | '30days' | 'all' | 'custom'>>({});
  fromDate = signal<Record<string, string>>({});
  toDate = signal<Record<string, string>>({});

  // Custom Calendar State
  activeDatePicker = signal<{ groupId: string; field: 'from' | 'to' } | null>(null);
  currentViewMonth = signal<Date>(new Date());

  currentMonthYearLabel = computed(() => {
    const view = this.currentViewMonth();
    return view.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });

  matchingResultsCount = computed(() => {
    const calc = this.matchingCountCalculator();
    if (calc) {
      return calc(this.selectedFilters());
    }
    return this.totalResults();
  });

  ngOnChanges(): void {
    if (this.initialSelected()) {
      const cloned: ActiveFilterState = {};
      for (const key of Object.keys(this.initialSelected())) {
        cloned[key] = [...this.initialSelected()[key]];
      }
      this.selectedFilters.set(cloned);

      // Hydrate date filter state if present
      const presets: Record<string, 'today' | '7days' | '30days' | 'all' | 'custom'> = {};
      const fromDates: Record<string, string> = {};
      const toDates: Record<string, string> = {};

      for (const g of this.groups()) {
        if (g.type === 'date') {
          const vals = cloned[g.id] || [];
          if (vals.length > 0) {
            const val = vals[0];
            if (['today', '7days', '30days', 'all'].includes(val)) {
              presets[g.id] = val as any;
            } else if (val.startsWith('custom:')) {
              presets[g.id] = 'custom';
              const parts = val.replace('custom:', '').split('_to_');
              fromDates[g.id] = parts[0] || '';
              toDates[g.id] = parts[1] || '';
            } else {
              presets[g.id] = 'all';
            }
          } else {
            presets[g.id] = 'all';
          }
        }
      }
      this.datePresets.set(presets);
      this.fromDate.set(fromDates);
      this.toDate.set(toDates);
    }

    const exp = { ...this.expandedGroups() };
    this.groups().forEach((g, idx) => {
      if (exp[g.id] === undefined) {
        exp[g.id] = g.isExpanded !== undefined ? g.isExpanded : idx === 0;
      }
    });
    this.expandedGroups.set(exp);
  }

  toggleGroup(groupId: string): void {
    const isCurrentlyExpanded = !!this.expandedGroups()[groupId];
    const newMap: Record<string, boolean> = {};
    if (!isCurrentlyExpanded) {
      newMap[groupId] = true;
    }
    this.expandedGroups.set(newMap);
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

  toggleOption(group: FilterGroup, value: string): void {
    const groupId = group.id;
    this.selectedFilters.update((state) => {
      const current = state[groupId] || [];
      let updated: string[];
      if (group.singleSelect) {
        if (current.includes(value)) {
          updated = [];
        } else {
          updated = [value];
        }
      } else {
        if (current.includes(value)) {
          updated = current.filter((v) => v !== value);
        } else {
          updated = [...current, value];
        }
      }
      return {
        ...state,
        [groupId]: updated,
      };
    });
  }

  selectDatePreset(groupId: string, preset: 'today' | '7days' | '30days' | 'all'): void {
    this.activeDatePicker.set(null);
    this.datePresets.update((map) => ({ ...map, [groupId]: preset }));
    this.fromDate.update((map) => ({ ...map, [groupId]: '' }));
    this.toDate.update((map) => ({ ...map, [groupId]: '' }));

    this.selectedFilters.update((state) => {
      if (preset === 'all') {
        const next = { ...state };
        delete next[groupId];
        return next;
      }
      return {
        ...state,
        [groupId]: [preset],
      };
    });
  }

  getDateVal(groupId: string, field: 'from' | 'to'): string {
    return (field === 'from' ? this.fromDate() : this.toDate())[groupId] || '';
  }

  toggleCalendar(groupId: string, field: 'from' | 'to', event: MouseEvent): void {
    event.stopPropagation();
    const current = this.activeDatePicker();
    if (current && current.groupId === groupId && current.field === field) {
      this.activeDatePicker.set(null);
    } else {
      const val = this.getDateVal(groupId, field);
      const parts = val ? val.split('-') : [];
      this.currentViewMonth.set(
        parts.length === 3 ? new Date(+parts[0], +parts[1] - 1, 1) : new Date(),
      );
      this.activeDatePicker.set({ groupId, field });
    }
  }

  prevMonth(event: MouseEvent): void {
    event.stopPropagation();
    const current = this.currentViewMonth();
    this.currentViewMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth(event: MouseEvent): void {
    event.stopPropagation();
    const current = this.currentViewMonth();
    this.currentViewMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  getCalendarDays(groupId: string, field: 'from' | 'to'): CalendarDay[] {
    const view = this.currentViewMonth();
    const year = view.getFullYear();
    const month = view.getMonth();
    const selectedDateStr = this.getDateVal(groupId, field);

    const today = new Date();
    const toIsoDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = toIsoDate(today);

    const startingDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Previous month trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      const dateString = toIsoDate(date);
      days.push({
        date,
        dateString,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        isSelected: dateString === selectedDateStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateString = toIsoDate(date);
      days.push({
        date,
        dateString,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
        isSelected: dateString === selectedDateStr,
      });
    }

    // Next month leading days (fill 35 or 42 cells)
    const totalSlots = startingDayOfWeek + daysInMonth <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      const dateString = toIsoDate(date);
      days.push({
        date,
        dateString,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        isSelected: dateString === selectedDateStr,
      });
    }

    return days;
  }

  selectCalendarDate(
    groupId: string,
    field: 'from' | 'to',
    dateStr: string,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.onDateChange(groupId, field, dateStr);
    this.activeDatePicker.set(null);
  }

  selectCalendarToday(groupId: string, field: 'from' | 'to', event: MouseEvent): void {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.selectCalendarDate(groupId, field, todayStr, event);
  }

  onDateChange(groupId: string, field: 'from' | 'to', date: string): void {
    const targetSignal = field === 'from' ? this.fromDate : this.toDate;
    targetSignal.update((map) => ({ ...map, [groupId]: date }));
    this.datePresets.update((map) => ({ ...map, [groupId]: 'custom' }));
    this.syncCustomDate(groupId);
  }

  private syncCustomDate(groupId: string): void {
    const from = this.fromDate()[groupId] || '';
    const to = this.toDate()[groupId] || '';

    this.selectedFilters.update((state) => {
      if (!from && !to) {
        const next = { ...state };
        delete next[groupId];
        return next;
      }
      return {
        ...state,
        [groupId]: [`custom:${from}_to_${to}`],
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
    this.datePresets.set({});
    this.fromDate.set({});
    this.toDate.set({});
    this.activeDatePicker.set(null);
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
