export type OnboardingStep = 1|2|3|4|5
export type SubscriptionChoice = 2|5|9
export type SubscriptionLabel = '0-3'|'4-6'|'7+'
export type ConversionType = 'bank'|'pdf'
export interface SimulationData { unused: number; hikesCost: number; monthlyLoss: number; annualLoss: number; label: string }
export interface OnboardingState { step: OnboardingStep; estimatedSubscriptions: SubscriptionChoice|null; choiceLabel: SubscriptionLabel|null; simulation: SimulationData|null; leadId: string|null; email: string; conversionType: ConversionType|null }
export interface Lead { id: string; email: string; choice: ConversionType; estimated_subscriptions: number; monthly_loss: number; annual_loss: number; created_at: string }
export type UploadStatus = 'pending'|'processing'|'done'|'error'
export interface Transaction { id: string; upload_id: string; date: string; amount: number; label: string; normalized_label: string; merchant: string; category: string }
export interface Subscription { id: string; upload_id: string; merchant: string; category: string; monthly_cost: number; frequency: string; occurrences: number; confidence: number; score_useless: number; risk_level: string; why: string; first_seen: string; last_seen: string }
export interface Insight { id: string; upload_id: string; total_subscriptions: number; unused_estimated: number; monthly_loss: number; annual_loss: number; serein_index: number; created_at: string }
export interface AnalysisResult { insight: Omit<Insight,'id'|'upload_id'|'created_at'>; subscriptions: Omit<Subscription,'id'|'upload_id'>[] }
export interface ApiSuccess<T> { success: true; data: T }
export interface ApiError { success: false; error: string }
export type ApiResponse<T> = ApiSuccess<T>|ApiError
