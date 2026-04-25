import type { ReactNode } from 'react';
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle, Info, TriangleAlert as AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

const config: Record<AlertVariant, { icon: typeof Info; classes: string; iconClass: string }> = {
  info: { icon: Info, classes: 'bg-blue-50 border-blue-200 text-blue-800', iconClass: 'text-blue-500' },
  success: { icon: CheckCircle, classes: 'bg-success-50 border-success-200 text-success-800', iconClass: 'text-success-500' },
  warning: { icon: AlertTriangle, classes: 'bg-warning-50 border-warning-200 text-warning-800', iconClass: 'text-warning-500' },
  error: { icon: AlertCircle, classes: 'bg-error-50 border-error-200 text-error-800', iconClass: 'text-error-500' },
};

export default function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  const { icon: Icon, classes, iconClass } = config[variant];

  return (
    <div className={cn('flex gap-3 p-4 rounded-lg border text-sm', classes, className)}>
      <Icon size={16} className={cn('flex-shrink-0 mt-0.5', iconClass)} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
