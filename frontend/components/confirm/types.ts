import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'primary' | 'success' | 'warning';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: LucideIcon;
  content?: ReactNode;
}

export interface ConfirmActionOptions extends ConfirmOptions {
  action: () => void | Promise<void>;
}
