import type { Account, Category, TransactionType } from "./types";
import { toMinorUnits } from "./utils";

export interface ParsedEntity {
  field: "amount" | "type" | "category" | "account" | "transfer_account" | "date" | "merchant" | "description";
  value: string;
  raw: string;
}

export interface ParsedTransactionResult {
  type: TransactionType;
  amountMinor: number;
  amountMajor: number;
  description: string;
  merchant: string | null;
  categoryId: string | null;
  categoryName: string | null;
  accountId: string | null;
  accountName: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
  transactionDate: string; // YYYY-MM-DD
  notes: string | null;
  tags: string[];
  confidence: number; // 0 to 100
  detectedEntities: ParsedEntity[];
  rawInput: string;
}

// Common merchants lookup mapped to typical categories
const KNOWN_MERCHANTS: Record<string, { name: string; category: string; type?: TransactionType }> = {
  starbucks: { name: "Starbucks", category: "Food & Dining" },
  swiggy: { name: "Swiggy", category: "Food & Dining" },
  zomato: { name: "Zomato", category: "Food & Dining" },
  mcdonalds: { name: "McDonald's", category: "Food & Dining" },
  "blue tokai": { name: "Blue Tokai", category: "Food & Dining" },
  "third wave": { name: "Third Wave Coffee", category: "Food & Dining" },
  subway: { name: "Subway", category: "Food & Dining" },
  dominos: { name: "Domino's Pizza", category: "Food & Dining" },
  "pizza hut": { name: "Pizza Hut", category: "Food & Dining" },
  kfc: { name: "KFC", category: "Food & Dining" },
  blinkit: { name: "Blinkit", category: "Groceries" },
  zepto: { name: "Zepto", category: "Groceries" },
  instamart: { name: "Instamart", category: "Groceries" },
  bigbasket: { name: "BigBasket", category: "Groceries" },
  dmart: { name: "D-Mart", category: "Groceries" },
  naturebasket: { name: "Nature's Basket", category: "Groceries" },
  uber: { name: "Uber", category: "Transportation" },
  ola: { name: "Ola", category: "Transportation" },
  rapido: { name: "Rapido", category: "Transportation" },
  irctc: { name: "IRCTC", category: "Transportation" },
  makemytrip: { name: "MakeMyTrip", category: "Transportation" },
  indigo: { name: "IndiGo", category: "Transportation" },
  shell: { name: "Shell Petrol", category: "Transportation" },
  hp: { name: "HP Petrol", category: "Transportation" },
  bpcl: { name: "BPCL Fuel", category: "Transportation" },
  amazon: { name: "Amazon", category: "Shopping" },
  flipkart: { name: "Flipkart", category: "Shopping" },
  myntra: { name: "Myntra", category: "Shopping" },
  zara: { name: "Zara", category: "Shopping" },
  h_and_m: { name: "H&M", category: "Shopping" },
  "h&m": { name: "H&M", category: "Shopping" },
  apple: { name: "Apple", category: "Shopping" },
  netflix: { name: "Netflix", category: "Entertainment" },
  spotify: { name: "Spotify", category: "Entertainment" },
  hotstar: { name: "Disney+ Hotstar", category: "Entertainment" },
  prime: { name: "Amazon Prime", category: "Entertainment" },
  bookmyshow: { name: "BookMyShow", category: "Entertainment" },
  pvr: { name: "PVR Cinemas", category: "Entertainment" },
  inox: { name: "INOX", category: "Entertainment" },
  airtel: { name: "Airtel", category: "Utilities" },
  jio: { name: "Jio", category: "Utilities" },
  bescom: { name: "BESCOM", category: "Utilities" },
  tneb: { name: "TNEB Electricity", category: "Utilities" },
  tatapower: { name: "Tata Power", category: "Utilities" },
  apollo: { name: "Apollo Pharmacy", category: "Healthcare" },
  pharmeasy: { name: "PharmEasy", category: "Healthcare" },
  medplus: { name: "MedPlus", category: "Healthcare" },
  zerodha: { name: "Zerodha", category: "Investments" },
  groww: { name: "Groww", category: "Investments" },
  google: { name: "Google", category: "Income", type: "income" },
  microsoft: { name: "Microsoft", category: "Income", type: "income" },
};

// Keyword dictionary for category detection
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Food & Dining": [
    "coffee", "tea", "chai", "dinner", "lunch", "breakfast", "brunch", "snack",
    "restaurant", "cafe", "food", "dining", "meal", "burger", "pizza", "biryani",
    "dosa", "cocktail", "beer", "bar", "pub", "dessert", "bakery", "cake"
  ],
  "Groceries": [
    "grocery", "groceries", "supermarket", "veggies", "vegetables", "fruits",
    "milk", "dairy", "bread", "eggs", "ration", "provisions", "supplies"
  ],
  "Transportation": [
    "uber", "ola", "cab", "taxi", "metro", "bus", "train", "flight", "airfare",
    "petrol", "diesel", "fuel", "gasoline", "toll", "fastag", "parking", "auto",
    "commute", "travel"
  ],
  "Housing": [
    "rent", "apartment", "society", "maintenance", "house", "flat", "landlord",
    "deposit", "lease", "brokerage", "maid", "cook"
  ],
  "Utilities": [
    "electricity", "water", "wifi", "broadband", "internet", "phone bill",
    "mobile recharge", "dth", "cylinder", "gas bill", "utility", "power"
  ],
  "Entertainment": [
    "movie", "cinema", "theater", "show", "concert", "game", "gaming", "steam",
    "playstation", "ott", "subscription", "music", "event", "outing"
  ],
  "Shopping": [
    "shopping", "clothes", "clothing", "shoes", "jacket", "shirt", "jeans",
    "electronics", "gadget", "watch", "perfume", "bag", "gift", "furniture",
    "decor", "online order", "purchase"
  ],
  "Healthcare": [
    "medicine", "doctor", "hospital", "clinic", "pharmacy", "medical", "checkup",
    "dentist", "therapy", "pills", "prescription", "lab test", "glasses"
  ],
  "Personal Care": [
    "salon", "haircut", "spa", "grooming", "barber", "skincare", "cosmetics", "massage"
  ],
  "Education": [
    "tuition", "course", "books", "udemy", "coursera", "school", "college", "fees", "exam"
  ],
  "Investments": [
    "sip", "mutual fund", "stocks", "shares", "equity", "crypto", "gold", "fixed deposit", "fd"
  ],
  "Income": [
    "salary", "bonus", "dividend", "interest", "freelance", "stipend", "honorarium",
    "cashback", "payout", "client payment", "consulting fee", "payroll"
  ]
};

// Patterns for Income, Expense, Transfer verbs
const INCOME_TRIGGERS = [
  "salary", "credited", "received", "earned", "dividend", "bonus", "freelance",
  "got paid", "paycheck", "income", "refund", "cashback", "stipend"
];

const TRANSFER_TRIGGERS = [
  "transfer", "transferred", "moved", "sent to", "deposited into", "deposit to",
  "shift", "shifted", "from my", "to my"
];

/**
 * Extracts numeric money amounts from natural language text.
 * Handles formats like:
 * - ₹450, 450, 450.50, ₹1,200, Rs. 1500, Rs 500, INR 800
 * - 1.5k, 25k (thousands)
 * - 1.5L, 2.5 lakh, 10 lakhs (lakhs = 100,000)
 */
function extractAmount(text: string): { amountMajor: number; raw: string } | null {
  // 1. Lakhs check: e.g. "2.5 lakh", "1.5L", "3 lakhs"
  const lakhMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l)\b/i);
  if (lakhMatch) {
    const val = parseFloat(lakhMatch[1]) * 100000;
    return { amountMajor: val, raw: lakhMatch[0] };
  }

  // 2. Thousands check: e.g. "1.5k", "25k"
  const kMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]) * 1000;
    return { amountMajor: val, raw: kMatch[0] };
  }

  // 3. Currency symbol / code with numbers: e.g. "₹ 1,500.50", "Rs. 450", "INR 2000"
  const currencyMatch = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (currencyMatch) {
    const num = parseFloat(currencyMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 0) {
      return { amountMajor: num, raw: currencyMatch[0] };
    }
  }

  // 4. Standalone numbers with trailing "bucks", "rs", "rupees": e.g. "450 bucks", "500 rs", "1200 rupees"
  const trailingCurMatch = text.match(/\b([\d,]+(?:\.\d{1,2})?)\s*(?:bucks|rs|rupees|inr)\b/i);
  if (trailingCurMatch) {
    const num = parseFloat(trailingCurMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 0) {
      return { amountMajor: num, raw: trailingCurMatch[0] };
    }
  }

  // 5. Standalone number preceded by action words (e.g. "spent 450", "paid 1200", "for 350", "transfer 10000")
  const actionNumMatch = text.match(/(?:spent|paid|for|cost|got|received|transfer(?:red)?|amount|of)\s+([\d,]+(?:\.\d{1,2})?)\b/i);
  if (actionNumMatch) {
    const num = parseFloat(actionNumMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 0) {
      return { amountMajor: num, raw: actionNumMatch[0] };
    }
  }

  // 6. Generic first significant number in text
  const generalNumMatch = text.match(/\b([\d,]+(?:\.\d{1,2})?)\b/);
  if (generalNumMatch) {
    const num = parseFloat(generalNumMatch[1].replace(/,/g, ""));
    // Avoid matching 4-digit years like 2026 or single-digit numbers unless clear
    if (!isNaN(num) && num > 0 && num !== 2024 && num !== 2025 && num !== 2026 && num !== 2027) {
      return { amountMajor: num, raw: generalNumMatch[0] };
    }
  }

  return null;
}

/**
 * Extracts date reference from natural language.
 * Supports: today, yesterday, day before yesterday, explicit dates.
 */
function extractDate(text: string): { dateStr: string; raw: string } {
  const lower = text.toLowerCase();
  const now = new Date();

  // Day before yesterday
  if (lower.includes("day before yesterday")) {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return { dateStr: d.toISOString().split("T")[0], raw: "day before yesterday" };
  }

  // Yesterday / last night
  if (lower.includes("yesterday") || lower.includes("last night")) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return { dateStr: d.toISOString().split("T")[0], raw: lower.includes("yesterday") ? "yesterday" : "last night" };
  }

  // "X days ago"
  const daysAgoMatch = lower.match(/(\d+)\s+days?\s+ago/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return { dateStr: d.toISOString().split("T")[0], raw: daysAgoMatch[0] };
  }

  // Explicit ISO date: YYYY-MM-DD
  const isoMatch = text.match(/\b(202\d-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return { dateStr: isoMatch[1], raw: isoMatch[1] };
  }

  // Date format: DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](202\d)\b/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return { dateStr: `${year}-${month}-${day}`, raw: slashMatch[0] };
  }

  // Default: Today
  return { dateStr: now.toISOString().split("T")[0], raw: "today" };
}

/**
 * Determines transaction type: "expense" | "income" | "transfer".
 */
function determineTransactionType(text: string): { type: TransactionType; raw: string } {
  const lower = text.toLowerCase();

  // 1. Check for transfer keywords
  for (const trigger of TRANSFER_TRIGGERS) {
    if (lower.includes(trigger)) {
      return { type: "transfer", raw: trigger };
    }
  }

  // 2. Check for income keywords
  for (const trigger of INCOME_TRIGGERS) {
    if (lower.includes(trigger)) {
      return { type: "income", raw: trigger };
    }
  }

  // 3. Default: Expense
  return { type: "expense", raw: "expense" };
}

/**
 * Matches accounts from the user's available accounts list.
 */
function matchAccounts(
  text: string,
  accounts: Account[],
  type: TransactionType
): {
  sourceAccount: Account | null;
  transferAccount: Account | null;
  rawSource: string;
  rawTransfer: string;
} {
  const lower = text.toLowerCase();
  let sourceAccount: Account | null = null;
  let transferAccount: Account | null = null;
  let rawSource = "";
  let rawTransfer = "";

  if (accounts.length === 0) {
    return { sourceAccount, transferAccount, rawSource, rawTransfer };
  }

  // For Transfers: Look for "from [Account A] to [Account B]" pattern
  if (type === "transfer") {
    const fromToMatch = lower.match(/from\s+([a-z0-9\s]+?)\s+to\s+([a-z0-9\s]+)/i);
    if (fromToMatch) {
      const fromStr = fromToMatch[1].trim();
      const toStr = fromToMatch[2].trim();

      sourceAccount = accounts.find((a) =>
        fromStr.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(fromStr)
      ) || null;

      transferAccount = accounts.find((a) =>
        toStr.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(toStr)
      ) || null;

      if (sourceAccount) rawSource = fromStr;
      if (transferAccount) rawTransfer = toStr;
    }
  }

  // If not matched or not a transfer, match account with highest specificity score
  if (!sourceAccount) {
    let bestAccount: Account | null = null;
    let bestScore = 0;
    let bestRaw = "";

    // Sort accounts so longer/more specific names are checked thoroughly
    for (const acc of accounts) {
      const accNameLower = acc.name.toLowerCase();
      let score = 0;

      // Exact substring match
      if (lower.includes(accNameLower)) {
        score += 50 + accNameLower.length;
      }

      // Word-by-word match
      const words = accNameLower.split(/[\s-]+/).filter((w) => w.length > 2);
      for (const w of words) {
        if (lower.includes(w)) {
          // generic words get lower score, specific words get higher
          if (w === "account" || w === "bank") score += 2;
          else if (w === "credit" || w === "card" || w === "salary" || w === "savings") score += 8;
          else score += 15;
        }
      }

      // Account type hints
      if (acc.type === "credit" && (lower.includes("credit card") || lower.includes("cc") || lower.includes("creditcard"))) {
        score += 20;
      } else if (acc.type === "cash" && (lower.includes("cash") || lower.includes("wallet"))) {
        score += 20;
      } else if (acc.type === "savings" && lower.includes("savings")) {
        score += 15;
      }

      if (score > bestScore) {
        bestScore = score;
        bestAccount = acc;
        bestRaw = acc.name;
      }
    }

    if (bestAccount && bestScore >= 10) {
      sourceAccount = bestAccount;
      rawSource = bestRaw;
    }
  }

  // Default source account to primary/first if still null
  if (!sourceAccount) {
    sourceAccount = accounts[0] || null;
  }

  // For transfer, if transferAccount is still null, pick the first different account
  if (type === "transfer" && !transferAccount) {
    transferAccount = accounts.find((a) => a.id !== sourceAccount?.id) || null;
  }

  return { sourceAccount, transferAccount, rawSource, rawTransfer };
}

/**
 * Matches category and merchant from input text.
 */
function matchCategoryAndMerchant(
  text: string,
  categories: Category[],
  type: TransactionType
): {
  category: Category | null;
  merchant: string | null;
  rawCat: string;
  rawMerchant: string;
} {
  const lower = text.toLowerCase();
  let category: Category | null = null;
  let merchant: string | null = null;
  let rawCat = "";
  let rawMerchant = "";

  // 1. Check known merchants lookup table
  for (const [key, info] of Object.entries(KNOWN_MERCHANTS)) {
    if (lower.includes(key)) {
      merchant = info.name;
      rawMerchant = key;
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === info.category.toLowerCase()
      );
      if (matchedCat) {
        category = matchedCat;
        rawCat = matchedCat.name;
      }
      break;
    }
  }

  // 2. If category not found, scan Category Keywords dictionary
  if (!category) {
    for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        // match whole word or phrase
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        if (regex.test(lower)) {
          const matched = categories.find(
            (c) => c.name.toLowerCase() === catName.toLowerCase()
          );
          if (matched) {
            category = matched;
            rawCat = kw;
            break;
          }
        }
      }
      if (category) break;
    }
  }

  // 3. Fallback: match direct category names in the user's category list
  if (!category) {
    for (const cat of categories) {
      if (lower.includes(cat.name.toLowerCase())) {
        category = cat;
        rawCat = cat.name;
        break;
      }
    }
  }

  // 4. Default category based on transaction type if still null
  if (!category) {
    const matchingTypeCats = categories.filter((c) => c.type === type);
    category = matchingTypeCats[0] || null;
  }

  // 5. Merchant extraction from prepositions: "at [Merchant]" or "to [Merchant]"
  if (!merchant) {
    const atMatch = text.match(/\b(?:at|on|from)\s+([A-Z][A-Za-z0-9'&]+(?:\s+[A-Z][A-Za-z0-9'&]+)?)/);
    if (atMatch && atMatch[1]) {
      merchant = atMatch[1].trim();
      rawMerchant = atMatch[0];
    }
  }

  return { category, merchant, rawCat, rawMerchant };
}

/**
 * Builds a clean, professional description from the natural language input.
 */
function cleanDescription(
  text: string,
  merchant: string | null,
  category: Category | null,
  type: TransactionType,
  amountRaw: string
): string {
  // If merchant exists, e.g. "Starbucks Coffee" or "Swiggy"
  if (merchant) {
    const lower = text.toLowerCase();
    if (lower.includes("coffee")) return `${merchant} Coffee`;
    if (lower.includes("dinner")) return `${merchant} Dinner`;
    if (lower.includes("lunch")) return `${merchant} Lunch`;
    if (lower.includes("groceries") || lower.includes("grocery")) return `${merchant} Groceries`;
    if (lower.includes("ride") || lower.includes("cab")) return `${merchant} Ride`;
    return merchant;
  }

  // Remove the amount from the text to make a succinct label
  let cleaned = text
    .replace(new RegExp(amountRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "")
    .replace(/\b(?:spent|paid|for|bought|purchased|received|credited|transfer(?:red)?|yesterday|today|last night|rupees|bucks|rs\.?|inr)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Strip leading prepositions
  cleaned = cleaned.replace(/^(?:at|on|from|to|for|via|with)\s+/i, "").trim();

  if (cleaned.length > 2 && cleaned.length < 50) {
    // Capitalize first letter
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Fallback description based on category or type
  if (type === "transfer") return "Internal Account Transfer";
  if (type === "income") return "Income Inflow";
  return category ? `${category.name} Expense` : "Recorded Transaction";
}

/**
 * Master Deterministic Natural Language Financial Parser
 * Precision tested for all major financial logging patterns.
 */
export function parseNaturalLanguageTransaction(
  input: string,
  accounts: Account[],
  categories: Category[]
): ParsedTransactionResult {
  const trimmed = input.trim();
  const detectedEntities: ParsedEntity[] = [];

  // 1. Amount
  const amountExtract = extractAmount(trimmed);
  const amountMajor = amountExtract ? amountExtract.amountMajor : 0;
  const amountMinor = toMinorUnits(amountMajor);
  if (amountExtract) {
    detectedEntities.push({
      field: "amount",
      value: `₹${amountMajor.toLocaleString("en-IN")}`,
      raw: amountExtract.raw,
    });
  }

  // 2. Type
  const typeExtract = determineTransactionType(trimmed);
  detectedEntities.push({
    field: "type",
    value: typeExtract.type.toUpperCase(),
    raw: typeExtract.raw,
  });

  // 3. Date
  const dateExtract = extractDate(trimmed);
  detectedEntities.push({
    field: "date",
    value: dateExtract.dateStr,
    raw: dateExtract.raw,
  });

  // 4. Accounts
  const { sourceAccount, transferAccount, rawSource, rawTransfer } = matchAccounts(
    trimmed,
    accounts,
    typeExtract.type
  );
  if (sourceAccount) {
    detectedEntities.push({
      field: "account",
      value: sourceAccount.name,
      raw: rawSource || sourceAccount.name,
    });
  }
  if (typeExtract.type === "transfer" && transferAccount) {
    detectedEntities.push({
      field: "transfer_account",
      value: transferAccount.name,
      raw: rawTransfer || transferAccount.name,
    });
  }

  // 5. Category and Merchant
  const { category, merchant, rawCat, rawMerchant } = matchCategoryAndMerchant(
    trimmed,
    categories,
    typeExtract.type
  );
  if (merchant) {
    detectedEntities.push({
      field: "merchant",
      value: merchant,
      raw: rawMerchant,
    });
  }
  if (category && typeExtract.type !== "transfer") {
    detectedEntities.push({
      field: "category",
      value: category.name,
      raw: rawCat || category.name,
    });
  }

  // 6. Clean Description
  const description = cleanDescription(
    trimmed,
    merchant,
    category,
    typeExtract.type,
    amountExtract?.raw || ""
  );
  detectedEntities.push({
    field: "description",
    value: description,
    raw: trimmed,
  });

  // Calculate Confidence Score
  let confidence = 50;
  if (amountMajor > 0) confidence += 25;
  if (category) confidence += 10;
  if (merchant) confidence += 10;
  if (rawSource) confidence += 5;

  return {
    type: typeExtract.type,
    amountMinor,
    amountMajor,
    description,
    merchant,
    categoryId: typeExtract.type === "transfer" ? null : category?.id || null,
    categoryName: typeExtract.type === "transfer" ? null : category?.name || null,
    accountId: sourceAccount?.id || null,
    accountName: sourceAccount?.name || null,
    transferAccountId: typeExtract.type === "transfer" ? transferAccount?.id || null : null,
    transferAccountName: typeExtract.type === "transfer" ? transferAccount?.name || null : null,
    transactionDate: dateExtract.dateStr,
    notes: `Added via Fyza AI Natural Language: "${trimmed}"`,
    tags: ["ai-logged", typeExtract.type],
    confidence: Math.min(100, confidence),
    detectedEntities,
    rawInput: trimmed,
  };
}
