import { NextResponse, type NextRequest } from "next/server";
import { parseNaturalLanguageTransaction, type ParsedTransactionResult } from "@/lib/ai-nlp";
import type { Account, Category } from "@/lib/types";

// Rate limiting cache (in-memory sliding window)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS_PER_WINDOW = 40; // Max 40 requests per minute

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
];

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
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
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // 2. Request body validation
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed request payload. JSON format required." },
        { status: 400 }
      );
    }

    const { text, accounts = [], categories = [] } = body as {
      text?: unknown;
      accounts?: Account[];
      categories?: Category[];
    };

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text prompt is required and must be a string." },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return NextResponse.json(
        { error: "Text prompt cannot be empty." },
        { status: 400 }
      );
    }

    if (trimmedText.length > 300) {
      return NextResponse.json(
        { error: "Natural language input exceeds maximum length of 300 characters." },
        { status: 400 }
      );
    }

    // 3. Prompt injection detection
    const isSuspicious = SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(trimmedText));
    if (isSuspicious) {
      return NextResponse.json(
        { error: "Suspicious instruction patterns detected. Please provide a standard financial transaction phrase." },
        { status: 400 }
      );
    }

    // 4. Try live LLM if configured
    const apiKey = process.env.AI_API_KEY;
    const apiUrl = process.env.AI_API_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o-mini";

    if (apiKey && apiKey !== "your_ai_api_key_here") {
      try {
        const availableAccounts = accounts.map((a) => `${a.id}: ${a.name} (${a.type})`).join(", ");
        const availableCategories = categories.map((c) => `${c.id}: ${c.name} (${c.type})`).join(", ");

        const systemPrompt = `You are Fyza AI Natural Language Parser. Extract financial transaction entities from user text into a strict JSON object.
Available User Accounts: [${availableAccounts}]
Available Categories: [${availableCategories}]

Required JSON schema format:
{
  "type": "expense" | "income" | "transfer",
  "amountMajor": number,
  "description": string,
  "merchant": string | null,
  "categoryId": string | null,
  "accountId": string | null,
  "transferAccountId": string | null,
  "transactionDate": string (YYYY-MM-DD),
  "confidence": number (between 50 and 100)
}
Only output the valid JSON object, without backticks or markdown formatting.`;

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
              { role: "user", content: trimmedText },
            ],
            temperature: 0.1,
            max_tokens: 300,
            response_format: { type: "json_object" },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsedLLM = JSON.parse(content);
            const fallbackResult = parseNaturalLanguageTransaction(trimmedText, accounts, categories);

            const result: ParsedTransactionResult = {
              ...fallbackResult,
              type: parsedLLM.type || fallbackResult.type,
              amountMajor: parsedLLM.amountMajor || fallbackResult.amountMajor,
              amountMinor: Math.round((parsedLLM.amountMajor || fallbackResult.amountMajor) * 100),
              description: parsedLLM.description || fallbackResult.description,
              merchant: parsedLLM.merchant || fallbackResult.merchant,
              categoryId: parsedLLM.categoryId || fallbackResult.categoryId,
              accountId: parsedLLM.accountId || fallbackResult.accountId,
              transferAccountId: parsedLLM.transferAccountId || fallbackResult.transferAccountId,
              transactionDate: parsedLLM.transactionDate || fallbackResult.transactionDate,
              confidence: Math.max(90, parsedLLM.confidence || 90),
            };

            return NextResponse.json({
              parsed: result,
              source: "live_ai",
            });
          }
        }
      } catch {
        // Fall back gracefully to deterministic parser
      }
    }

    // 5. Deterministic High-Precision Parser Fallback
    const parsed = parseNaturalLanguageTransaction(trimmedText, accounts, categories);

    return NextResponse.json({
      parsed,
      source: "deterministic_engine",
    });
  } catch (error: unknown) {
    console.error("AI parse transaction error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "An unexpected error occurred while parsing the transaction." },
      { status: 500 }
    );
  }
}
