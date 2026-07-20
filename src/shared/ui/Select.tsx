import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectOption } from '@/shared/types';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-secondary-700 mb-1">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full px-3 py-2 text-sm border rounded-lg bg-white text-secondary-900 appearance-none pr-9',
              'transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              error ? 'border-error-400 focus:ring-error-400' : 'border-secondary-300',
              className
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-secondary-500">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
