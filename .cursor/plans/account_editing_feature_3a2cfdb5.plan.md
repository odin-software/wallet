---
name: Account Editing Feature
overview: Add the ability to edit accounts from the account detail page. Users can edit name, color, and type-specific fields. For asset accounts (cash/debit/savings/investment), balance can be adjusted either directly or via an adjustment transaction.
todos:
  - id: backend-adjust
    content: Add balance adjustment endpoint to accounts handler
    status: completed
  - id: edit-modal
    content: Create EditAccountModal component with form and balance adjustment
    status: completed
  - id: detail-integration
    content: Add edit button to AccountDetail page and integrate modal
    status: completed
---

# Account Editing Feature

## Summary

Enable account editing from the account detail page with:

- Basic fields: name, color
- Type-specific fields: interest rate (savings/investment), credit limit (credit cards), monthly payment (loans)
- Balance adjustment for asset accounts: direct reset or via adjustment transaction
- Credit card/loan balances only change via transactions (not direct edit)

## Editable Fields by Account Type

| Account Type | Editable Fields |

|--------------|-----------------|

| Cash/Debit | name, color, balance (direct or via transaction) |

| Savings/Investment | name, color, balance, interest rate |

| Credit Card | name, color, credit limit |

| Loan | name, color, monthly payment |

## UI Design

### Account Detail Page Changes

Add an "Edit" button in the header that opens an edit modal/sheet with:

1. **Basic Section**

- Name input
- Color picker (same as create modal)

2. **Type-Specific Section** (conditional)

- Savings/Investment: Interest rate input
- Credit Card: Credit limit input
- Loan: Monthly payment input

3. **Balance Adjustment Section** (only for cash/debit/savings/investment)

- Two options presented as tabs or radio:
    - **Direct Reset**: Input new balance, overwrites current
    - **Adjustment Transaction**: Input adjustment amount (+/-), creates a transaction record
- Shows current balance for reference

## Technical Implementation

### Backend

**Existing endpoint** `PUT /api/accounts/{id}` in [`internal/handlers/accounts.go`](internal/handlers/accounts.go):

- Already supports updating most fields
- Add logic for balance adjustment transaction creation

**New endpoint** `POST /api/accounts/{id}/adjust-balance`:

- Creates an adjustment transaction (type: "deposit" or "withdrawal")
- Category: "transfer" (balance adjustment)
- Updates account balance

### Frontend

**New file:** `frontend/src/components/accounts/EditAccountModal.tsx`

- Form for editing account fields
- Balance adjustment section with tabs

**Modified files:**

- [`frontend/src/pages/AccountDetail.tsx`](frontend/src/pages/AccountDetail.tsx) - Add Edit button and modal
- [`frontend/src/api/client.ts`](frontend/src/api/client.ts) - Add adjustBalance method

## File Changes Summary

| File | Change |

|------|--------|

| `internal/handlers/accounts.go` | Add AdjustBalance handler |

| `cmd/server/main.go` | Add adjust-balance route |

| `frontend/src/components/accounts/EditAccountModal.tsx` | New - edit form |

| `frontend/src/pages/AccountDetail.tsx` | Add edit button/modal |