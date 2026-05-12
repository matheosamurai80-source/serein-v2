import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...i: ClassValue[]) { return twMerge(clsx(i)) }
export function isValidEmail(e: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) }
