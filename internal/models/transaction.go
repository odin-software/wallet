package models

import "time"

// TransactionType represents the type of transaction
type TransactionType string

const (
	TransactionTypeDeposit    TransactionType = "deposit"
	TransactionTypeWithdrawal TransactionType = "withdrawal"
	TransactionTypeExpense    TransactionType = "expense"
	TransactionTypePayment    TransactionType = "payment"
)

// TransactionCategory represents predefined expense categories
type TransactionCategory string

const (
	CategoryGroceries     TransactionCategory = "groceries"
	CategoryDining        TransactionCategory = "dining"
	CategoryTransport     TransactionCategory = "transport"
	CategoryUtilities     TransactionCategory = "utilities"
	CategoryRent          TransactionCategory = "rent"
	CategoryHealthcare    TransactionCategory = "healthcare"
	CategoryEntertainment TransactionCategory = "entertainment"
	CategoryShopping      TransactionCategory = "shopping"
	CategorySubscriptions TransactionCategory = "subscriptions"
	CategoryGames         TransactionCategory = "games"
	CategoryTravel        TransactionCategory = "travel"
	CategoryEducation     TransactionCategory = "education"
	CategoryFitness       TransactionCategory = "fitness"
	CategoryPersonal      TransactionCategory = "personal"
	CategoryGifts         TransactionCategory = "gifts"
	CategoryIncome        TransactionCategory = "income"
	CategoryTransfer      TransactionCategory = "transfer"
	CategoryOther         TransactionCategory = "other"
)

// AllCategories returns all available transaction categories
func AllCategories() []TransactionCategory {
	return []TransactionCategory{
		CategoryGroceries,
		CategoryDining,
		CategoryTransport,
		CategoryUtilities,
		CategoryRent,
		CategoryHealthcare,
		CategoryEntertainment,
		CategoryShopping,
		CategorySubscriptions,
		CategoryGames,
		CategoryTravel,
		CategoryEducation,
		CategoryFitness,
		CategoryPersonal,
		CategoryGifts,
		CategoryIncome,
		CategoryTransfer,
		CategoryOther,
	}
}

// CategoryLabels returns human-readable labels for categories
var CategoryLabels = map[TransactionCategory]string{
	CategoryGroceries:     "Groceries",
	CategoryDining:        "Dining",
	CategoryTransport:     "Transport",
	CategoryUtilities:     "Utilities",
	CategoryRent:          "Rent",
	CategoryHealthcare:    "Healthcare",
	CategoryEntertainment: "Entertainment",
	CategoryShopping:      "Shopping",
	CategorySubscriptions: "Subscriptions",
	CategoryGames:         "Games",
	CategoryTravel:        "Travel",
	CategoryEducation:     "Education",
	CategoryFitness:       "Fitness",
	CategoryPersonal:      "Personal",
	CategoryGifts:         "Gifts",
	CategoryIncome:        "Income",
	CategoryTransfer:      "Transfer",
	CategoryOther:         "Other",
}

// Transaction represents a financial transaction
type Transaction struct {
	ID                  int64               `json:"id"`
	AccountID           int64               `json:"account_id"`
	Type                TransactionType     `json:"type"`
	Amount              float64             `json:"amount"`
	Description         string              `json:"description"`
	Category            TransactionCategory `json:"category"`
	BalanceAfter        float64             `json:"balance_after"`
	LinkedTransactionID *int64              `json:"linked_transaction_id,omitempty"`
	LinkedAccountName   string              `json:"linked_account_name,omitempty"`
	CreatedAt           time.Time           `json:"created_at"`
}

// CreateTransactionRequest represents the request to create a transaction
type CreateTransactionRequest struct {
	Type        TransactionType     `json:"type"`
	Amount      float64             `json:"amount"`
	Description string              `json:"description"`
	Category    TransactionCategory `json:"category"`
}

// TransferRequest represents the request to create a transfer between accounts
type TransferRequest struct {
	FromAccountID int64   `json:"from_account_id"`
	ToAccountID   int64   `json:"to_account_id"`
	Amount        float64 `json:"amount"`
	Description   string  `json:"description"`
}

// TransactionListResponse represents paginated transaction list
type TransactionListResponse struct {
	Transactions []Transaction `json:"transactions"`
	Total        int           `json:"total"`
	Page         int           `json:"page"`
	PageSize     int           `json:"page_size"`
}

// ValidTransactionTypesForAccount returns valid transaction types for an account type
func ValidTransactionTypesForAccount(accountType AccountType) []TransactionType {
	switch accountType {
	case AccountTypeCash, AccountTypeDebit, AccountTypeSaving, AccountTypeInvestment:
		return []TransactionType{TransactionTypeDeposit, TransactionTypeWithdrawal}
	case AccountTypeCreditCard:
		return []TransactionType{TransactionTypeExpense, TransactionTypePayment}
	case AccountTypeLoan:
		return []TransactionType{TransactionTypePayment}
	default:
		return []TransactionType{}
	}
}

// IsValidTransactionType checks if a transaction type is valid for an account type
func IsValidTransactionType(txType TransactionType, accountType AccountType) bool {
	validTypes := ValidTransactionTypesForAccount(accountType)
	for _, t := range validTypes {
		if t == txType {
			return true
		}
	}
	return false
}
