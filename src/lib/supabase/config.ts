// ─── PROJET SUPABASE OFFICIEL — SOURCE DE VÉRITÉ UNIQUE ─────────────────────
// Constat du 2026-07-05 : les variables d'environnement configurées dans le
// tableau de bord Vercel pointaient encore vers l'ANCIEN projet Supabase
// (oujdbevbgqntkousvsms, itération abandonnée) et écrasaient .env.production.
// Résultat en ligne : sessions fantômes, ajouts d'engagements en échec.
// Ces valeurs sont donc inscrites ici, dans le code : la clé « anon » est
// PUBLIQUE par conception (protégée par les règles RLS), et plus aucun
// réglage d'hébergeur ne peut casser la connexion.
// La clé secrète service_role, elle, reste UNIQUEMENT en variable
// d'environnement (jamais dans le code).

export const SUPABASE_URL = 'https://xfcrryjhxqjdkzsymlro.supabase.co'

export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmY3JyeWpoeHFqZGt6c3ltbHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDA3NTUsImV4cCI6MjA5MzgxNjc1NX0.5kBWzDomeqUfwZjQ-UhuOExK5ZWPMDATxXtqtKWSlnU'
