import type {
  AuthResponse,
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  Transaction,
  CreateTransactionRequest,
  TransactionListResponse,
  FinancialOverview,
  ExchangeRates,
  UpdatePreferencesRequest,
} from "../types";

const API_BASE = "/api";

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "An error occurred");
  }

  return data;
}

// Auth API
export const auth = {
  register: (email: string, password: string): Promise<AuthResponse> =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string): Promise<AuthResponse> =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: (): Promise<{ message: string }> =>
    request("/auth/logout", { method: "POST" }),

  me: (): Promise<AuthResponse> => request("/auth/me"),
};

// User API
export const user = {
  updatePreferences: (data: UpdatePreferencesRequest): Promise<AuthResponse> =>
    request("/user/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Accounts API
export const accounts = {
  list: (): Promise<Account[]> => request("/accounts"),

  get: (id: number): Promise<Account> => request(`/accounts/${id}`),

  create: (data: CreateAccountRequest): Promise<Account> =>
    request("/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: UpdateAccountRequest): Promise<Account> =>
    request(`/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<{ message: string }> =>
    request(`/accounts/${id}`, { method: "DELETE" }),

  overview: (): Promise<FinancialOverview> => request("/overview"),
};

// Transactions API
export const transactions = {
  listByAccount: (
    accountId: number,
    page = 1,
    pageSize = 20
  ): Promise<TransactionListResponse> =>
    request(
      `/accounts/${accountId}/transactions?page=${page}&page_size=${pageSize}`
    ),

  create: (
    accountId: number,
    data: CreateTransactionRequest
  ): Promise<Transaction> =>
    request(`/accounts/${accountId}/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  recent: (limit = 10): Promise<Transaction[]> =>
    request(`/transactions/recent?limit=${limit}`),
};

// Exchange Rates API
export const exchangeRates = {
  getRates: (base = "USD"): Promise<ExchangeRates> =>
    request(`/exchange-rates?base=${base}`),

  convert: (
    from: string,
    to: string,
    amount: number
  ): Promise<{
    from: string;
    to: string;
    amount: number;
    converted: number;
    rate: number;
  }> =>
    request(`/exchange-rates/convert?from=${from}&to=${to}&amount=${amount}`),
};

export { ApiError };
