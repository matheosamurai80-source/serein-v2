-- ═══════════════════════════════════════════
-- SEREIN — Database Schema
-- ═══════════════════════════════════════════

-- ── LEADS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  email                   TEXT NOT NULL,
  choice                  TEXT CHECK (choice IN ('bank', 'pdf')) NOT NULL,
  estimated_subscriptions INT NOT NULL DEFAULT 0,
  monthly_loss            NUMERIC(8,2) NOT NULL DEFAULT 0,
  annual_loss             NUMERIC(8,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_all_leads" ON public.leads;
CREATE POLICY "service_all_leads" ON public.leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── UPLOADS ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.uploads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  lead_id     UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  file_size   INT,
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending','processing','done','error')) NOT NULL,
  error_msg   TEXT,
  result      JSONB
);

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_all_uploads" ON public.uploads;
CREATE POLICY "service_all_uploads" ON public.uploads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── TRANSACTIONS ───────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id         UUID REFERENCES public.uploads(id) ON DELETE CASCADE NOT NULL,
  date              DATE NOT NULL,
  amount            NUMERIC(10,2) NOT NULL,
  label             TEXT NOT NULL,
  normalized_label  TEXT NOT NULL,
  merchant          TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'other'
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_all_transactions" ON public.transactions;
CREATE POLICY "service_all_transactions" ON public.transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── SUBSCRIPTIONS ──────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id     UUID REFERENCES public.uploads(id) ON DELETE CASCADE NOT NULL,
  merchant      TEXT NOT NULL,
  category      TEXT NOT NULL,
  monthly_cost  NUMERIC(8,2) NOT NULL,
  frequency     TEXT CHECK (frequency IN ('weekly','monthly','annual')) NOT NULL,
  occurrences   INT NOT NULL DEFAULT 1,
  confidence    NUMERIC(3,2) NOT NULL DEFAULT 0,
  score_useless INT NOT NULL DEFAULT 0 CHECK (score_useless BETWEEN 0 AND 100),
  risk_level    TEXT CHECK (risk_level IN ('low','medium','high')) NOT NULL,
  why           TEXT NOT NULL,
  first_seen    DATE,
  last_seen     DATE
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_all_subscriptions" ON public.subscriptions;
CREATE POLICY "service_all_subscriptions" ON public.subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── INSIGHTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.insights (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  upload_id           UUID REFERENCES public.uploads(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_subscriptions INT NOT NULL DEFAULT 0,
  unused_estimated    INT NOT NULL DEFAULT 0,
  monthly_loss        NUMERIC(8,2) NOT NULL DEFAULT 0,
  annual_loss         NUMERIC(8,2) NOT NULL DEFAULT 0,
  serein_index        INT NOT NULL DEFAULT 100 CHECK (serein_index BETWEEN 0 AND 100)
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_all_insights" ON public.insights;
CREATE POLICY "service_all_insights" ON public.insights
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── INDEXES ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_lead ON public.uploads(lead_id);
CREATE INDEX IF NOT EXISTS idx_transactions_upload ON public.transactions(upload_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_upload ON public.subscriptions(upload_id);
CREATE INDEX IF NOT EXISTS idx_insights_upload ON public.insights(upload_id);

-- ── STORAGE ────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "service_storage_pdfs" ON storage.objects;
CREATE POLICY "service_storage_pdfs" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'pdfs')
  WITH CHECK (bucket_id = 'pdfs');
