-- ============================================================
-- FYZA PHASE 4 MIGRATION: FINANCIAL INTELLIGENCE & FORECASTING
-- Migration: 20261015_phase4_financial_intelligence.sql
-- ============================================================

-- 1. Enhance ai_messages table to store audit trail & deterministic metadata
ALTER TABLE public.ai_messages
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'deterministic_engine' CHECK (source IN ('live_ai', 'deterministic_engine')),
    ADD COLUMN IF NOT EXISTS context_snapshot JSONB;

-- 2. Create smart_insights table for user spending insights & alerts
CREATE TABLE IF NOT EXISTS public.smart_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('category_dominance', 'period_comparison', 'unusual_transaction', 'budget_alert', 'savings_opportunity', 'recurring_commitment')),
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'positive')),
    title TEXT NOT NULL,
    explanation TEXT NOT NULL,
    actionable_step TEXT,
    amount BIGINT,
    percentage_change NUMERIC(5,2),
    comparison_period TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create what_if_simulations table for saved forecasting scenarios
CREATE TABLE IF NOT EXISTS public.what_if_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Forecast Scenario',
    starting_balance BIGINT NOT NULL,
    monthly_income BIGINT NOT NULL,
    essential_expenses BIGINT NOT NULL,
    discretionary_expenses BIGINT NOT NULL,
    discretionary_reduction_pct INTEGER NOT NULL DEFAULT 15 CHECK (discretionary_reduction_pct BETWEEN 0 AND 50),
    one_time_expenses BIGINT NOT NULL DEFAULT 0,
    duration_months INTEGER NOT NULL DEFAULT 12 CHECK (duration_months BETWEEN 3 AND 36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_created ON public.ai_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_smart_insights_user ON public.smart_insights(user_id, is_dismissed, created_at);
CREATE INDEX IF NOT EXISTS idx_what_if_simulations_user ON public.what_if_simulations(user_id);

-- 5. Row Level Security for new intelligence tables
ALTER TABLE public.smart_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.what_if_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own smart insights"
    ON public.smart_insights
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own what-if simulations"
    ON public.what_if_simulations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
