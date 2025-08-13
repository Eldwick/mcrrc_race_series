import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  size?: 'sm' | 'md';
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium transition-colors',
          {
            // Variants
            'bg-gray-100 text-gray-800': variant === 'default',
            'bg-slate-100 text-slate-800': variant === 'secondary',
            'bg-green-100 text-green-800': variant === 'success',
            'bg-yellow-100 text-yellow-800': variant === 'warning',
            'bg-red-100 text-red-800': variant === 'destructive',
            'border border-gray-300 text-gray-700': variant === 'outline',
            
            // Sizes
            'px-2 py-1 text-xs rounded': size === 'sm',
            'px-3 py-1.5 text-sm rounded-md': size === 'md',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
