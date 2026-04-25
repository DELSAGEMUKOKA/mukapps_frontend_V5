import { TriangleAlert as AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading,
}: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-full flex-shrink-0 ${variant === 'danger' ? 'bg-error-100' : variant === 'warning' ? 'bg-warning-100' : 'bg-blue-100'}`}>
            <AlertTriangle size={18} className={variant === 'danger' ? 'text-error-600' : variant === 'warning' ? 'text-warning-600' : 'text-blue-600'} />
          </div>
          <p className="text-sm text-secondary-700 pt-1">{message}</p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
