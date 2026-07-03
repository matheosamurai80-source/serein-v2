'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ToastProps {
  message: string
  visible: boolean
  onHide: () => void
}

export function Toast({ message, visible, onHide }: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onHide, 3800)
    return () => clearTimeout(t)
  }, [visible, onHide])

  return (
    <div
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-[500]',
        'bg-night-4 border border-white/7 rounded-xl px-5 py-3',
        'text-sm text-white/65 text-center whitespace-nowrap max-w-[90vw]',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      )}
    >
      {message}
    </div>
  )
}

export function useToast() {
  const [state, setState] = useState({ message: '', visible: false })
  const show = (message: string) => setState({ message, visible: true })
  const hide = () => setState(s => ({ ...s, visible: false }))
  return { ...state, show, hide }
}
