export type SnackbarType = 'success' | 'error' | 'info' | 'warning';

export interface SnackbarItem {
  id: string;
  type: SnackbarType;
  title?: string;
  message: string;
  duration?: number;
}
