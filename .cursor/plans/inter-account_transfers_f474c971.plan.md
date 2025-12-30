---
name: Inter-Account Transfers
overview: ""
todos:
  - id: db-migration
    content: Add linked_transaction_id column to transactions table
    status: completed
  - id: transfer-handler
    content: Create Transfer handler with validation and cross-currency support
    status: completed
  - id: transfer-ui
    content: Update CreateTransactionModal with Transfer type and destination picker
    status: completed
  - id: transfer-display
    content: Update TransactionList to show transfer indicator
    status: completed
---

# Inter-Account Transfer Feature

## Summary

Add transfer capability to move money between accounts. Transfers create two linked transactions - a withdrawal from source and deposit to destination. Supports asset-to-asset transfers and payments to liabilities (loans, credit cards). Cross-currency transfers use exchange rates.

## Transfer Rules

| From | To | Result |

|------|-----|--------|

| Debit/Cash/Savings | Debit/Cash/Savings | Withdrawal + Deposit |

| Debit/Cash/Savings | Credit Card | Withdrawal + Reduce credit_owed |

| Debit/Cash/Savings | Loan | Withdrawal + Reduce loan_current_owed |

## Database Changes

Add `linked_transaction_id` column to transactions table to link transfer pairs:

```sql
ALTER TABLE transactions ADD COLUMN linked_transaction_id INTEGER REFERENCES transactions(id);
```



## Backend Changes

**New endpoint**: `POST /api/transfers`Request body:

```json
{
  "from_account_id": 1,
  "to_account_id": 2,
  "amount": 500.00,
  "description": "Monthly savings"
}
```

Handler logic in [`internal/handlers/transactions.go`](internal/handlers/transactions.go):

1. Validate both accounts belong to user
2. Check transfer direction is allowed (asset→asset or asset→liability)
3. If cross-currency, convert amount using exchange service
4. Create withdrawal transaction on source account
5. Create deposit/payment transaction on destination account
6. Link both transactions via `linked_transaction_id`
7. Update both account balances atomically

## Frontend Changes

**Modified**: [`frontend/src/components/transactions/CreateTransactionModal.tsx`](frontend/src/components/transactions/CreateTransactionModal.tsx)

- Add "Transfer" as a transaction type option
- When Transfer selected, show destination account dropdown
- Hide category selector (auto-assigned)
- Show converted amount preview for cross-currency

**Modified**: [`frontend/src/api/client.ts`](frontend/src/api/client.ts)

- Add `transfers.create()` method

**Modified**: [`frontend/src/components/transactions/TransactionList.tsx`](frontend/src/components/transactions/TransactionList.tsx)

- Show transfer icon and linked account name for transfer transactions

## File Changes

| File | Change |

|------|--------|

| `pkg/database/sqlite.go` | Add linked_transaction_id column migration |

| `internal/models/transaction.go` | Add LinkedTransactionID field |

| `internal/handlers/transactions.go` | Add Transfer handler |

| `cmd/server/main.go` | Add /api/transfers route |

| `frontend/src/types/index.ts` | Add transfer types |

| `frontend/src/api/client.ts` | Add transfers API |

| `frontend/src/components/transactions/CreateTransactionModal.tsx` | Add transfer UI |