---
name: Category Budget Limits
overview: Add monthly spending limits for expense categories with tracking and visualization in reports.
todos:
  - id: db-budget-table
    content: Add category_budgets table to database
    status: completed
  - id: backend-budget-models
    content: Create budget models and handler
    status: completed
  - id: backend-reports-budget
    content: Update reports handler to include budget calculations
    status: completed
  - id: frontend-budget-types
    content: Add budget types and API client methods
    status: completed
  - id: frontend-settings-budgets
    content: Add budget management UI to Settings page
    status: completed
  - id: frontend-reports-budgets
    content: Update Reports page to show budget progress
    status: completed
---

# Category Budget Limits Feature

## Summary

Allow users to set monthly spending limits for expense categories (groceries, dining, etc.). Budgets are stored in the user's preferred currency and tracked on the Reports page with progress bars and over/under indicators.

## Database Changes

Add `category_budgets` table in [`pkg/database/sqlite.go`](pkg/database/sqlite.go):

```sql
CREATE TABLE IF NOT EXISTS category_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('groceries', 'dining', 'transport', 'utilities', 'rent', 'healthcare', 'entertainment', 'shopping', 'subscriptions', 'games', 'travel', 'education', 'fitness', 'personal', 'gifts', 'other')),
    monthly_limit REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, category)
)
```



## Backend Changes

### New Model

**File**: [`internal/models/budget.go`](internal/models/budget.go)

```go
type CategoryBudget struct {
    ID           int64       `json:"id"`
    UserID       int64       `json:"user_id"`
    Category     string      `json:"category"`
    MonthlyLimit float64     `json:"monthly_limit"`
    CreatedAt    time.Time   `json:"created_at"`
    UpdatedAt    time.Time   `json:"updated_at"`
}

type SetBudgetRequest struct {
    Category     string  `json:"category"`
    MonthlyLimit float64 `json:"monthly_limit"`
}
```



### New Handler

**File**: [`internal/handlers/budgets.go`](internal/handlers/budgets.go)Endpoints:

- `GET /api/budgets` - List all user's budgets
- `POST /api/budgets` - Create or update budget for a category
- `DELETE /api/budgets/{category}` - Remove budget

### Update Reports Handler

**File**: [`internal/handlers/reports.go`](internal/handlers/reports.go)Modify `GetReport` to:

1. Fetch user's category budgets
2. For each category with budget, calculate:

- `spent` (converted to preferred currency)
- `budget` (monthly limit)
- `remaining` (budget - spent, can be negative)
- `percentage` (spent / budget * 100)

Add to response:

```go
type CategoryReport struct {
    Category   string  `json:"category"`
    Amount     float64 `json:"amount"`
    Budget     *float64 `json:"budget,omitempty"`
    Percentage *float64 `json:"percentage,omitempty"`
    Remaining  *float64 `json:"remaining,omitempty"`
}

// Update ReportData to include detailed category reports
ExpensesByCategory []CategoryReport `json:"expenses_by_category"`
```



### Add Routes

**File**: [`cmd/server/main.go`](cmd/server/main.go)

```go
// Budget routes
r.Get("/budgets", budgetHandler.List)
r.Post("/budgets", budgetHandler.Set)
r.Delete("/budgets/{category}", budgetHandler.Delete)
```



## Frontend Changes

### Types

**File**: [`frontend/src/types/index.ts`](frontend/src/types/index.ts)

```typescript
export interface CategoryBudget {
  category: TransactionCategory;
  monthly_limit: number;
}

export interface CategoryReport {
  category: string;
  amount: number;
  budget?: number;
  percentage?: number;
  remaining?: number;
}

// Update ReportResponse
expenses_by_category: CategoryReport[];
```



### API Client

**File**: [`frontend/src/api/client.ts`](frontend/src/api/client.ts)

```typescript
export const budgets = {
  list: (): Promise<CategoryBudget[]> => request("/budgets"),
  set: (category: string, monthly_limit: number): Promise<CategoryBudget> =>
    request("/budgets", {
      method: "POST",
      body: JSON.stringify({ category, monthly_limit }),
    }),
  delete: (category: string): Promise<{ message: string }> =>
    request(`/budgets/${category}`, { method: "DELETE" }),
};
```



### Settings Page

**File**: [`frontend/src/pages/Settings.tsx`](frontend/src/pages/Settings.tsx)Add "Budget Limits" section after profile:

- List expense categories (exclude income, transfer)
- Input field for each category the user wants to budget
- "Add Budget" dropdown to select category
- Show category icon, name, and amount input
- "Remove" button for each budget
- Save all budgets at once

### Reports Page

**File**: [`frontend/src/pages/Reports.tsx`](frontend/src/pages/Reports.tsx)Update `CategoryBreakdown` component:

- Show budget progress bar when budget exists
- Color coding:
- Green: 0-80% used
- Yellow: 80-100% used
- Red: >100% used
- Display: `$X / $Y (Z%)` and `$W over/under budget`

## File Changes Summary

| File | Change ||------|--------|| `pkg/database/sqlite.go` | Add category_budgets table || `internal/models/budget.go` | New - Budget models || `internal/handlers/budgets.go` | New - Budget CRUD handlers || `internal/handlers/reports.go` | Update to include budget data || `cmd/server/main.go` | Add budget routes || `frontend/src/types/index.ts` | Add budget types || `frontend/src/api/client.ts` | Add budgets API || `frontend/src/pages/Settings.tsx` | Add budget management UI |