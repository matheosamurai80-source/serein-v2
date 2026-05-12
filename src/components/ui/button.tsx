import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
const buttonVariants = cva('inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-full transition-all duration-200 disabled:opacity-50', { variants: { variant: { primary: 'bg-[#82A884] text-[#0A0B09] hover:bg-[#AECBB0]', secondary: 'bg-transparent text-[#AECBB0] border border-[#82A884]/30 hover:bg-white/5' }, size: { full: 'text-sm px-8 py-4 w-full max-w-[380px]' } }, defaultVariants: { variant: 'primary', size: 'full' } })
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { loading?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading, children, disabled, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled ?? loading} {...props}>
    {loading ? <span>...</span> : children}
  </button>))
Button.displayName = 'Button'
