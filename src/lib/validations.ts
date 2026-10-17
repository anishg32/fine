import { z } from "zod";

// ============================================================
// Auth Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================================
// Transaction Schemas
// ============================================================

export const transactionSchema = z.object({
  account_id: z.string().uuid("Please select an account"),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than zero")
    .max(99999999.99, "Amount is too large"),
  currency: z.string().default("INR"),
  category_id: z.string().nullable(),
  description: z.string().min(1, "Description is required").max(200),
  transaction_date: z.string(),
  merchant: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  tags: z.array(z.string()).default([]),
  is_recurring: z.boolean().default(false),
  transfer_account_id: z.string().uuid().nullable().optional(),
});

// ============================================================
// Account Schemas
// ============================================================

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  type: z.enum(["cash", "savings", "checking", "wallet", "credit", "other"]),
  currency: z.string().default("INR"),
  opening_balance: z.number().default(0),
  description: z.string().max(200).nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

// ============================================================
// Budget Schemas
// ============================================================

export const budgetSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(100),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  total_limit: z
    .number({ message: "Budget limit is required" })
    .positive("Budget limit must be greater than zero"),
  categories: z
    .array(
      z.object({
        category_id: z.string().uuid(),
        limit_amount: z.number().positive(),
      })
    )
    .optional(),
});

// ============================================================
// Goal Schemas
// ============================================================

export const goalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(100),
  target_amount: z
    .number({ message: "Target amount is required" })
    .positive("Target amount must be greater than zero"),
  target_date: z.string().nullable().optional(),
  category: z.enum([
    "emergency",
    "education",
    "travel",
    "electronics",
    "vehicle",
    "home",
    "wedding",
    "retirement",
    "investment",
    "other",
  ]),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

export const goalContributionSchema = z.object({
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than zero"),
  note: z.string().max(200).nullable().optional(),
});

// ============================================================
// Profile Schemas
// ============================================================

export const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  preferred_currency: z.string(),
  locale: z.string(),
  timezone: z.string(),
  week_start: z.enum(["monday", "sunday"]),
  date_format: z.string(),
});

// ============================================================
// AI Chat Schema
// ============================================================

export const aiMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message is too long"),
});

// ============================================================
// Recurring Transaction Schema
// ============================================================

export const recurringTransactionSchema = z.object({
  account_id: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  category_id: z.string().nullable().optional(),
  description: z.string().min(1).max(200),
  merchant: z.string().max(100).nullable().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().positive().default(1),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type GoalContributionInput = z.infer<typeof goalContributionSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type AIMessageInput = z.infer<typeof aiMessageSchema>;
export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>;
