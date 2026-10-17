import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency using integer minor units to avoid floating-point issues.
 * Amounts are stored as integers (paise for INR, cents for USD, etc.).
 */
export function formatCurrency(
  amountInMinorUnits: number,
  currency: string = "INR",
  locale: string = "en-IN"
): string {
  const majorUnits = amountInMinorUnits / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(majorUnits);
}

/**
 * Convert major currency units to minor units (e.g., rupees to paise).
 */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert minor units to major units for display.
 */
export function toMajorUnits(amountInMinorUnits: number): number {
  return amountInMinorUnits / 100;
}

/**
 * Format a compact number (e.g., 1.2K, 3.4M).
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

/**
 * Format percentage with configurable decimal places.
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate percentage safely (returns 0 if denominator is 0).
 */
export function safePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

/**
 * Get greeting based on time of day.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Debounce function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep utility for async operations.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
