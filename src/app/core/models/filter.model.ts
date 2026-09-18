export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  title: string;
  type?: 'checkbox' | 'date';
  searchable?: boolean;
  isExpanded?: boolean;
  searchQuery?: string;
  singleSelect?: boolean;
  options: FilterOption[];
}

export type ActiveFilterState = Record<string, string[]>;
