-- ============================================================
-- FYZA PHASE 3 MIGRATION: SUBSCRIPTIONS, RECURRING & CALENDAR
-- Migration: 20261015_phase3_subscriptions_calendar.sql
-- ============================================================

-- 1. Enhance recurring_transactions table
ALTER TABLE public.recurring_transactions
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'archived')),
    ADD COLUMN IF NOT EXISTS payment_method_desc TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_url TEXT,
    ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS last_paid_date DATE,
    ADD COLUMN IF NOT EXISTS last_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 2. Update recurring_transactions frequency check constraint to support biweekly, quarterly, custom
ALTER TABLE public.recurring_transactions
    DROP CONSTRAINT IF EXISTS recurring_transactions_frequency_check;

ALTER TABLE public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_frequency_check
    CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'));

-- 3. Create recurring_occurrences table for idempotent billing & payment tracking
CREATE TABLE IF NOT EXISTS public.recurring_occurrences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recurring_id UUID NOT NULL REFERENCES public.recurring_transactions(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    paid_date DATE,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'missed', 'skipped')),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_recurring_user_date_status ON public.recurring_transactions(user_id, next_date, status);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_user ON public.recurring_occurrences(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_key ON public.recurring_occurrences(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_rec_id ON public.recurring_occurrences(recurring_id);

-- 5. Row Level Security for occurrences table
ALTER TABLE public.recurring_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recurring occurrences"
    ON public.recurring_occurrences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
