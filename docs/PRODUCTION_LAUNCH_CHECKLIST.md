# Fyza — Production Launch Checklist

This document is your step-by-step operational checklist before making Fyza publicly accessible to real users.

---

## 1. Supabase Production Project Setup

- [ ] **Create Production Supabase Project:**
  - Create a new project in the desired cloud region (e.g., `ap-south-1` Mumbai or closest to your primary user base).
- [ ] **Apply Master Database Schema:**
  - Open **SQL Editor** in your Supabase dashboard.
  - Copy and execute the contents of `supabase/schema.sql`.
  - Confirm execution succeeded without syntax errors.
- [ ] **Verify Row Level Security (RLS):**
  - Go to **Authentication** -> **Policies** or **Table Editor**.
  - Verify that all 16 tables have the green **RLS Enabled** indicator:
    - `profiles`, `accounts`, `categories`, `recurring_transactions`, `recurring_occurrences`, `transactions`, `budgets`, `budget_categories`, `goals`, `goal_contributions`, `notifications`, `ai_conversations`, `ai_messages`, `smart_insights`, `what_if_simulations`, `user_preferences`.
- [ ] **Confirm Auth Trigger:**
  - Verify `on_auth_user_created` trigger exists on `auth.users` to automatically create a profile and default user preferences on signup.
- [ ] **Enable Automated Database Backups:**
  - Verify Point-in-Time Recovery (PITR) or daily scheduled backups are enabled in Supabase Settings -> Database.

---

## 2. Environment Variables Configuration

Set these variables in your hosting environment (e.g., Vercel -> Project Settings -> Environment Variables):

- [ ] **`NEXT_PUBLIC_SUPABASE_URL`**: Your production Supabase project URL (`https://<project-ref>.supabase.co`).
- [ ] **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Your production Supabase public anonymous API key.
- [ ] **`AI_API_KEY`** *(Optional)*: OpenAI API key (or compatible LLM provider) if using live model completions. Leave blank to use Fyza's built-in deterministic calculation engine.
- [ ] **`AI_API_URL`** *(Optional)*: `https://api.openai.com/v1` (defaults to OpenAI).
- [ ] **`AI_MODEL`** *(Optional)*: `gpt-4o-mini` (or preferred model).
- [ ] **Verify Secret Insulation:**
  - Ensure `SUPABASE_SERVICE_ROLE_KEY` is **never** prefixed with `NEXT_PUBLIC_` and never committed to git.

---

## 3. Supabase Authentication & URL Configuration

- [ ] **Site URL:**
  - Set **Site URL** to `https://your-domain.com`.
- [ ] **Redirect URLs:**
  - Add the following redirect URLs under **Authentication** -> **URL Configuration**:
    - `https://your-domain.com/auth/callback`
    - `https://your-domain.com/login`
    - `https://your-domain.com/reset-password`
    - `https://your-domain.com/app`
- [ ] **Email Provider Settings:**
  - Configure custom SMTP (SendGrid, Resend, or AWS SES) for transactional emails so confirmation emails don't come from default rate-limited Supabase domains.
  - Customize email templates (Confirmation, Magic Link, Password Reset) with Fyza branding.

---

## 4. Hosting, Domain & DNS Setup

- [ ] **Deploy to Vercel / Cloud Provider:**
  - Connect your GitHub repository.
  - Framework Preset: **Next.js**.
  - Build Command: `npm run build`.
  - Install Command: `npm install`.
- [ ] **Custom Domain & SSL:**
  - Add your custom domain (e.g. `fyza.app` or `fine-wise.com`).
  - Configure DNS records (`A` and `CNAME`) as indicated by your hosting provider.
  - Verify SSL certificate issuance and HTTPS enforcement.
- [ ] **Security Headers:**
  - Ensure HSTS, X-Content-Type-Options, and Clickjacking protection headers are active.

---

## 5. Pre-Launch Smoke Test Flow

Run this test sequence using an isolated, non-production test account:

1. [ ] **Homepage & Public Demo:**
   - Visit `https://your-domain.com`. Verify dark/midnight theme, hero animations, and navigation.
   - Click **"Explore Interactive Demo"** and confirm sample transactions, zero-based budget sliders, and reset button work without errors.
2. [ ] **User Registration & Email Confirmation:**
   - Register a new test account at `/signup`.
   - Verify confirmation email delivery and click the verification link.
   - Verify redirection to `/app` (Dashboard Cockpit).
3. [ ] **Core Transactions & Balance Tracking:**
   - Add an initial Bank Account with an opening balance.
   - Record an Income transaction (e.g., Salary).
   - Record an Expense transaction (e.g., Rent).
   - Record an internal Transfer between accounts and confirm net worth remains unaffected.
4. [ ] **Budgeting & Savings Goals:**
   - Create a monthly budget and verify threshold progress bar calculations.
   - Create a savings goal and record a contribution.
5. [ ] **Recurring Subscriptions & Calendar:**
   - Add a monthly subscription with a renewal date.
   - Verify subscription appears on `/app/subscriptions` and in `/app/calendar`.
6. [ ] **AI Assistant & What-If Forecasting:**
   - Open `/app/ai-assistant` and ask a question. Verify grounded calculation response.
   - Open `/app/forecast` and toggle discretionary expense trimming.
7. [ ] **Account Deletion (Data Privacy Check):**
   - Go to Settings and test deleting the test account.
   - Verify all child records (transactions, accounts, budgets, goals) are deleted via cascading foreign keys.

---

## 6. Post-Launch Monitoring & Operational Safeguards

- [ ] **Error Tracking:**
  - Integrate Sentry or Vercel Analytics for real-time frontend and API exception reporting.
- [ ] **AI Rate Limiting Monitoring:**
  - Monitor `/api/ai/chat` request volumes to prevent unauthorized consumption.
- [ ] **Regular Backup Schedule:**
  - Confirm automated daily database backups are running in Supabase.
- [ ] **Disaster Recovery / Rollback Plan:**
  - Vercel allows instant 1-click rollback to any previous production deployment.
  - Supabase database snapshots can be restored within minutes via the dashboard.
