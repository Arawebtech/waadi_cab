import React from 'react';
import { Eye, CheckCircle, XCircle, Upload, Edit, Ban, History, MapPin, UserPlus, X, Trash2, Loader2 } from 'lucide-react';

interface ActionBtnProps {
  onClick?: () => void;
  title: string;
  variant?: 'view' | 'approve' | 'reject' | 'reupload' | 'edit' | 'suspend' | 'history' | 'track' | 'assign' | 'cancel' | 'delete';
  disabled?: boolean;
  loading?: boolean;
}

const variants = {
  view: { icon: Eye, className: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50' },
  approve: { icon: CheckCircle, className: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50' },
  reject: { icon: XCircle, className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50' },
  reupload: { icon: Upload, className: 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50' },
  edit: { icon: Edit, className: 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50' },
  suspend: { icon: Ban, className: 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/50' },
  history: { icon: History, className: 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50' },
  track: { icon: MapPin, className: 'text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50' },
  assign: { icon: UserPlus, className: 'text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50' },
  cancel: { icon: X, className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50' },
  delete: { icon: Trash2, className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50' },
};

export const ActionButton: React.FC<ActionBtnProps> = ({ onClick, title, variant = 'view', disabled, loading }) => {
  const { icon: Icon, className } = variants[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`inline-flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${className} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
    </button>
  );
};

export const ActionGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-1">{children}</div>
);
