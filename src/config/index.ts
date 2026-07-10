// ─── APP CONFIG ────────────────────────────────────────────────────────────
export const APP_CONFIG = {
  name: 'Serein',
  tagline: 'Vos pertes invisibles, révélées.',
  url: process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://serein.app',
} as const

// ─── SIMULATION TABLE ──────────────────────────────────────────────────────
export const SIM_TABLE = {
  2: { unused: 1, hikesCost: 6,  monthlyLoss: 17,  annualLoss: 208,  label: '0–3' },
  5: { unused: 2, hikesCost: 11, monthlyLoss: 34,  annualLoss: 406,  label: '4–6' },
  9: { unused: 3, hikesCost: 16, monthlyLoss: 51,  annualLoss: 612,  label: '7+'  },
} as const

// ─── RATE LIMITING ─────────────────────────────────────────────────────────
export const RATE_LIMIT = {
  leads:    { requests: 5,  windowMs: 60_000 },
} as const

// ─── SCORING ───────────────────────────────────────────────────────────────
export const SCORING = {
  threshold: {
    useless: 60,   // score above this = probably useless
    highCost: 15,  // monthly cost above this = risk factor
    oldMonths: 6,  // subscription older than this = risk factor
  },
  weights: {
    age:       30,
    duplicate: 25,
    highCost:  20,
    lowUsage:  25,
  },
} as const
