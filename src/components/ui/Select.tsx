import { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helper, id, placeholder, children, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              'flex h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
              className
            )}
            ref={ref}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {helper && !error && (
          <p className="text-xs text-gray-500">{helper}</p>
        )}
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
