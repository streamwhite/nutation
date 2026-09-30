import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-sm',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
        success: 'border-emerald-600/30 bg-emerald-50 text-emerald-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type AlertProps = ComponentProps<'div'> & VariantProps<typeof alertVariants>;

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}
