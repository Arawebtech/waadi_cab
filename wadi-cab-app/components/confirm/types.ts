import type { LucideIcon } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'primary' | 'success';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: LucideIcon;
}

export interface ConfirmActionOptions extends ConfirmOptions {
  action: () => void | Promise<void>;
}
