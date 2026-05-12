export const SIM_TABLE = { 2: { unused: 1, hikesCost: 6, monthlyLoss: 17, annualLoss: 208, label: '0–3' }, 5: { unused: 2, hikesCost: 11, monthlyLoss: 34, annualLoss: 406, label: '4–6' }, 9: { unused: 3, hikesCost: 16, monthlyLoss: 51, annualLoss: 612, label: '7+' } } as const
export const UPLOAD_CONFIG = { maxSizeBytes: 10*1024*1024, allowedTypes: ['application/pdf'] as const, bucket: 'pdfs' } as const
export const RATEE_LIMIT = { leads: { requests: 5, windowMs: 60000 }, upload: { requests: 3, windowMs: 60000 }, analyze: { requests: 10, windowMs: 60000 } } as const
export const SCORING = { threshold: { useless: 60, highCost: 15, oldMonths: 6 }, weights: { age: 30, duplicate: 25, highCost: 20, lowUsage: 25 } } as const
