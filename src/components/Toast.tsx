import { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast.duration !== Infinity) {
      const timer = setTimeout(onClose, toast.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onClose]);

  const bgColor = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    info: 'bg-blue-50',
  }[toast.type];

  const borderColor = {
    success: 'border-green-200',
    error: 'border-red-200',
    info: 'border-blue-200',
  }[toast.type];

  const textColor = {
    success: 'text-green-700',
    error: 'text-red-700',
    info: 'text-blue-700',
  }[toast.type];

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  }[toast.type];

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4 flex items-center gap-3 mb-3 animate-in fade-in slide-in-from-top duration-300`}>
      <Icon className={`w-5 h-5 ${textColor} flex-shrink-0`} />
      <p className={`text-sm font-medium ${textColor} flex-1`}>{toast.message}</p>
      <button
        onClick={onClose}
        className={`text-${toast.type === 'success' ? 'green' : toast.type === 'error' ? 'red' : 'blue'}-400 hover:text-${toast.type === 'success' ? 'green' : toast.type === 'error' ? 'red' : 'blue'}-600`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
}
