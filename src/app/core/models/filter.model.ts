export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  title: string;
  searchable?: boolean;
  isExpanded?: boolean;
  searchQuery?: string;
  options: FilterOption[];
}

export type ActiveFilterState = Record<string, string[]>;
