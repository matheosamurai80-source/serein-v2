'use client'
import { useEffect, useState } from 'react'
export function Toast({ message, visible, onHide }: { message: string; visible: boolean; onHide: () => void }) {
  useEffect(() => { if (!visible) return; const t = setTimeout(onHide, 3800); return () => clearTimeout(t) }, [visible, onHide])
  return (<div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[500] bg-[#1F201D] border border-white/7 rounded-xl px-5 py-3 text-sm text-white/65 transition-all ${visible?'opacity-100':'opacity-0 pointer-events-none'}`}>{message}</div>)
}
export function useToast() {
  const [state, setState] = useState({ message: '', visible: false })
  return { ...state, show: (m: string) => setState({ message: m, visible: true }), hide: () => setState(s => ({ ...s, visible: false })) }
}
