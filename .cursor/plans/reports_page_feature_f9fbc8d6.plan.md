---
name: Reports Page Feature
overview: Add a Reports page with monthly/weekly views showing income, expenses by category, and a donut chart visualization. All amounts converted to the user's preferred currency.
todos:
  - id: backend-reports
    content: Create reports handler with period aggregation and currency conversion
    status: completed
  - id: frontend-types-api
    content: Add report types and API client method
    status: completed
  - id: donut-chart
    content: Create SVG donut chart component with animations
    status: completed
  - id: category-breakdown
    content: Create category breakdown component with progress bars
    status: completed
  - id: reports-page
    content: Create Reports page with period selector and navigation
    status: completed
  - id: nav-integration
    content: Add Reports link to dashboard and routing
    status: completed
---

# Reports Page Feature

## Summary

A mobile-first reports page that displays:

- Total income (deposits only) for the selected period
- Total expenses broken down by category
- Donut chart visualization of expense categories
- Monthly view (default) with weekly toggle
- Historical navigation to view past periods

## UI/UX Design

### Mobile Layout (Primary)

1. **Period Selector** - Month/Week toggle at top, with left/right arrows to navigate history
2. **Income Summary Card** - Shows total deposits for the period
3. **Expenses Summary Card** - Shows total expenses with donut chart
4. **Category Breakdown** - List of categories sorted by amount, with progress bars showing percentage

### Navigation

- Add "Reports" icon to dashboard header (or bottom nav if we add one later)
- Accessible via `/reports` route

## Technical Implementation

### Backend Changes

**New endpoint:** `GET /api/reports`Query params:

- `period`: "month" or "week"
- `date`: ISO date string (e.g., "2025-12")

Response:

```json
{
  "period_start": "2025-12-01",
  "period_end": "2025-12-31",
  "currency": "DOP",
  "total_income": 50000,
  "total_expenses": 35000,
  "expenses_by_category": {
    "groceries": 12000,
    "dining": 8000,
    "transport": 5000
  },
  "first_transaction_date": "2025-01-15"
}
```

File: [`internal/handlers/reports.go`](internal/handlers/reports.go) (new)

- Query transactions within date range
- Convert all amounts to user's preferred currency
- Aggregate by category

### Frontend Changes

**New files:**

- [`frontend/src/pages/Reports.tsx`](frontend/src/pages/Reports.tsx) - Main reports page
- [`frontend/src/components/reports/DonutChart.tsx`](frontend/src/components/reports/DonutChart.tsx) - SVG donut chart component
- [`frontend/src/components/reports/CategoryBreakdown.tsx`](frontend/src/components/reports/CategoryBreakdown.tsx) - Category list with progress bars

**Modified files:**

- [`frontend/src/App.tsx`](frontend/src/App.tsx) - Add `/reports` route
- [`frontend/src/api/client.ts`](frontend/src/api/client.ts) - Add reports API
- [`frontend/src/types/index.ts`](frontend/src/types/index.ts) - Add report types
- [`frontend/src/pages/Dashboard.tsx`](frontend/src/pages/Dashboard.tsx) - Add Reports link in header

### Donut Chart

Pure SVG/CSS implementation (no external charting library) to keep bundle size small:

- Animated segments on load
- Center displays total expenses
- Tap segment to highlight category
- Colors from category or generated palette

## Future Consideration (Not in this implementation)

The page structure will support adding a "Budget" tab later where users can:

- Set monthly spending limits per category
- Compare actual vs budgeted amounts
- See overspending alerts

## File Changes Summary

| File | Change |

|------|--------|

| `internal/handlers/reports.go` | New - reports endpoint |

| `cmd/server/main.go` | Add reports route |

| `frontend/src/pages/Reports.tsx` | New - main page |

| `frontend/src/components/reports/DonutChart.tsx` | New - chart component |

| `frontend/src/components/reports/CategoryBreakdown.tsx` | New - category list |

| `frontend/src/App.tsx` | Add route |

| `frontend/src/api/client.ts` | Add API method |

| `frontend/src/types/index.ts` | Add types |