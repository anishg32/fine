# Fyza — Intelligent Personal Finance Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=flat&logo=firebase)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald)](LICENSE)

**Fyza** is a modern, high-precision personal finance and wealth management platform engineered for individuals who demand financial clarity. Built with a signature midnight emerald aesthetic, Fyza combines zero floating-point arithmetic precision, context-grounded AI analytics, interactive cash flow forecasting, subscription tracking, and strict Firebase Security Rules.

---

## 🌟 Core Highlights

- **Integer Minor-Unit Financial Engine:** All ledger calculations (transactions, budgets, savings goals, subscriptions, and forecasts) execute in integer minor currency units (paise/cents) to completely eliminate IEEE-754 floating-point drift.
- **Interactive Zero-Registration Demo:** Fully functional `/demo` playground allowing prospective users to test transaction entries, budget adjustments, custom goal deposits, and AI queries without an account.
- **Context-Grounded Fyza AI:** Personal financial assistant that calculates insights strictly from verified ledger facts—preventing hallucinations and distinguishing historical records from forward-looking guidance.
- **Multi-Scenario Cash Flow Forecasting:** 12-month forward-looking projections featuring Conservative, Expected, and Optimistic what-if simulations with configurable discretionary spending trims.
- **Recurring Expenses & Financial Calendar:** Automated recurring transaction lifecycle tracking, month-end billing boundary safety (leap-year clamping), and interactive monthly/weekly agenda calendars.
- **Fintech Security Architecture:** Multi-tenant Firestore schema protected by strict Security Rules, API abuse rate limits, prompt-injection defenses, and complete isolation of client ledger state.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 16.4](https://nextjs.org/) (App Router, Turbopack, Partial Prefetching) |
| **Frontend UI** | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), Radix UI primitives, Lucide Icons |
| **Animations & Data Viz** | [Framer Motion](https://www.framer.com/motion/), [Recharts](https://recharts.org/) |
| **Database & Auth** | [Firebase](https://firebase.google.com/) Authentication (Email/Password & Google Popup) & Cloud Firestore |
| **State Management** | Reactive client-side store with LocalStorage caching & cloud synchronization |
| **Form & Validations** | [Zod](https://zod.dev/), React Hook Form |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js:** v18.18.0 or newer (v20+ recommended)
- **npm:** v9.x or newer

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/anishg32/fine.git
cd fine
npm install
```

### 3. Environment Configuration
Copy the provided environment template:
```bash
cp .env.local.example .env.local
```
Configure your environment variables in `.env.local`:
```ini
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# AI Configuration (Optional: defaults to grounded deterministic fallback engine)
AI_API_KEY=your_ai_api_key_here
AI_API_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# App URL Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Fyza
```

### 4. Firestore Security Rules
Deploy Firestore security rules using the Firebase CLI or copy `firestore.rules` into the Firebase Console:
```bash
firebase deploy --only firestore:rules
```

### 5. Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Verification & Test Suites

Fyza includes automated verification scripts covering financial math, subscription lifecycles, AI forecasting, and database security:

```bash
# 1. Typecheck the entire codebase
npx tsc --noEmit

# 2. Run ESLint code quality audit
npm run lint

# 3. Unit test financial calculations & ledger arithmetic
npx tsx scripts/test-calculations.ts

# 4. Unit test subscription frequencies & calendar clamping
npx tsx scripts/test-subscriptions-calendar.ts

# 5. Unit test AI intelligence & what-if forecasting
npx tsx scripts/test-phase4-ai-forecast.ts

# 6. Audit security policies, RLS schemas & AI rate limiting
npx tsx scripts/test-phase5-security-audit.ts

# 7. Production build validation
npm run build
```

---

## 📁 Repository Structure

```
fine/
├── docs/                        # Audit reports & production checklists
│   ├── IMPROVEMENT_AUDIT.md     # Comprehensive repository improvement audit
│   ├── PHASE_5_FINAL_AUDIT.md   # Security and RLS audit report
│   └── PRODUCTION_LAUNCH_CHECKLIST.md
├── public/                      # Static branding assets & SVG icons
├── scripts/                     # Standalone verification test runners
│   ├── test-calculations.ts
│   ├── test-phase4-ai-forecast.ts
│   ├── test-phase5-security-audit.ts
│   └── test-subscriptions-calendar.ts
├── src/
│   ├── app/                     # Next.js App Router (pages & API routes)
│   │   ├── (public)/            # Landing, Login, Signup, Reset Password, Demo
│   │   ├── api/ai/chat/         # Rate-limited AI assistant endpoint
│   │   └── app/                 # Authenticated application shell
│   │       ├── accounts/        # Multi-account balances & ledger
│   │       ├── ai-assistant/    # Grounded AI chat interface
│   │       ├── analytics/       # Spending breakdowns & health score
│   │       ├── budgets/         # Zero-based budget caps & alerts
│   │       ├── calendar/        # Financial calendar & bill agenda
│   │       ├── forecast/        # What-if scenario simulator & runway
│   │       ├── goals/           # Target pacing & savings contribution
│   │       ├── reports/         # Exportable statements & printable audits
│   │       ├── settings/        # Currency, themes, backup & data controls
│   │       ├── subscriptions/   # Recurring bill management
│   │       └── transactions/    # Full ledger with search, category & date filters
│   ├── components/              # Radix & Tailwind UI component library
│   └── lib/                     # Financial calculations, store & Supabase client
└── supabase/                    # Schema definitions and RLS migrations
```

---

## 🔒 Security & Privacy Practices

- **Strict PostgreSQL RLS:** Every table enforces user isolation. Users cannot read, mutate, or delete records belonging to another tenant.
- **Client Ledger Isolation:** Demo mode runs strictly in memory and LocalStorage, preventing accidental writes to production user tables.
- **AI Route Abuse Protection:** In-memory sliding-window rate limiting (30 requests/minute per IP) with prompt-injection filtering and message length caps (1,000 characters).
- **Zero Credential Exposure:** Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`) are exclusively referenced in server route handlers and never bundled into client scripts.

---

## 📄 License
This project is licensed under the MIT License.
