// ─── ONBOARDING ────────────────────────────────────────────────────────────
export type OnboardingStep = 1 | 2 | 3 | 4 | 5

export type SubscriptionChoice = 2 | 5 | 9
export type SubscriptionLabel = '0–3' | '4–6' | '7+'
export type ConversionType = 'bank' | 'pdf'

export interface SimulationData {
  unused: number
  hikesCost: number
  monthlyLoss: number
  annualLoss: number
  label: string
}

export interface OnboardingState {
  step: OnboardingStep
  estimatedSubscriptions: SubscriptionChoice | null
  choiceLabel: SubscriptionLabel | null
  simulation: SimulationData | null
  leadId: string | null
  email: string
  conversionType: ConversionType | null
}

// ─── LEAD ──────────────────────────────────────────────────────────────────
export interface Lead {
  id: string
  email: string
  choice: ConversionType
  estimated_subscriptions: number
  monthly_loss: number
  annual_loss: number
  created_at: string
}

export interface CreateLeadInput {
  email: string
  choice: ConversionType
  estimated_subscriptions: number
  monthly_loss: number
  annual_loss: number
}

// ─── UPLOAD ────────────────────────────────────────────────────────────────
export type UploadStatus = 'pending' | 'processing' | 'done' | 'error'

export interface Upload {
  id: string
  lead_id: string
  file_path: string
  status: UploadStatus
  result: AnalysisResult | null
  created_at: string
}

// ─── TRANSACTION ───────────────────────────────────────────────────────────
export interface Transaction {
  id: string
  upload_id: string
  date: string
  amount: number
  label: string
  normalized_label: string
  merchant: string
  category: TransactionCategory
}

export type TransactionCategory =
  | 'streaming'
  | 'saas'
  | 'telecom'
  | 'insurance'
  | 'fitness'
  | 'utility'
  | 'press'
  | 'other'

// ─── SUBSCRIPTION ──────────────────────────────────────────────────────────
export type RiskLevel = 'low' | 'medium' | 'high'
export type Frequency = 'weekly' | 'monthly' | 'annual'

export interface Subscription {
  id: string
  upload_id: string
  merchant: string
  category: TransactionCategory
  monthly_cost: number
  frequency: Frequency
  occurrences: number
  confidence: number
  score_useless: number
  risk_level: RiskLevel
  why: string
  first_seen: string
  last_seen: string
}

// ─── INSIGHT ───────────────────────────────────────────────────────────────
export interface Insight {
  id: string
  upload_id: string
  total_subscriptions: number
  unused_estimated: number
  monthly_loss: number
  annual_loss: number
  serein_index: number
  created_at: string
}

// ─── ANALYSIS RESULT ───────────────────────────────────────────────────────
export interface AnalysisResult {
  insight: Omit<Insight, 'id' | 'upload_id' | 'created_at'>
  subscriptions: Omit<Subscription, 'id' | 'upload_id'>[]
}

// ─── API ───────────────────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
