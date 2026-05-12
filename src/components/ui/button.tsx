import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-sans font-semibold tracking-tight transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none rounded-full',
  {
    variants: {
      variant: {
        primary:   'bg-sage text-night-DEFAULT hover:bg-sage-light hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(130,168,132,.28)]',
        secondary: 'bg-transparent text-sage-light border border-sage/30 hover:border-sage hover:bg-sage/8',
        ghost:     'bg-transparent text-white/65 hover:text-white',
        danger:    'bg-crimson text-white hover:bg-crimson/90',
      },
      size: {
        sm: 'text-sm px-5 py-2.5',
        md: 'text-sm px-8 py-4',
        lg: 'text-base px-11 py-[18px]',
        full: 'text-sm px-8 py-4 w-full max-w-[380px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'full' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? (
        <span className="flex gap-1.5 items-center">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      ) : children}
    </button>
  )
)
Button.displayName = 'Button'
