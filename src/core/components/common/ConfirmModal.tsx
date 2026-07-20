// src/core/components/common/ConfirmModal.tsx

import { cn } from '@/lib/utils';
import { TriangleAlert, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  title = 'Confirmer',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: { 
      iconBg: 'bg-red-100', 
      iconColor: 'text-red-600', 
      buttonBg: 'bg-red-500 hover:bg-red-600',
      buttonFocus: 'focus:ring-red-500'
    },
    warning: { 
      iconBg: 'bg-amber-100', 
      iconColor: 'text-amber-600', 
      buttonBg: 'bg-amber-500 hover:bg-amber-600',
      buttonFocus: 'focus:ring-amber-500'
    },
    info: { 
      iconBg: 'bg-blue-100', 
      iconColor: 'text-blue-600', 
      buttonBg: 'bg-blue-500 hover:bg-blue-600',
      buttonFocus: 'focus:ring-blue-500'
    },
  };

  const styles = variantStyles[variant];
  const Icon = variant === 'danger' ? TriangleAlert : AlertCircle;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-start gap-3 mb-5">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', styles.iconBg)}>
            <Icon size={18} className={styles.iconColor} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{title}</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2',
              styles.buttonBg,
              styles.buttonFocus
            )}
          >
            {loading ? 'Chargement...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}