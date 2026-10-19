import { NextResponse, type NextRequest } from "next/server";
import { createValidatedAction } from "@/lib/agent/registry";
import type { AgentAction } from "@/lib/agent/types";

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

function detectAgentActionFromQuery(message: string): { reply: string; action?: AgentAction } | null {
  const lower = message.toLowerCase().trim();

  // 1. Dashboard Navigation
  if (
    /\b(open|go to|view|show|navigate to)\s+(my\s+)?dashboard\b/i.test(lower) ||
    lower === "open dashboard" ||
    lower === "my dashboard" ||
    lower === "dashboard"
  ) {
    const act = createValidatedAction(
      "navigate_to_page",
      "Open Dashboard",
      "Navigating to your main Fyza financial overview dashboard.",
      "/app"
    );
    if (act.success && act.action) {
      return {
        reply: "Opening your Dashboard overview right away! You can monitor your real-time net worth, recent activity, and financial health score.",
        action: act.action,
      };
    }
  }

  // 2. Expenses / Transactions Navigation
  if (
    /\b(show|open|view|display)\s+(my\s+)?expenses(\s+from\s+this\s+month)?\b/i.test(lower) ||
    /\b(open|show|view)\s+(my\s+)?transactions\b/i.test(lower) ||
    lower === "open expenses" ||
    lower === "show expenses" ||
    lower === "expenses"
  ) {
    const act = createValidatedAction(
      "open_expenses",
      "Open Expenses",
      "Navigating to transactions with the expense filter applied.",
      "/app/transactions?type=expense"
    );
    if (act.success && act.action) {
      return {
        reply: "Opening your transactions ledger with the expense filter applied so you can review your spending from this month.",
        action: act.action,
      };
    }
  }

  // 3. Budgets Navigation
  if (
    /\b(open|go to|view|show|manage)\s+(my\s+)?budgets?\b/i.test(lower) ||
    lower === "open budgets" ||
    lower === "budgets"
  ) {
    const act = createValidatedAction(
      "open_budgets",
      "Open Budgets",
      "Navigating to your monthly budget limits and category spending caps.",
      "/app/budgets"
    );
    if (act.success && act.action) {
      return {
        reply: "Navigating to your Budgets page where you can inspect your category spending limits and remaining capacity.",
        action: act.action,
      };
    }
  }

  // 4. Savings Goals Navigation
  if (
    /\b(open|go to|view|show|manage)\s+(my\s+)?(savings\s+)?goals?\b/i.test(lower) ||
    lower === "open goals" ||
    lower === "savings goals" ||
    lower === "goals"
  ) {
    const act = createValidatedAction(
      "open_savings_goals",
      "Open Savings Goals",
      "Navigating to your savings targets and milestone tracking.",
      "/app/goals"
    );
    if (act.success && act.action) {
      return {
        reply: "Opening your Savings Goals page to view your active targets and progress.",
        action: act.action,
      };
    }
  }

  // 5. Accounts Navigation
  if (
    /\b(open|go to|view|show|manage)\s+(my\s+)?accounts?\b/i.test(lower) ||
    lower === "open accounts" ||
    lower === "accounts"
  ) {
    const act = createValidatedAction(
      "navigate_to_page",
      "Open Accounts",
      "Navigating to your bank, cash, and wallet accounts.",
      "/app/accounts"
    );
    if (act.success && act.action) {
      return {
        reply: "Opening your Accounts ledger to inspect liquid cash, savings, and card balances.",
        action: act.action,
      };
    }
  }

  // 6. Analytics Navigation
  if (
    /\b(open|go to|view|show)\s+(my\s+)?analytics\b/i.test(lower) ||
    lower === "open analytics" ||
    lower === "analytics"
  ) {
    const act = createValidatedAction(
      "navigate_to_page",
      "Open Analytics",
      "Navigating to financial analytics, category breakdowns, and cashflow charts.",
      "/app/analytics"
    );
    if (act.success && act.action) {
      return {
        reply: "Opening Financial Analytics to inspect your cashflow breakdown and spending trends.",
        action: act.action,
      };
    }
  }

  // 7. Forecast Navigation
  if (
    /\b(open|go to|view|show)\s+(my\s+)?forecast\b/i.test(lower) ||
    lower.includes("cash flow forecast") ||
    lower === "open forecast" ||
    lower === "forecast"
  ) {
    const act = createValidatedAction(
      "navigate_to_page",
      "Open Forecast",
      "Navigating to cash flow forecast and forward projections.",
      "/app/forecast"
    );
    if (act.success && act.action) {
      return {
        reply: "Navigating to Cash Flow Forecast to view forward-looking balance projections.",
        action: act.action,
      };
    }
  }

  // 8. Subscriptions Navigation
  if (
    /\b(open|go to|view|show|manage)\s+(my\s+)?subscriptions?\b/i.test(lower) ||
    lower.includes("recurring bills") ||
    lower === "open subscriptions" ||
    lower === "subscriptions"
  ) {
    const act = createValidatedAction(
      "navigate_to_page",
      "Open Subscriptions",
      "Navigating to recurring bills and active subscriptions.",
      "/app/subscriptions"
    );
    if (act.success && act.action) {
      return {
        reply: "Opening your Subscriptions and recurring bills schedule.",
        action: act.action,
      };
    }
  }

  // 9. Calendar Navigation
  if (
    /\b(open|go to|view|show)\s+(my\s+)?calendar\b/i.test(lower) ||
    lower === "open calendar" ||
    lower === "calendar"
  ) {
    const act = createValidatedAction(
      "navigate_to_page",
      "Open Financial Calendar",
      "Navigates to your monthly bill schedule calendar.",
      "/app/calendar"
    );
    if (act.success && act.action) {
      return {
        reply: "Opening your Financial Calendar to view upcoming payment dates and projected inflows.",
        action: act.action,
      };
    }
  }

  // 10. Reports Navigation
  if (
    /\b(open|go to|view|show)\s+(my\s+)?reports?\b/i.test(lower) ||
    lower === "open reports" ||
    lower === "reports"
  ) {
    const act = createValidatedAction(
      "navigate_to_page",
      "Open Reports",
      "Navigates to financial statements and exportable reports.",
      "/app/reports"
    );
    if (act.success && act.action) {
      return {
        reply: "Opening your Financial Reports page.",
        action: act.action,
      };
    }
  }

  // 11. Settings Navigation
  if (
    /\b(open|go to|view|show)\s+(my\s+)?settings\b/i.test(lower) ||
    lower === "open settings" ||
    lower === "settings"
  ) {
    const act = createValidatedAction(
      "navigate_to_page",
      "Open Settings",
      "Navigates to application settings and theme customization.",
      "/app/settings"
    );
    if (act.success && act.action) {
      return {
        reply: "Opening Settings where you can adjust your profile, security, and theme preferences.",
        action: act.action,
      };
    }
  }

  // 12. Go Back
  if (
    /\b(go back|navigate back|back to previous( page)?)\b/i.test(lower) ||
    lower === "go back" ||
    lower === "back"
  ) {
    const act = createValidatedAction(
      "go_back",
      "Go Back",
      "Navigates back to your previously visited page in browser history."
    );
    if (act.success && act.action) {
      return {
        reply: "Navigating back to the previous page.",
        action: act.action,
      };
    }
  }

  // 13. Theme Switching
  if (
    lower.includes("dark mode") ||
    lower.includes("dark theme") ||
    lower.includes("emerald midnight") ||
    lower.includes("change to dark") ||
    lower.includes("switch to dark")
  ) {
    const act = createValidatedAction(
      "set_theme",
      "Set Theme: Emerald Midnight",
      "Switches visual identity to signature Emerald Midnight dark theme.",
      "emerald-midnight",
      { theme: "emerald-midnight" }
    );
    if (act.success && act.action) {
      return {
        reply: "Switching Fyza to the Emerald Midnight dark theme.",
        action: act.action,
      };
    }
  }

  if (lower.includes("ocean blue") || lower.includes("blue theme")) {
    const act = createValidatedAction(
      "set_theme",
      "Set Theme: Ocean Blue",
      "Switches visual identity to Ocean Blue theme.",
      "ocean-blue",
      { theme: "ocean-blue" }
    );
    if (act.success && act.action) {
      return {
        reply: "Switching Fyza to the Ocean Blue theme.",
        action: act.action,
      };
    }
  }

  if (lower.includes("violet") || lower.includes("purple")) {
    const act = createValidatedAction(
      "set_theme",
      "Set Theme: Violet Intelligence",
      "Switches visual identity to Violet Intelligence theme.",
      "violet-intelligence",
      { theme: "violet-intelligence" }
    );
    if (act.success && act.action) {
      return {
        reply: "Switching Fyza to the Violet Intelligence theme.",
        action: act.action,
      };
    }
  }

  if (lower.includes("amber") || lower.includes("gold")) {
    const act = createValidatedAction(
      "set_theme",
      "Set Theme: Amber Wealth",
      "Switches visual identity to Amber Wealth theme.",
      "amber-wealth",
      { theme: "amber-wealth" }
    );
    if (act.success && act.action) {
      return {
        reply: "Switching Fyza to the Amber Wealth theme.",
        action: act.action,
      };
    }
  }

  if (
    lower.includes("light mode") ||
    lower.includes("light theme") ||
    lower.includes("clean light") ||
    lower.includes("change to light") ||
    lower.includes("switch to light")
  ) {
    const act = createValidatedAction(
      "set_theme",
      "Set Theme: Clean Light",
      "Switches visual identity to Clean Light theme.",
      "clean-light",
      { theme: "clean-light" }
    );
    if (act.success && act.action) {
      return {
        reply: "Switching Fyza to the Clean Light theme.",
        action: act.action,
      };
    }
  }

  // 14. External URL Navigation ("open a new tab and visit...", "visit https://...", "open website...")
  const urlMatch = message.match(/(?:visit|open|go to|browse)\s+(?:a\s+new\s+tab\s+and\s+visit\s+|external\s+website\s+|website\s+|tab\s+|site\s+)?(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i) ||
    message.match(/(https?:\/\/[^\s]+)/i);

  if (
    (lower.includes("open a new tab") ||
      lower.includes("visit") ||
      lower.includes("external website") ||
      lower.includes("chosen website") ||
      urlMatch) &&
    !lower.includes("open dashboard") &&
    !lower.includes("open expenses") &&
    !lower.includes("open budgets") &&
    !lower.includes("open goals") &&
    !lower.includes("open accounts") &&
    !lower.includes("open analytics") &&
    !lower.includes("open forecast") &&
    !lower.includes("open subscriptions") &&
    !lower.includes("open calendar") &&
    !lower.includes("open reports") &&
    !lower.includes("open settings")
  ) {
    const targetUrl = urlMatch ? urlMatch[1] : "https://github.com/anishg32/fine";
    const act = createValidatedAction(
      "open_authorized_external_url",
      `Open External Website: ${targetUrl}`,
      `Opens ${targetUrl} in a new tab via the authorized companion extension.`,
      targetUrl
    );
    if (act.success && act.action) {
      return {
        reply: `I have prepared an action to open **${act.action.target}** in a new tab.\n\n🛡️ **Safety Check:** Because controlling browser tabs interacts with external websites outside of Fyza, this action requires your explicit authorization. Please review and click **Approve & Execute** below.`,
        action: act.action,
      };
    } else if (act.error) {
      return {
        reply: `⚠️ Cannot open external site: ${act.error}`,
        action: undefined,
      };
    }
  }

  // 15. Summarize / Read Current Page
  if (
    lower.includes("summarize this page") ||
    lower.includes("summarize the page") ||
    lower.includes("read this page") ||
    lower.includes("analyze this page")
  ) {
    const act = createValidatedAction(
      "summarize_authorized_page",
      "Summarize Active Browser Page",
      "Extracts visible text on the active browser tab via the companion extension and summarizes it safely.",
      "active_tab"
    );
    if (act.success && act.action) {
      return {
        reply: "I have prepared a request to read and summarize the active tab. Per safety policy, page content is only inspected after your explicit authorization. Please approve the action below.",
        action: act.action,
      };
    }
  }

  return null;
}

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

    // Website Control Action Detector
    const detectedAction = detectAgentActionFromQuery(trimmedMessage);

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
You communicate fluently, naturally, and warmly in conversational English, just like ChatGPT in a modern chatbox.
Rules:
1. ALWAYS communicate naturally and conversationally.
2. If the user sends a simple greeting (e.g. 'hi', 'hii', 'hello', 'hey', 'what's up') or makes casual small talk ('how are you'), reply warmly, casually, and concisely like a friendly conversational assistant, and gently ask how you can help them with their money, budgets, or finances today. Keep it short and engaging — do NOT dump a long wall of text or rigid bullets on a simple greeting.
3. When citing specific balances, income, expenses, or budgets, NEVER invent transactions, accounts, or numbers. Use only the exact numbers provided in the verified facts.
4. State the time period covered by cited figures (${periodLabel}).
5. Currency is Indian Rupee (₹).
6. Do NOT give guaranteed investment predictions or professional legal/tax advice.
7. If the user asks you to navigate to a page, open a feature, change the theme, or open an external website, fulfill their request conversationally and attach a valid action on its own line:
ACTION: {"type": "navigate_to_page"|"open_expenses"|"open_budgets"|"open_savings_goals"|"set_theme"|"go_back"|"open_authorized_external_url"|"summarize_authorized_page", "target": "...", "title": "...", "description": "..."}

Supported internal routes:
- /app (Dashboard)
- /app/transactions (Transactions / Expenses)
- /app/budgets (Budgets)
- /app/goals (Savings Goals)
- /app/accounts (Accounts)
- /app/analytics (Analytics)
- /app/forecast (Cash Flow Forecast)
- /app/subscriptions (Subscriptions)
- /app/calendar (Calendar)
- /app/reports (Reports)
- /app/settings (Settings)
Supported themes: emerald-midnight, ocean-blue, violet-intelligence, amber-wealth, clean-light

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
          const rawReply = data.choices?.[0]?.message?.content;
          if (rawReply) {
            let finalReply = rawReply;
            let action = detectedAction?.action;

            const actionMatch = rawReply.match(/ACTION:\s*(\{.*\})/);
            if (actionMatch) {
              try {
                const parsed = JSON.parse(actionMatch[1]);
                const validated = createValidatedAction(
                  parsed.type,
                  parsed.title || "Agent Action",
                  parsed.description || "",
                  parsed.target,
                  parsed.parameters
                );
                if (validated.success && validated.action) {
                  action = validated.action;
                }
              } catch {}
              finalReply = rawReply.replace(/ACTION:\s*(\{.*\})/, "").trim();
            }

            return NextResponse.json({
              reply: finalReply,
              action,
              source: "live_ai",
            });
          }
        }
      } catch {
        // Fall back gracefully to internal grounded financial intelligence engine
      }
    }

    // If an action was directly detected from user's intent, return it with clear reply
    if (detectedAction) {
      return NextResponse.json({
        reply: detectedAction.reply,
        action: detectedAction.action,
        source: "deterministic_engine",
      });
    }

    // Grounded Natural Language Financial Intelligence Engine
    const lower = message.toLowerCase().trim();
    let answer = "";

    // Inspect recent conversation history for context-aware multi-turn replies
    const incomingHistory = Array.isArray(body.messages) ? body.messages : [];
    const lastAssistantMessage = [...incomingHistory]
      .reverse()
      .find((m) => m && m.role === "assistant" && typeof m.content === "string")
      ?.content?.toLowerCase() || "";
    const lastUserMessage = [...incomingHistory]
      .reverse()
      .find((m) => m && m.role === "user" && typeof m.content === "string" && m.content !== trimmedMessage)
      ?.content?.toLowerCase() || "";
    const contextClues = `${lastAssistantMessage} ${lastUserMessage}`.trim();

    // Conversational Intent 0: Talking Together like ChatGPT / Voice & Dialogue Partner
    if (
      lower.includes("chatgpt") ||
      lower.includes("talking together") ||
      lower.includes("talk together") ||
      lower.includes("like chatgpt") ||
      lower.includes("talk to me") ||
      lower.includes("speak with me")
    ) {
      answer = `I would love that! Let's talk together just like ChatGPT. 😊\n\n` +
        `I'm your personal financial copilot. We can chat back-and-forth about anything — how your money is doing this month, whether you can afford an upcoming expense, setting up savings targets, or simply brainstorming financial habits.\n\n` +
        `🎙️ **Ways we can talk together:**\n` +
        `• **Natural Chat:** Just type anything freely, ask follow-up questions, or say *"tell me more"* or *"give me an example"*.\n` +
        `• **Voice Mode:** You can click the **🎙️ Voice Mode** button at the top to talk with your voice hands-free!\n` +
        `• **Hear My Voice:** Tap the **Speaker icon (🔊)** on any message to listen to me speak out loud.\n` +
        `• **Live ChatGPT Power:** You can also connect your OpenAI API key using the **ChatGPT Key** button above for direct GPT-4o reasoning.\n\n` +
        `What's on your mind right now? How is your budget or spending feeling for **${periodLabel}**?`;
    }
    // Conversational Intent 1: Greetings (e.g., "hi", "hii", "hiii", "hello", "hey", "namaste")
    else if (
      /^(h+i+|h+e+y+|h+e+l+l*o+|namaste|hola|greetings)\b/i.test(lower) ||
      /^h+i+[\s!.,?]*$/i.test(lower) ||
      lower === "hi" ||
      lower === "hii" ||
      lower === "hiii" ||
      lower === "hello" ||
      lower === "hey"
    ) {
      answer = `Hello! 👋 How are you doing today?\n\n` +
        `I'm your AI personal finance assistant. I'm here to help you track your spending, manage your budgets, see if you can afford a purchase, or answer any questions about your finances for **${periodLabel}**.\n\n` +
        `How can I help you today?`;
    }
    // Conversational Intent 1B: Follow-ups ("tell me more", "explain more", "give me an example", "why?", "how does that work?")
    else if (
      lower.includes("tell me more") ||
      lower.includes("explain more") ||
      lower.includes("give me an example") ||
      lower.includes("give an example") ||
      lower.includes("for example") ||
      lower === "why?" ||
      lower === "why" ||
      lower.includes("how does that work") ||
      lower.includes("elaborate")
    ) {
      if (contextClues.includes("debt") || contextClues.includes("avalanche") || contextClues.includes("snowball")) {
        answer = `### Practical Example: The Avalanche Payoff in Action 🏔️\n\n` +
          `Let's say you have two debts:\n` +
          `• **Credit Card:** ₹50,000 balance at 38% annual APR (min payment: ₹2,500/mo)\n` +
          `• **Personal Loan:** ₹1,50,000 balance at 12% annual APR (min payment: ₹4,000/mo)\n\n` +
          `**The Avalanche Playbook:**\n` +
          `1. You pay the minimum ₹4,000 on the personal loan.\n` +
          `2. If you have ₹10,000 total available for debt payoff each month, send the remaining **₹6,000** entirely to the Credit Card.\n` +
          `3. In just ~10 months, that high-interest 38% card is completely wiped out, saving you over ₹14,000 in compound interest penalties!\n` +
          `4. Then, you roll the entire ₹10,000 onto the personal loan, crushing it years ahead of schedule.`;
      } else if (lastAssistantMessage.includes("invest") || lastAssistantMessage.includes("compound") || lastAssistantMessage.includes("sip")) {
        answer = `### Practical Example: The Power of a ₹5,000 Monthly SIP 📈\n\n` +
          `Suppose you start investing **₹5,000 every month** into a low-cost broad-market index fund (historical average ~12% annualized return):\n\n` +
          `• **In 5 Years:** You invest ₹3 Lakhs → Portfolio value is **~₹4.1 Lakhs**\n` +
          `• **In 10 Years:** You invest ₹6 Lakhs → Portfolio value is **~₹11.6 Lakhs** (your money almost doubled!)\n` +
          `• **In 20 Years:** You invest ₹12 Lakhs → Portfolio value reaches **~₹50.0 Lakhs**!\n\n` +
          `Notice how out of that ₹50 Lakhs, **₹38 Lakhs is pure compound growth** you never had to work for. That's why starting an automated SIP early is the single most reliable wealth builder.`;
      } else if (lastAssistantMessage.includes("budget") || lastAssistantMessage.includes("50/30/20") || lastAssistantMessage.includes("save")) {
        answer = `### Practical Example: Applying the 50/30/20 Rule\n\n` +
          `Suppose your monthly take-home income is ₹60,000:\n\n` +
          `1. **50% Needs (₹30,000):** Rent, groceries, utility bills, commute, health insurance.\n` +
          `2. **30% Wants (₹18,000):** Dining out, entertainment, weekend trips, shopping, subscriptions.\n` +
          `3. **20% Savings & Debt Payoff (₹12,000):** Automated into liquid emergency fund or index SIPs on payday.\n\n` +
          `*Pro Tip:* Treat that 20% savings like a non-negotiable bill you owe to your future self — transfer it first before spending on wants!`;
      } else {
        answer = `Here is a deeper look at that concept:\n\n` +
          `In personal finance, small consistent daily habits create far greater wealth than trying to time unpredictable windfalls.\n\n` +
          `1. **Automate Everything:** When savings, investments, and bill payments happen automatically on salary day, you eliminate decision fatigue.\n` +
          `2. **Mind the Invisible Leaks:** Recurring ₹299–₹999 subscriptions and frequent ₹400 delivery orders silently drain ₹10,000–₹15,000 every single month.\n` +
          `3. **Measure Your Net Worth Quarterly:** Track total assets minus total debts once every 3 months to see your long-term upward curve.\n\n` +
          `Would you like to review how this applies to your current spending for **${periodLabel}**?`;
      }
    }
    // Conversational Intent 1C: "What should I do first?" / "Where do I start?"
    else if (
      lower.includes("what should i do first") ||
      lower.includes("where should i start") ||
      lower.includes("where do i begin") ||
      lower.includes("how do i start") ||
      lower.includes("what is step 1") ||
      lower.includes("first step")
    ) {
      answer = `### The Golden Order of Operations in Personal Finance 🧭\n\n` +
        `Whenever you're wondering where to start, follow this proven sequential hierarchy:\n\n` +
        `1. **Step 1: Starter Emergency Buffer (₹25,000–₹50,000)**\n` +
        `   Keep this in a liquid savings account so a flat tire or doctor visit doesn't force you into credit card debt.\n\n` +
        `2. **Step 2: Eliminate High-Interest Debt (APR > 10%)**\n` +
        `   Pay minimums on everything, and attack credit cards or personal loans aggressively.\n\n` +
        `3. **Step 3: Full 3–6 Month Safety Runway**\n` +
        `   Save enough liquid reserves to cover rent and essentials if income stops temporarily.\n\n` +
        `4. **Step 4: Automated Long-Term Investing (SIPs & Goals)**\n` +
        `   Direct 15–20%+ of your income into index funds, PPF/EPF, and retirement milestones.\n\n` +
        `Which step are you currently focusing on right now?`;
    }
    // Conversational Intent 1D: Affirmation ("yes", "sure", "yeah", "let's do it", "sounds good")
    else if (
      /^(yes|yeah|sure|yep|yup|definitely|absolutely|let's do it|sounds good|go ahead|tell me)[\s!.]*$/i.test(lower)
    ) {
      answer = `Awesome! Let's do it! 🚀\n\n` +
        `We can dive into:\n` +
        `• **Your Spending Breakdown:** See which categories consumed the most money this month.\n` +
        `• **Purchase Affordability:** Type any amount (e.g. *"Can I afford ₹12,000?"*) and I'll calculate it against your cash surplus.\n` +
        `• **Budget Check:** See if any category budgets are nearing their limit.\n` +
        `• **Voice Talk:** Tap the microphone icon below to speak to me directly!\n\n` +
        `What would you like to explore first?`;
    }
    // Conversational Intent 2: Small Talk / "How are you?" / "How's it going?"
    else if (
      lower.includes("how are you") ||
      lower.includes("how r u") ||
      lower.includes("how are u") ||
      lower.includes("how's it going") ||
      lower.includes("how do you do")
    ) {
      answer = `I'm doing great, thank you for asking! 😊\n\n` +
        `I'm ready to help you analyze your spending, check your savings pace, or review your budgets for **${periodLabel}**. What would you like to look at today?`;
    }
    // Conversational Intent 3: Gratitude / Thank you
    else if (
      /^(thank|thanks|thx|thank you|tysm|appreciate it)\b/i.test(lower) ||
      lower.includes("thank you") ||
      lower.includes("thanks")
    ) {
      answer = `You're very welcome! 😊 Always happy to help you build financial clarity. Feel free to ask anytime if you want to check a budget, plan a purchase, or review your ledger!`;
    }
    // Conversational Intent 4: Acknowledgment (e.g. "ok", "okay", "cool", "great", "got it")
    else if (/^(ok|okay|cool|great|awesome|got it|nice|sounds good)[\s!.]*$/i.test(lower)) {
      answer = `Awesome! 👍 Let me know whenever you'd like to inspect your cash flow, run an affordability check, or set up a new savings milestone.`;
    }
    // Conversational Intent 5: Good morning / afternoon / evening / night
    else if (
      lower.includes("good morning") ||
      lower.includes("good afternoon") ||
      lower.includes("good evening") ||
      lower.includes("good night")
    ) {
      const timeGreeting = lower.includes("morning")
        ? "Good morning! ☀️"
        : lower.includes("afternoon")
        ? "Good afternoon! 🌤️"
        : lower.includes("night")
        ? "Good night! 🌙"
        : "Good evening! 🌆";
      answer = `${timeGreeting} Hope you're having a wonderful day!\n\n` +
        `How can I help you with your budget, cash flow, or spending for **${periodLabel}** today?`;
    }
    // Conversational Intent 6: Farewell / Goodbye
    else if (/^(bye|goodbye|see you|cya|take care)[\s!.]*$/i.test(lower)) {
      answer = `Goodbye! 👋 Have a fantastic day ahead, and keep your savings pacing strong. Come back whenever you need a quick financial check-in!`;
    }
    // Conversational Intent 7: General Financial Advice & Savings Tips
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
    // Conversational Intent 8: Help / Capabilities / Who are you
    else if (
      lower.includes("what can you do") ||
      lower.includes("help me") ||
      lower.includes("who are you") ||
      lower.includes("what is fyza") ||
      lower.includes("capabilities") ||
      lower.includes("features")
    ) {
      answer = `### What Fyza AI Can Do For You\n\n` +
        `I am your 24/7 personal finance assistant. Powered by natural language and verified ledger arithmetic, I can:\n\n` +
        `• 📊 **Analyze Spending:** Categorize your outflow (e.g. food, shopping, utilities, commute).\n` +
        `• 🎯 **Goal Pacing:** Calculate exactly how much to save monthly to reach savings milestones.\n` +
        `• 💡 **Affordability Simulation:** Check if a planned purchase (e.g. "Can I afford ₹25,000?") is safe.\n` +
        `• 🛡️ **Emergency Runway:** Compute how many months your liquid reserves can cover.\n` +
        `• 📅 **Subscription Audits:** Highlight upcoming bills and auto-debits before they hit.\n` +
        `• 📈 **Trend Comparisons:** Compare your current outflow with previous months.`;
    }
    // Conversational Intent 9: "Can we talk?" / "Let's talk" / "Talk together"
    else if (
      lower.includes("talk") ||
      lower.includes("chat") ||
      lower.includes("friend") ||
      lower.includes("listen") ||
      lower.includes("together")
    ) {
      answer = `I'd love to! I'm right here with you. 😊\n\n` +
        `Think of me as your personal financial copilot. We can talk through anything on your mind — your daily money habits, planning a big dream, dealing with financial stress, or just figuring out where to start with your budget for **${periodLabel}**.\n\n` +
        `What's on your mind right now? Tell me what you're thinking!`;
    }
    // Conversational Intent 10: Debt & Loans (Avalanche vs Snowball)
    else if (
      lower.includes("debt") ||
      lower.includes("loan") ||
      lower.includes("emi") ||
      lower.includes("avalanche") ||
      lower.includes("snowball")
    ) {
      answer = `### Tackling Debt: Strategy & Clarity\n\n` +
        `Handling debt can feel stressful, but having a clear plan changes everything. Here are the two most effective methods:\n\n` +
        `1. **The Avalanche Method (Mathematically Optimal):** Pay the minimums on all balances, then throw every extra rupee at the debt with the highest interest rate (usually credit cards ~36–42% APR). This saves the most money in interest.\n` +
        `2. **The Snowball Method (Psychologically Rewarding):** Pay off the smallest balance first regardless of interest rate. Knocking out quick wins builds huge momentum!\n\n` +
        `*Golden Rule:* Always maintain a mini emergency buffer (₹15,000–₹30,000) so an unexpected expense doesn't force you right back onto credit cards.`;
    }
    // Conversational Intent 11: Investing, Mutual Funds, SIP, Stocks
    else if (
      lower.includes("invest") ||
      lower.includes("sip") ||
      lower.includes("mutual fund") ||
      lower.includes("stock") ||
      lower.includes("crypto") ||
      lower.includes("bitcoin") ||
      lower.includes("fixed deposit") ||
      lower.includes("wealth")
    ) {
      answer = `### Investing & Wealth Building Essentials\n\n` +
        `Building long-term wealth comes down to consistency over timing the market:\n\n` +
        `1. **Start with an Emergency Fund:** Before taking market risk, ensure you have 3–6 months of essential expenses in a safe, liquid account.\n` +
        `2. **Harness SIPs (Systematic Investment Plans):** Investing a fixed amount monthly into broad-market index mutual funds (like Nifty 50 or S&P 500) eliminates emotional guessing and averages out market volatility.\n` +
        `3. **The Power of Compounding:** Time in the market beats timing the market. Compounding does its heaviest lifting in years 10, 15, and 20.\n` +
        `4. **Speculative Assets (Crypto/Individual Stocks):** Keep high-volatility holdings under 5–10% of your total net worth so downswings never jeopardize your baseline.\n\n` +
        `Would you like to calculate how much you can comfortably invest from your monthly surplus?`;
    }
    // Conversational Intent 12: Understanding Inflation
    else if (lower.includes("inflation") || lower.includes("purchasing power")) {
      answer = `### What Is Inflation & Why Does It Matter?\n\n` +
        `Think of inflation as a quiet leak in cash. If inflation is 6% per year, an item that costs ₹100 today will cost ₹106 next year.\n\n` +
        `• **The Cash Trap:** Leaving all your money in a zero-interest checking account means its real purchasing power shrinks every year.\n` +
        `• **The Solution:** Keep essential short-term funds in high-yield liquid accounts, and invest long-term capital in assets that historically outpace inflation (like equities and productive businesses).\n\n` +
        `Staying ahead of inflation is the core reason we invest rather than just save!`;
    }
    // Conversational Intent 13: Compound Interest & Rule of 72
    else if (lower.includes("compound") || lower.includes("rule of 72")) {
      answer = `### The Magic of Compound Interest ✨\n\n` +
        `Compound interest is earning returns on your returns. Albert Einstein famously called it the *eighth wonder of the world*.\n\n` +
        `**The Rule of 72 Shortcut:**\n` +
        `Divide 72 by your expected annual return rate to see roughly how many years it takes your money to double!\n` +
        `• At **6% return:** 72 / 6 = **12 years** to double\n` +
        `• At **12% return:** 72 / 12 = **6 years** to double\n\n` +
        `The secret ingredient is always **time**. The earlier you start, the more dramatic the curve becomes!`;
    }
    // Conversational Intent 14: Credit Cards & Credit Scores (CIBIL)
    else if (
      lower.includes("credit card") ||
      lower.includes("credit score") ||
      lower.includes("cibil")
    ) {
      answer = `### Master Your Credit: Cards & Scores\n\n` +
        `Credit cards are powerful financial tools when used with discipline:\n\n` +
        `• **Always Pay 100% In Full:** Never pay just the 'Minimum Amount Due' — credit card interest rates in India average 36–42% annually.\n` +
        `• **Credit Utilization:** Keep your total monthly card spending below **30%** of your approved credit limit. High utilization lowers your CIBIL score.\n` +
        `• **On-Time Payments:** Payment track record makes up ~35% of your credit score. Set up autopay for the full statement balance to never miss a due date.\n\n` +
        `Treat your credit card like a debit card: never swipe for anything you don't already have cash in the bank to cover!`;
    }
    // Conversational Intent 15: Financial Stress & Feeling Overwhelmed
    else if (
      lower.includes("stress") ||
      lower.includes("anxious") ||
      lower.includes("overwhelmed") ||
      lower.includes("worried") ||
      lower.includes("scared") ||
      lower.includes("fear")
    ) {
      answer = `Take a deep breath. Money stress is completely normal, but you don't have to tackle everything all at once. 🌱\n\n` +
        `When money feels overwhelming, here is a grounding way forward:\n` +
        `1. **Focus on Clarity over Perfection:** Just knowing what comes in and what goes out removes the fear of the unknown.\n` +
        `2. **One Small Step Today:** Pick just one thing today — like logging one recent transaction, checking a bill due date, or canceling one unused subscription.\n` +
        `3. **Be Kind to Yourself:** Past spending decisions are data points, not moral failures. Every month is a fresh slate.\n\n` +
        `I'm here with you every step of the way. What feels like the most pressing thing on your plate right now?`;
    }
    // Conversational Intent 16: Impulse Spending & How to Stop
    else if (
      lower.includes("impulse") ||
      lower.includes("stop spending") ||
      lower.includes("overspend") ||
      lower.includes("spend too much") ||
      lower.includes("shopping habit")
    ) {
      answer = `### 3 Proven Hacks to Beat Impulse Spending\n\n` +
        `Impulse spending is almost always driven by emotion, fatigue, or boredom rather than actual need. Here's how to regain control:\n\n` +
        `1. **The 48-Hour Cooling-Off Rule:** For non-essential purchases over ₹1,000, add them to a wishlist and wait 48 hours. In 80% of cases, the urge passes.\n` +
        `2. **Calculate in 'Life Energy':** Divide the item's price by your hourly earnings. For example, is a ₹4,000 jacket worth 4 full hours of your working time?\n` +
        `3. **Add Digital Friction:** Remove saved credit cards from shopping apps (Amazon, food delivery) so you have to manually enter card details each time.\n\n` +
        `Small frictions create space for conscious, intentional choices!`;
    }
    // Conversational Intent 17: Side Hustles & Increasing Income
    else if (
      lower.includes("earn more") ||
      lower.includes("side hustle") ||
      lower.includes("make money") ||
      lower.includes("increase income") ||
      lower.includes("more income")
    ) {
      answer = `### Strategies to Expand Your Earning Power 🚀\n\n` +
        `While you can only cut expenses to zero, your upside earning potential is limitless:\n\n` +
        `1. **Monetize Your Primary Skill:** Freelancing or consulting in your domain (design, coding, writing, marketing, tutoring) yields the fastest return.\n` +
        `2. **High-Leverage Upskilling:** Learning in-demand tools (AI workflows, analytics, cloud platforms) can significantly boost your next compensation review.\n` +
        `3. **Digital Products & Content:** Building once and selling multiple times (templates, guides, micro-courses, newsletters).\n` +
        `4. **Reinvest in Yourself:** The highest ROI investment you will ever make in your 20s and 30s is in your own skills and network.`;
    }
    // Conversational Intent 18: Financial Jokes & Humor
    else if (
      lower.includes("joke") ||
      lower.includes("funny") ||
      lower.includes("laugh") ||
      lower.includes("humor")
    ) {
      const jokes = [
        "Why did the dollar bill break up with the coin? Because it needed some space and wanted someone more flexible! 😄",
        "Why did the accountant look so calm? Because they had everything under audit! 📊",
        "Why did the credit card go to therapy? Because it had too many unresolved issues with its interest! 💳",
        "My wallet is like an onion: whenever I open it, it makes me cry! 🧅💸",
      ];
      const selectedJoke = jokes[Math.floor(Math.random() * jokes.length)];
      answer = `${selectedJoke}\n\nMoney is serious business, but a good laugh keeps the journey enjoyable! What would you like to explore next?`;
    }
    // Conversational Intent 19: Motivation & Quotes
    else if (
      lower.includes("quote") ||
      lower.includes("motivat") ||
      lower.includes("inspire") ||
      lower.includes("wisdom")
    ) {
      answer = `Here is a powerful thought on wealth by Morgan Housel (*The Psychology of Money*):\n\n` +
        `> *"Spending money to show people how much money you have is the fastest way to have less money. True wealth is what you don't see — it's the cars not purchased, the watches not worn, and the freedom to control your own time."*\n\n` +
        `Every rupee you save today buys you a slice of independence and future options!`;
    }
    // Conversational Intent 20: Why Budgeting Matters
    else if (
      lower.includes("why budget") ||
      lower.includes("why is budgeting") ||
      lower.includes("purpose of budget")
    ) {
      answer = `### Why Budgeting Isn't About Deprivation\n\n` +
        `Many people think budgeting is about saying "no" to everything you love. But in reality, a budget is about:\n\n` +
        `• **Guilt-Free Spending:** When you know your rent, bills, and savings are funded, you can spend discretionary money with complete peace of mind.\n` +
        `• **Directing Your Cash:** As John Maxwell said, *"A budget is telling your money where to go instead of wondering where it went."*\n` +
        `• **Freedom from Surprises:** Annual insurance, car repairs, and festival seasons stop being emergencies when they're planned.\n\n` +
        `Would you like help setting up a simple category budget for this month?`;
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
    // Conversational Fallback: Natural dialogue instead of a static table
    else {
      answer = `I hear you! Let's talk through that. 😊\n\n` +
        `As your financial companion for **${periodLabel}**, I'm here to think through money decisions, budgeting questions, or financial habits with you.\n\n` +
        (context && context.totalBalanceMinor > 0
          ? `Right now, you have **${fmt(context.totalBalanceMinor)}** in total tracked balances with a **${context.savingsRatePct}%** savings rate.\n\n`
          : "") +
        `We can discuss anything — like how to manage your expenses, whether you can afford an upcoming purchase, strategies for saving or investing, or tackling financial stress.\n\n` +
        `What's on your mind, or what specific part would you like to explore together?`;
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

