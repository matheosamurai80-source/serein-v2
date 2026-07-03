import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Thème clair (charte de référence : crème / vert forêt / ambre) ──
        cream:    { DEFAULT: '#FCFAF5', 2: '#F5F1E9', 3: '#EDE7DA' },
        surface:  { DEFAULT: '#FFFFFF', 2: '#F7F4ED' },
        ink:      { DEFAULT: '#26302A' },
        moss:     { DEFAULT: '#375538', mid: '#4E7350' },
        sage:     { DEFAULT: '#557A59', light: '#6E946F', faint: 'rgba(85,122,89,0.10)' },
        amber:    { DEFAULT: '#B5713A', light: '#C98F52' },
        crimson:  { DEFAULT: '#B84B38', faint: 'rgba(184,75,56,0.08)' },
        // conservés pour compat (plus utilisés après bascule claire)
        night:    { DEFAULT: '#0A0B09', 2: '#111210', 3: '#181916', 4: '#1F201D' },
        warm:     '#F8F7F3',
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans:  ['Geist', 'system-ui', 'sans-serif'],
        mono:  ['Geist Mono', 'monospace'],
      },
      animation: {
        'fade-up':    'fadeUp 0.6s ease forwards',
        'pop-in':     'popIn 0.4s ease forwards',
        'scan-line':  'scanLine 3s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2.4s ease-out infinite',
        'float':      'floatY 4s ease-in-out infinite',
        'blink':      'blink 2.2s ease-in-out infinite',
        'count-up':   'countUp 0.5s 0.1s ease both',
      },
      keyframes: {
        fadeUp:    { from: { opacity:'0', transform:'translateY(22px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        popIn:     { '0%': { opacity:'0', transform:'scale(0.9) translateY(12px)' }, '100%': { opacity:'1', transform:'scale(1) translateY(0)' } },
        scanLine:  { '0%': { top:'-3px', opacity:'1' }, '100%': { top:'105%', opacity:'0' } },
        pulseRing: { '0%': { transform:'scale(1)', opacity:'0.5' }, '100%': { transform:'scale(2)', opacity:'0' } },
        floatY:    { '0%,100%': { transform:'translateY(0)' }, '50%': { transform:'translateY(-7px)' } },
        blink:     { '0%,100%': { opacity:'1' }, '50%': { opacity:'0.3' } },
        countUp:   { from: { opacity:'0', transform:'translateY(10px)' }, to: { opacity:'1', transform:'translateY(0)' } },
      },
      borderRadius: { lg: '1rem', md: '0.75rem', sm: '0.5rem' },
    },
  },
  plugins: [],
}
export default config
