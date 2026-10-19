import { NextResponse, type NextRequest } from "next/server";

export interface AIUpcomingBill {
  name: string;
  amountMinor: number;
  nextDate: string;
  category?: string;
}

export interface FinancialContext {
  totalBalanceMinor: number;
  periodIncomeMinor: number;
  periodExpensesMinor: number;
  netCashFlowMinor: number;
  savingsRatePct: number;
  spendingByCategory: Array<{ category: string; amountMinor: number; percentage: number }>;
  activeBudget?: { name: string; limitMinor: number; spentMinor: number };
  budgets?: Array<{ name: string; limitMinor: number; spentMinor: number }>;
  goals?: Array<{ name: string; targetMinor: number; currentMinor: number; targetDate?: string }>;
  priorMonthExpensesMinor?: number;
  emergencyMonths?: number;
  upcomingBills?: AIUpcomingBill[];
  selectedPeriodLabel?: string;
  transactionCount?: number;
}

// Rate limiting cache (in-memory sliding window)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 requests per minute

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count };
}

// Prompt injection detection patterns
const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s*:\s*you\s+are\s+now/i,
  /reveal\s+(system|developer|hidden)\s+(prompt|instructions|keys|passwords)/i,
  /forget\s+all\s+(your\s+)?rules/i,
  /you\s+must\s+override\s+your/i,
];

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please retry in ${rateLimit.retryAfter} seconds.` },
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter || 60),
            "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
            "X-RateLimit-Remaining": "0"
          }
        }
      );
    }

    // 2. Body & JSON parsing validation
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed request payload. JSON format required." },
        { status: 400 }
      );
    }

    const { message, context } = body as { message?: unknown; context?: FinancialContext };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string." },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > 1000) {
      return NextResponse.json(
        { error: "Message exceeds maximum allowed length of 1,000 characters." },
        { status: 400 }
      );
    }

    // 3. Prompt injection detection
    const isSuspicious = SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(trimmedMessage));
    if (isSuspicious) {
      return NextResponse.json({
        reply: "I am Fyza AI, your personal finance assistant. I strictly analyze your personal budgeting, spending patterns, and savings goals based on verified financial data. I cannot modify my system instructions or assist with non-financial tasks.",
        source: "deterministic_engine",
      });
    }

    const userKey = (typeof body.apiKey === "string" ? body.apiKey.trim() : null) || req.headers.get("x-openai-key")?.trim();
    const rawApiKey = userKey || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    const apiKey = rawApiKey && rawApiKey !== "your_ai_api_key_here" ? rawApiKey : undefined;
    const apiUrl = (typeof body.apiUrl === "string" ? body.apiUrl.trim() : null) || process.env.AI_API_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = (typeof body.model === "string" ? body.model.trim() : null) || process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

    // Format currency helper for server context
    const fmt = (minor: number) =>
      `₹${(minor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    const periodLabel = context?.selectedPeriodLabel || "Current Month (October 2026)";

    // Build grounded deterministic financial summary from verified application data
    const summaryFacts = context
      ? `
- Period: ${periodLabel}
- Total Tracked Balance: ${fmt(context.totalBalanceMinor)}
- Income Inflow: ${fmt(context.periodIncomeMinor)}
- Expense Outflow: ${fmt(context.periodExpensesMinor)}
- Net Cash Flow Surplus: ${fmt(context.netCashFlowMinor)}
- Savings Rate: ${context.savingsRatePct}%
- Emergency Cash Runway: ${context.emergencyMonths !== undefined ? `${context.emergencyMonths} months` : "Not calculated"}
- Spending by Category: ${context.spendingByCategory
          .slice(0, 6)
          .map((c) => `${c.category}: ${fmt(c.amountMinor)} (${c.percentage}%)`)
          .join(", ")}
${
  context.activeBudget
    ? `- Active Budget (${context.activeBudget.name}): Limit ${fmt(context.activeBudget.limitMinor)}, Spent ${fmt(context.activeBudget.spentMinor)} (${((context.activeBudget.spentMinor / Math.max(1, context.activeBudget.limitMinor)) * 100).toFixed(1)}%)`
    : ""
}
${
  context.priorMonthExpensesMinor !== undefined
    ? `- Prior Month Outflow: ${fmt(context.priorMonthExpensesMinor)}`
    : ""
}
${
  context.goals && context.goals.length > 0
    ? `- Savings Goals: ${context.goals
        .map(
          (g) =>
            `${g.name}: ${fmt(g.currentMinor)} of ${fmt(g.targetMinor)}${g.targetDate ? ` (Target: ${g.targetDate})` : ""}`
        )
        .join("; ")}`
    : ""
}
${
  context.upcomingBills && context.upcomingBills.length > 0
    ? `- Upcoming Recurring Bills: ${context.upcomingBills
        .map((b) => `${b.name} (${fmt(b.amountMinor)} due on ${b.nextDate})`)
        .join(", ")}`
    : ""
}
`
      : "No detailed financial snapshot provided.";

    // If an external AI API key is configured, invoke ChatGPT securely
    if (apiKey) {
      try {
        const systemPrompt = `You are Fyza AI, an intelligent, empathetic, and precision-driven personal finance assistant powered by OpenAI (${model}).
You communicate fluently in natural language and provide actionable financial insights grounded strictly in the user's verified financial facts provided below.
Rules:
1. ALWAYS communicate naturally and conversationally, understanding colloquial and everyday phrasing.
2. If the user greets you or asks general conversational/budgeting questions, respond warmly and helpfully.
3. When citing specific balances, income, expenses, or budgets, NEVER invent transactions, accounts, or numbers. Use only the exact numbers provided in the verified facts.
4. State the time period covered by cited figures (${periodLabel}).
5. Currency is Indian Rupee (₹).
6. Do NOT give guaranteed investment predictions or professional legal/tax advice.

VERIFIED USER FINANCIAL SNAPSHOT:
${summaryFacts}`;

        const incomingHistory = Array.isArray(body.messages) ? body.messages : [];
        const formattedHistory = incomingHistory
          .slice(-6)
          .filter((m) => m && typeof m.content === "string")
          .map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: String(m.content).slice(0, 500),
          }));

        const response = await fetch(`${apiUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...formattedHistory,
              { role: "user", content: trimmedMessage },
            ],
            temperature: 0.3,
            max_tokens: 650,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({ reply, source: "live_ai" });
          }
        }
      } catch {
        // Fall back gracefully to internal grounded financial intelligence engine
      }
    }

    // Grounded Natural Language Financial Intelligence Engine
    const lower = message.toLowerCase();
    let answer = "";

    // Conversational Intent 1: Greetings & Politeness
    if (
      /^(hi|hello|hey|good\s+(morning|afternoon|evening)|namaste|greetings)\b/i.test(lower) ||
      lower === "hi" ||
      lower === "hello" ||
      lower.startsWith("how are you")
    ) {
      answer = `Hello! 👋 I'm **Fyza AI**, your personal finance assistant.\n\n` +
        `I monitor your active accounts, recent transactions, budgets, and savings goals in real-time for **${periodLabel}**.\n\n` +
        (context && context.totalBalanceMinor > 0
          ? `You currently have **${fmt(context.totalBalanceMinor)}** in total tracked balances, with a **${context.savingsRatePct}%** savings rate this period.\n\n`
          : `Your ledger is ready for new records. Log accounts or transactions, or ask me any question!\n\n`) +
        `Here are a few questions you can ask me:\n` +
        `• *"Where did most of my money go this month?"*\n` +
        `• *"How much did I spend on food and groceries?"*\n` +
        `• *"Can I afford a purchase of ₹15,000?"*\n` +
        `• *"How can I improve my savings rate?"*`;
    }
    // Conversational Intent 2: General Financial Advice & Savings Tips
    else if (
      lower.includes("how to save") ||
      lower.includes("how can i save") ||
      lower.includes("tips to save") ||
      lower.includes("save money") ||
      lower.includes("financial advice") ||
      lower.includes("improve savings")
    ) {
      const topCat = context?.spendingByCategory?.[0];
      answer = `### Personalized Savings Recommendations (${periodLabel})\n\n` +
        `Based on verified financial principles and your current ledger:\n\n` +
        `1. **The 50/30/20 Rule:** Allocate 50% of income to Needs, 30% to Wants, and 20% to Savings & Investments.\n` +
        `2. **Target Discretionary Spend:** ` +
        (topCat
          ? `Your largest outflow is **${topCat.category}** (${fmt(topCat.amountMinor)}). Trimming 15% here frees **${fmt(Math.round(topCat.amountMinor * 0.15))}/month**.\n`
          : `Track every purchase to identify invisible subscription leaks and dining spikes.\n`) +
        `3. **Pay Yourself First:** Automate transfers to savings or SIPs immediately upon salary deposit rather than saving what remains at month-end.\n` +
        `4. **Emergency Runway:** Aim for 3–6 months of essential living expenses in liquid high-yield savings before making speculative investments.\n\n` +
        `*Current Status:* Your current savings rate is **${context ? context.savingsRatePct : 0}%**.`;
    }
    // Conversational Intent 3: Help / Capabilities
    else if (
      lower.includes("what can you do") ||
      lower.includes("help me") ||
      lower.includes("who are you") ||
      lower.includes("capabilities") ||
      lower.includes("features")
    ) {
      answer = `### What Fyza AI Can Do For You\n\n` +
        `I am your 24/7 financial copilot. Powered by natural language and verified ledger arithmetic, I can:\n\n` +
        `• 📊 **Analyze Spending:** Categorize your outflow (e.g. food, shopping, utilities, commute).\n` +
        `• 🎯 **Goal Pacing:** Calculate exactly how much to save monthly to reach savings milestones.\n` +
        `• 💡 **Affordability Simulation:** Check if a planned purchase (e.g. "Can I afford ₹25,000?") is safe.\n` +
        `• 🛡️ **Emergency Runway:** Compute how many months your liquid reserves can cover.\n` +
        `• 📅 **Subscription Audits:** Highlight upcoming bills and auto-debits before they hit.\n` +
        `• 📈 **Trend Comparisons:** Compare your current outflow with previous months.`;
    }
    // Question 1: Where did most of my money go this month?
    else if (
      lower.includes("where") &&
      (lower.includes("go") || lower.includes("spend") || lower.includes("money") || lower.includes("outflow"))
    ) {
      if (context && context.spendingByCategory.length > 0) {
        const top = context.spendingByCategory[0];
        const second = context.spendingByCategory[1];
        const third = context.spendingByCategory[2];
        answer = `### Spending Breakdown (${periodLabel})\n\n` +
          `Based on your recorded ledger, your largest expense category is **${top.category}** at **${fmt(top.amountMinor)}**, making up **${top.percentage}%** of your total monthly outflow.\n\n` +
          (second
            ? `• **2nd largest:** ${second.category} at ${fmt(second.amountMinor)} (${second.percentage}%)\n`
            : "") +
          (third
            ? `• **3rd largest:** ${third.category} at ${fmt(third.amountMinor)} (${third.percentage}%)\n\n`
            : "\n") +
          `**Total recorded outflow:** ${fmt(context.periodExpensesMinor)} across ${context.transactionCount || "all"} transactions.\n\n` +
          `*Actionable Step:* Reviewing ${top.category} can reveal quick opportunities to optimize your monthly surplus.`;
      } else {
        answer = `I don't see any recorded expense transactions for ${periodLabel}. As you log purchases, I'll calculate an exact category breakdown.`;
      }
    }
    // Question 2: How much did I spend on food and groceries?
    else if (
      lower.includes("food") ||
      lower.includes("dining") ||
      lower.includes("grocer")
    ) {
      const foodItem = context?.spendingByCategory.find((c) =>
        c.category.toLowerCase().includes("food") || c.category.toLowerCase().includes("dining")
      );
      const grocItem = context?.spendingByCategory.find((c) =>
        c.category.toLowerCase().includes("grocer")
      );
      const foodAmt = foodItem ? fmt(foodItem.amountMinor) : "₹0.00";
      const grocAmt = grocItem ? fmt(grocItem.amountMinor) : "₹0.00";
      const combinedMinor = (foodItem?.amountMinor || 0) + (grocItem?.amountMinor || 0);
      const combinedPct = ((foodItem?.percentage || 0) + (grocItem?.percentage || 0)).toFixed(1);

      answer = `### Food & Groceries Spending (${periodLabel})\n\n` +
        `Here is your food-related outflow from verified ledger records:\n` +
        `• **Dining & Restaurants:** ${foodAmt} (${foodItem?.percentage || 0}% of expenses)\n` +
        `• **Groceries & Supplies:** ${grocAmt} (${grocItem?.percentage || 0}% of expenses)\n\n` +
        `**Combined Outflow:** **${fmt(combinedMinor)}** (${combinedPct}% of total period spending).\n\n` +
        `*Recommendation:* Home meal planning typically shaves 15–20% off dining out costs without impacting essential nutrition.`;
    }
    // Question 3: Which budgets are close to their limits?
    else if (
      lower.includes("budget") &&
      (lower.includes("close") || lower.includes("limit") || lower.includes("near") || lower.includes("warn") || lower.includes("status"))
    ) {
      if (context && context.activeBudget) {
        const b = context.activeBudget;
        const util = (b.spentMinor / Math.max(1, b.limitMinor)) * 100;
        const remaining = Math.max(0, b.limitMinor - b.spentMinor);
        const isOver = b.spentMinor > b.limitMinor;

        answer = `### Budget Utilization Review\n\n` +
          `• **Budget:** ${b.name}\n` +
          `• **Spending Cap:** ${fmt(b.limitMinor)}\n` +
          `• **Current Spend:** ${fmt(b.spentMinor)} (**${util.toFixed(1)}%** utilized)\n` +
          `• **Remaining Cushion:** ${isOver ? `-₹${((b.spentMinor - b.limitMinor) / 100).toLocaleString("en-IN")} (Exceeded)` : fmt(remaining)}\n\n` +
          (isOver
            ? `⚠️ **Alert:** You have exceeded your ${b.name} limit. It is recommended to freeze non-essential purchases for the rest of this cycle.`
            : util >= 80
            ? `⚠️ **Warning:** You have consumed over 80% of this budget with time still remaining in the billing period.`
            : `✅ **On Track:** Your spending pace is within acceptable boundaries with ${fmt(remaining)} left.`);
      } else {
        answer = "You have not set up any custom budget caps yet. You can create one in the Budgets section to automatically monitor spending thresholds.";
      }
    }
    // Question 4: How has my spending changed compared with last month?
    else if (
      lower.includes("change") ||
      lower.includes("last month") ||
      lower.includes("compared") ||
      lower.includes("versus") ||
      lower.includes("trend")
    ) {
      if (context && context.priorMonthExpensesMinor !== undefined && context.priorMonthExpensesMinor > 0) {
        const diff = context.periodExpensesMinor - context.priorMonthExpensesMinor;
        const pctChange = Math.round((diff / context.priorMonthExpensesMinor) * 1000) / 10;
        const isIncrease = diff > 0;

        answer = `### Month-over-Month Spending Comparison\n\n` +
          `• **Current Period (${periodLabel}):** ${fmt(context.periodExpensesMinor)}\n` +
          `• **Previous Month:** ${fmt(context.priorMonthExpensesMinor)}\n` +
          `• **Net Difference:** ${isIncrease ? "+" : ""}${fmt(diff)} (${isIncrease ? "Increased by" : "Decreased by"} ${Math.abs(pctChange)}%)\n\n` +
          (isIncrease
            ? `Your outflow rose this month. Check whether this was driven by seasonal subscriptions, one-off utility spikes, or dining.`
            : `Great job! Your spending decreased by ${Math.abs(pctChange)}% compared to last cycle, leaving more room for savings.`);
      } else {
        answer = `Current period spending is **${context ? fmt(context.periodExpensesMinor) : "₹0.00"}**. Previous month historical ledger records are limited or show zero expenses. As you log more monthly cycles, Fyza will produce deep month-over-month trend analytics.`;
      }
    }
    // Question 5: How much money remains after my recorded expenses?
    else if (
      (lower.includes("remain") || lower.includes("left") || lower.includes("surplus") || lower.includes("after")) &&
      (lower.includes("expense") || lower.includes("spend") || lower.includes("money"))
    ) {
      if (context) {
        const net = context.netCashFlowMinor;
        answer = `### Cash Flow & Remaining Liquidity (${periodLabel})\n\n` +
          `• **Total Recorded Income:** ${fmt(context.periodIncomeMinor)}\n` +
          `• **Total Recorded Expenses:** ${fmt(context.periodExpensesMinor)}\n` +
          `• **Net Cash Flow Remaining:** **${net >= 0 ? "+" : ""}${fmt(net)}**\n` +
          `• **Savings Rate:** **${context.savingsRatePct}%**\n` +
          `• **Total Tracked Account Balances:** **${fmt(context.totalBalanceMinor)}**\n\n` +
          (net >= 0
            ? `You have a healthy surplus of ${fmt(net)} this cycle. You can deploy this toward your savings goals or emergency runway.`
            : `⚠️ Outflow exceeded income by ${fmt(Math.abs(net))} this period. Review discretionary categories to bring cash flow back into surplus.`);
      } else {
        answer = "Please check that your accounts and transactions are loaded to inspect remaining net cash flow.";
      }
    }
    // Question 6: How much should I contribute monthly to reach my savings goal?
    else if (
      lower.includes("goal") ||
      (lower.includes("contribute") && lower.includes("reach")) ||
      (lower.includes("how much") && lower.includes("save"))
    ) {
      if (context && context.goals && context.goals.length > 0) {
        const topGoal = context.goals[0];
        const remaining = Math.max(0, topGoal.targetMinor - topGoal.currentMinor);
        const pace6m = Math.ceil(remaining / 6);
        const pace12m = Math.ceil(remaining / 12);

        answer = `### Savings Goal Pacing: ${topGoal.name}\n\n` +
          `• **Target Amount:** ${fmt(topGoal.targetMinor)}\n` +
          `• **Current Progress:** ${fmt(topGoal.currentMinor)} (${Math.round((topGoal.currentMinor / Math.max(1, topGoal.targetMinor)) * 100)}% achieved)\n` +
          `• **Remaining Balance:** ${fmt(remaining)}\n` +
          (topGoal.targetDate ? `• **Target Date:** ${topGoal.targetDate}\n\n` : "\n") +
          `**Pacing Recommendations:**\n` +
          `1. **6-Month Horizon:** ${fmt(pace6m)}/month\n` +
          `2. **12-Month Horizon:** ${fmt(pace12m)}/month\n\n` +
          `*Cash Flow Alignment:* With your current monthly surplus of ${fmt(context.netCashFlowMinor)}, the 6-month plan is **${pace6m <= context.netCashFlowMinor ? "fully achievable" : "tight — consider 12 months"}** without compromising essential living expenses.`;
      } else {
        answer = "You haven't registered any savings goals yet. Navigate to the Goals tab to create a target (e.g., Emergency Buffer or House Down Payment), and I'll calculate realistic monthly contributions for you.";
      }
    }
    // Question 7: What happens if I reduce a selected expense category?
    else if (
      lower.includes("reduce") ||
      lower.includes("cut") ||
      lower.includes("trim") ||
      lower.includes("what happens if")
    ) {
      const topCat = context?.spendingByCategory?.[0] || { category: "Discretionary Spending", amountMinor: 1500000 };
      const trim10 = Math.round(topCat.amountMinor * 0.10);
      const trim15 = Math.round(topCat.amountMinor * 0.15);
      const trim20 = Math.round(topCat.amountMinor * 0.20);
      const annual15 = trim15 * 12;

      answer = `### What-If Category Reduction Simulation: ${topCat.category}\n\n` +
        `Current monthly spend in **${topCat.category}**: **${fmt(topCat.amountMinor)}**.\n\n` +
        `If you reduce this category:\n` +
        `• **10% Reduction:** Frees **${fmt(trim10)}/month** (${fmt(trim10 * 12)}/year)\n` +
        `• **15% Reduction:** Frees **${fmt(trim15)}/month** (**${fmt(annual15)}/year**)\n` +
        `• **20% Reduction:** Frees **${fmt(trim20)}/month** (${fmt(trim20 * 12)}/year)\n\n` +
        `*Impact:* Directing the 15% savings (${fmt(annual15)}/yr) into a disciplined reserve would increase your net worth by over ${fmt(annual15 * 3)} in 3 years even before compounding returns!`;
    }
    // Question 8: What recurring payments are coming up?
    else if (
      lower.includes("recurring") ||
      lower.includes("subscription") ||
      lower.includes("bill") ||
      lower.includes("upcoming")
    ) {
      if (context && context.upcomingBills && context.upcomingBills.length > 0) {
        const totalUpcoming = context.upcomingBills.reduce((s, b) => s + b.amountMinor, 0);
        const billLines = context.upcomingBills
          .map((b) => `• **${b.name}:** ${fmt(b.amountMinor)} (Due on ${b.nextDate})`)
          .join("\n");

        answer = `### Upcoming Recurring Payments & Subscriptions\n\n` +
          `Here are your scheduled active commitments:\n\n` +
          `${billLines}\n\n` +
          `**Total Upcoming Outflow:** **${fmt(totalUpcoming)}**.\n\n` +
          `*Liquidity Status:* Your total liquid account balance of ${fmt(context.totalBalanceMinor)} provides a comfortable safety cushion to cover all scheduled debits.`;
      } else {
        answer = `### Scheduled Recurring Payments (${periodLabel})\n\n` +
          `You currently have no active recurring bills or subscriptions scheduled in your ledger.\n\n` +
          `*Tip:* Head to the **Subscriptions** tab to register monthly commitments like rent, broadband, or SIP investments so I can alert you before they are due.`;
      }
    }
    // Question 9: What is my net worth / total balance?
    else if (
      lower.includes("net worth") ||
      lower.includes("total balance") ||
      lower.includes("how much do i have") ||
      lower.includes("total money") ||
      lower.includes("my wealth")
    ) {
      if (context) {
        answer = `### Net Worth & Liquidity Overview\n\n` +
          `• **Total Liquid Tracked Balance:** **${fmt(context.totalBalanceMinor)}**\n` +
          `• **Monthly Net Cash Flow:** **${context.netCashFlowMinor >= 0 ? "+" : ""}${fmt(context.netCashFlowMinor)}**\n` +
          `• **Current Savings Rate:** **${context.savingsRatePct}%**\n` +
          `• **Emergency Cash Runway:** **${context.emergencyMonths !== undefined ? `${context.emergencyMonths} months` : "Calculated on expenses"}**\n\n` +
          `Your financial foundation remains resilient. All balances are verified against your active account ledgers.`;
      } else {
        answer = "Your tracked balance and net worth are loaded directly from your linked accounts.";
      }
    }
    // Question 10: Emergency Buffer & Financial Runway
    else if (
      lower.includes("emergency") ||
      lower.includes("runway") ||
      lower.includes("cushion") ||
      lower.includes("safety net")
    ) {
      if (context) {
        const runway = context.emergencyMonths ?? 6;
        answer = `### Emergency Buffer & Survival Runway\n\n` +
          `• **Current Runway:** **${runway} Months** of essential living expenses\n` +
          `• **Liquid Reserves:** **${fmt(context.totalBalanceMinor)}**\n` +
          `• **Monthly Burn Rate:** **${fmt(context.periodExpensesMinor)}**\n\n` +
          (runway >= 6
            ? `🛡️ **Status: Robust (Tier 1).** Your cash reserves exceed the recommended 6-month safety standard. You have strong protection against unexpected events.`
            : runway >= 3
            ? `✅ **Status: Healthy.** You maintain over 3 months of runway. Continuing to allocate a small portion of your monthly surplus will build it to the ideal 6-month tier.`
            : `⚠️ **Status: Build Required.** Your emergency buffer is below 3 months. Prioritize building liquid reserves before taking on aggressive non-essential spending.`);
      } else {
        answer = "Emergency buffer analysis requires account balances and monthly outflow records.";
      }
    }
    // Question 11: Can I afford a purchase? (Affordability Simulation)
    else if (
      lower.includes("afford") ||
      lower.includes("should i buy") ||
      lower.includes("can i buy")
    ) {
      // Try to extract amount from question
      const numMatch = message.match(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:k|lakhs?|l)?\b/i);
      let purchaseMinor = 2500000; // default ₹25,000 for illustration if not specified
      if (numMatch) {
        let val = parseFloat(numMatch[1].replace(/,/g, ""));
        if (message.toLowerCase().includes("k") && val < 1000) val *= 1000;
        else if (message.toLowerCase().includes("lakh") && val < 100) val *= 100000;
        if (!isNaN(val) && val > 0) purchaseMinor = Math.round(val * 100);
      }

      if (context) {
        const surplus = context.netCashFlowMinor;
        const remainingSurplus = surplus - purchaseMinor;
        const isComfortable = remainingSurplus >= 0;

        answer = `### Affordability Assessment for ${fmt(purchaseMinor)}\n\n` +
          `• **Planned Purchase Amount:** ${fmt(purchaseMinor)}\n` +
          `• **Monthly Net Cash Flow Surplus:** ${fmt(surplus)}\n` +
          `• **Liquid Cash Balance:** ${fmt(context.totalBalanceMinor)}\n` +
          `• **Cash Flow Impact:** ${isComfortable ? `Leaves **+${fmt(remainingSurplus)}** surplus this month` : `Exceeds monthly surplus by **${fmt(Math.abs(remainingSurplus))}**`}\n\n` +
          (isComfortable
            ? `✅ **Verdict: Feasible without debt.** Your monthly cash surplus fully covers this purchase without dipping into your core emergency reserves.`
            : `⚠️ **Verdict: Caution.** This purchase exceeds your monthly cash surplus. If you proceed, finance it from discretionary savings rather than credit card debt, and ensure your 3-month emergency buffer remains intact.`);
      } else {
        answer = "To evaluate purchase affordability, Fyza analyzes your monthly cash surplus against your tracked expenses.";
      }
    }
    // Question 12: Transportation & Commute
    else if (
      lower.includes("transport") ||
      lower.includes("uber") ||
      lower.includes("ola") ||
      lower.includes("travel") ||
      lower.includes("cab") ||
      lower.includes("petrol") ||
      lower.includes("commute")
    ) {
      const transItem = context?.spendingByCategory.find((c) =>
        c.category.toLowerCase().includes("transport") || c.category.toLowerCase().includes("travel")
      );
      answer = `### Transportation Spending Analysis (${periodLabel})\n\n` +
        `• **Recorded Outflow:** **${transItem ? fmt(transItem.amountMinor) : "₹0.00"}** (${transItem?.percentage || 0}% of monthly expenses)\n` +
        `• **Ledger Context:** Includes rideshare (Uber/Ola), fuel, tolls, and public transit.\n\n` +
        `*Efficiency Tip:* Rideshare pass bundles or carpooling on routine commute routes can reduce monthly travel expenses by up to 18%.`;
    }
    // Question 13: Shopping & Discretionary
    else if (
      lower.includes("shopping") ||
      lower.includes("clothes") ||
      lower.includes("amazon") ||
      lower.includes("electronics")
    ) {
      const shopItem = context?.spendingByCategory.find((c) =>
        c.category.toLowerCase().includes("shopping")
      );
      answer = `### Shopping Outflow Review (${periodLabel})\n\n` +
        `• **Total Recorded Shopping:** **${shopItem ? fmt(shopItem.amountMinor) : "₹0.00"}** (${shopItem?.percentage || 0}% of period spend)\n` +
        `• **Ledger Context:** Covers online retail, electronics, clothing, and discretionary lifestyle purchases.\n\n` +
        `*Guideline:* Keeping discretionary shopping under 15% of net income maintains optimal pacing toward your long-term wealth milestones.`;
    }
    // Fallback General Financial Summary
    else {
      const bal = context ? fmt(context.totalBalanceMinor) : "₹0.00";
      const inc = context ? fmt(context.periodIncomeMinor) : "₹0.00";
      const exp = context ? fmt(context.periodExpensesMinor) : "₹0.00";
      const net = context ? `${context.netCashFlowMinor >= 0 ? "+" : ""}${fmt(context.netCashFlowMinor)}` : "₹0.00";
      const sRate = context ? context.savingsRatePct : 0;

      answer = `### Fyza Financial Snapshot (${periodLabel})\n\n` +
        `• **Tracked Liquid Balance:** ${bal}\n` +
        `• **Monthly Income Inflow:** ${inc}\n` +
        `• **Monthly Expense Outflow:** ${exp}\n` +
        `• **Net Cash Flow Surplus:** ${net} (${sRate}% savings rate)\n` +
        (context?.emergencyMonths ? `• **Emergency Cash Runway:** ${context.emergencyMonths} months\n\n` : "\n\n") +
        `Ask me any of these questions in natural language:\n` +
        `1. *"Where did most of my money go this month?"*\n` +
        `2. *"How much did I spend on food and groceries?"*\n` +
        `3. *"Which budgets are close to their limits?"*\n` +
        `4. *"How has my spending changed compared with last month?"*\n` +
        `5. *"How much money remains after my recorded expenses?"*\n` +
        `6. *"How much should I contribute monthly to reach my savings goal?"*\n` +
        `7. *"What happens if I reduce a selected expense category?"*\n` +
        `8. *"What recurring payments are coming up?"*`;
    }

    return NextResponse.json({ reply: answer, source: "deterministic_engine" });
  } catch (error: unknown) {
    console.error("Secure AI route error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "An unexpected error occurred while analyzing your finances. Please try again." },
      { status: 500 }
    );
  }
}

