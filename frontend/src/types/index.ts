// User types
export interface User {
  id: number;
  email: string;
  name?: string;
  preferred_currency: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  message?: string;
}

export interface UpdatePreferencesRequest {
  name?: string;
  preferred_currency?: string;
}

// Account types
export type AccountType =
  | "cash"
  | "debit"
  | "credit_card"
  | "loan"
  | "saving"
  | "investment";

export interface Account {
  id: number;
  user_id: number;
  name: string;
  type: AccountType;
  color: string;
  currency: string;
  current_balance: number;
  credit_limit?: number;
  credit_owed?: number;
  closing_date?: number;
  loan_initial_amount?: number;
  loan_current_owed?: number;
  monthly_payment?: number;
  yearly_interest_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  color: string;
  currency: string;
  initial_balance?: number;
  credit_limit?: number;
  credit_owed?: number;
  closing_date?: number;
  loan_initial_amount?: number;
  loan_current_owed?: number;
  monthly_payment?: number;
  yearly_interest_rate?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  color?: string;
  currency?: string;
  current_balance?: number;
  credit_limit?: number;
  credit_owed?: number;
  closing_date?: number;
  loan_current_owed?: number;
  monthly_payment?: number;
  yearly_interest_rate?: number;
}

// Transaction types
export type TransactionType = "deposit" | "withdrawal" | "expense" | "payment";

export type TransactionCategory =
  | "groceries"
  | "dining"
  | "transport"
  | "utilities"
  | "rent"
  | "healthcare"
  | "entertainment"
  | "shopping"
  | "subscriptions"
  | "games"
  | "travel"
  | "education"
  | "fitness"
  | "personal"
  | "gifts"
  | "income"
  | "transfer"
  | "other";

export interface Transaction {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category: TransactionCategory;
  balance_after: number;
  linked_transaction_id?: number;
  linked_account_name?: string;
  created_at: string;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  description: string;
  category: TransactionCategory;
}

export interface TransferRequest {
  from_account_id: number;
  to_account_id: number;
  amount: number;
  description?: string;
}

export interface TransferResponse {
  transaction: Transaction;
  converted_amount?: number;
  to_currency?: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

// Financial Overview
export interface FinancialOverview {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  base_currency: string;
  assets_by_type: Record<string, number>;
  liabilities_by_type: Record<string, number>;
}

// Exchange Rates
export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  updated_at: string;
}

// Reports
export type ReportPeriod = "month" | "week";

export interface CategoryReport {
  category: string;
  amount: number;
  budget?: number;
  percentage?: number;
  remaining?: number;
}

export interface ReportResponse {
  period_start: string;
  period_end: string;
  currency: string;
  total_income: number;
  total_expenses: number;
  expenses_by_category: CategoryReport[];
  first_transaction_date: string | null;
}

// Budgets
export interface CategoryBudget {
  category: TransactionCategory;
  monthly_limit: number;
}

// Category metadata
export const CATEGORIES: Record<
  TransactionCategory,
  { label: string; icon: string }
> = {
  groceries: { label: "Groceries", icon: "ShoppingCart" },
  dining: { label: "Dining", icon: "Utensils" },
  transport: { label: "Transport", icon: "Car" },
  utilities: { label: "Utilities", icon: "Zap" },
  rent: { label: "Rent", icon: "Home" },
  healthcare: { label: "Healthcare", icon: "Heart" },
  entertainment: { label: "Entertainment", icon: "Film" },
  shopping: { label: "Shopping", icon: "ShoppingBag" },
  subscriptions: { label: "Subscriptions", icon: "RefreshCw" },
  games: { label: "Games", icon: "Gamepad2" },
  travel: { label: "Travel", icon: "Plane" },
  education: { label: "Education", icon: "GraduationCap" },
  fitness: { label: "Fitness", icon: "Dumbbell" },
  personal: { label: "Personal", icon: "User" },
  gifts: { label: "Gifts", icon: "Gift" },
  income: { label: "Income", icon: "TrendingUp" },
  transfer: { label: "Transfer", icon: "ArrowLeftRight" },
  other: { label: "Other", icon: "MoreHorizontal" },
};

// Account type metadata
export const ACCOUNT_TYPES: Record<
  AccountType,
  { label: string; icon: string; isAsset: boolean }
> = {
  cash: { label: "Cash", icon: "Banknote", isAsset: true },
  debit: { label: "Debit Card", icon: "CreditCard", isAsset: true },
  credit_card: { label: "Credit Card", icon: "CreditCard", isAsset: false },
  loan: { label: "Loan", icon: "FileText", isAsset: false },
  saving: { label: "Savings", icon: "PiggyBank", isAsset: true },
  investment: { label: "Investment", icon: "TrendingUp", isAsset: true },
};

// Predefined account colors
export const ACCOUNT_COLORS = [
  "#DDE61F", // Primary (Golden Glow)
  "#1A5632", // Secondary (Nordic Pine)
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F97316", // Orange
  "#14B8A6", // Teal
  "#6366F1", // Indigo
  "#EF4444", // Red
  "#84CC16", // Lime
];

// Currency options (DOP, USD, EUR in order of importance)
export const CURRENCIES = [
  { code: "DOP", symbol: "RD$", name: "Dominican Peso" },
  { code: "USD", symbol: "US$", name: "US Dollar" },
  { code: "EUR", symbol: "EUR€", name: "Euro" },
];
