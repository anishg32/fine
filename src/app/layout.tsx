import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fyza — Intelligent Personal Finance Platform",
  description:
    "Take total control of your money with smart expense tracking, transparent budgets, savings goals, multi-scenario forecasting, and an intelligent AI financial assistant.",
  keywords: [
    "personal finance",
    "expense tracker",
    "budgeting app",
    "savings goals",
    "financial forecasting",
    "AI finance assistant",
    "fintech India",
  ],
  authors: [{ name: "Fyza Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="emerald-midnight"
          themes={[
            "emerald-midnight",
            "violet-intelligence",
            "ocean-blue",
            "amber-wealth",
            "clean-light",
          ]}
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                className: "border border-border bg-card text-foreground rounded-xl shadow-xl",
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
