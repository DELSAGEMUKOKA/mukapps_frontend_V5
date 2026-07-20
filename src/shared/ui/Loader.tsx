import { cn } from '@/lib/utils';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className }: Props) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' };
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-secondary-200 border-t-primary-600',
        sizes[size],
        className
      )}
    />
  );
}

export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <LoadingSpinner size="lg" />
      {message && <p className="text-sm text-secondary-500">{message}</p>}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-secondary-500 font-medium">Chargement...</p>
      </div>
    </div>
  );
}
