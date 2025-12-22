package models

import (
	"database/sql"
	"time"
)

// AccountType represents the type of financial account
type AccountType string

const (
	AccountTypeCash       AccountType = "cash"
	AccountTypeDebit      AccountType = "debit"
	AccountTypeCreditCard AccountType = "credit_card"
	AccountTypeLoan       AccountType = "loan"
	AccountTypeSaving     AccountType = "saving"
	AccountTypeInvestment AccountType = "investment"
)

// Account represents a financial account
type Account struct {
	ID        int64       `json:"id"`
	UserID    int64       `json:"user_id"`
	Name      string      `json:"name"`
	Type      AccountType `json:"type"`
	Color     string      `json:"color"`
	Currency  string      `json:"currency"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`

	// Common balance field (for cash, debit, saving, investment)
	CurrentBalance float64 `json:"current_balance"`

	// Credit card specific
	CreditLimit *float64 `json:"credit_limit,omitempty"`
	CreditOwed  *float64 `json:"credit_owed,omitempty"`
	ClosingDate *int     `json:"closing_date,omitempty"` // Day of month (1-31)

	// Loan specific
	LoanInitialAmount *float64 `json:"loan_initial_amount,omitempty"`
	LoanCurrentOwed   *float64 `json:"loan_current_owed,omitempty"`
	MonthlyPayment    *float64 `json:"monthly_payment,omitempty"`

	// Saving/Investment specific
	YearlyInterestRate *float64 `json:"yearly_interest_rate,omitempty"`
}

// AccountDB is used for database scanning with nullable fields
type AccountDB struct {
	ID                 int64
	UserID             int64
	Name               string
	Type               string
	Color              string
	Currency           string
	CurrentBalance     float64
	CreditLimit        sql.NullFloat64
	CreditOwed         sql.NullFloat64
	ClosingDate        sql.NullInt64
	LoanInitialAmount  sql.NullFloat64
	LoanCurrentOwed    sql.NullFloat64
	MonthlyPayment     sql.NullFloat64
	YearlyInterestRate sql.NullFloat64
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// ToAccount converts AccountDB to Account
func (a *AccountDB) ToAccount() *Account {
	account := &Account{
		ID:             a.ID,
		UserID:         a.UserID,
		Name:           a.Name,
		Type:           AccountType(a.Type),
		Color:          a.Color,
		Currency:       a.Currency,
		CurrentBalance: a.CurrentBalance,
		CreatedAt:      a.CreatedAt,
		UpdatedAt:      a.UpdatedAt,
	}

	if a.CreditLimit.Valid {
		account.CreditLimit = &a.CreditLimit.Float64
	}
	if a.CreditOwed.Valid {
		account.CreditOwed = &a.CreditOwed.Float64
	}
	if a.ClosingDate.Valid {
		closingDate := int(a.ClosingDate.Int64)
		account.ClosingDate = &closingDate
	}
	if a.LoanInitialAmount.Valid {
		account.LoanInitialAmount = &a.LoanInitialAmount.Float64
	}
	if a.LoanCurrentOwed.Valid {
		account.LoanCurrentOwed = &a.LoanCurrentOwed.Float64
	}
	if a.MonthlyPayment.Valid {
		account.MonthlyPayment = &a.MonthlyPayment.Float64
	}
	if a.YearlyInterestRate.Valid {
		account.YearlyInterestRate = &a.YearlyInterestRate.Float64
	}

	return account
}

// CreateAccountRequest represents the request to create an account
type CreateAccountRequest struct {
	Name     string      `json:"name"`
	Type     AccountType `json:"type"`
	Color    string      `json:"color"`
	Currency string      `json:"currency"`

	// Initial balance for cash/debit/saving/investment
	InitialBalance *float64 `json:"initial_balance,omitempty"`

	// Credit card specific
	CreditLimit *float64 `json:"credit_limit,omitempty"`
	CreditOwed  *float64 `json:"credit_owed,omitempty"`
	ClosingDate *int     `json:"closing_date,omitempty"`

	// Loan specific
	LoanInitialAmount *float64 `json:"loan_initial_amount,omitempty"`
	LoanCurrentOwed   *float64 `json:"loan_current_owed,omitempty"`
	MonthlyPayment    *float64 `json:"monthly_payment,omitempty"`

	// Saving/Investment specific
	YearlyInterestRate *float64 `json:"yearly_interest_rate,omitempty"`
}

// UpdateAccountRequest represents the request to update an account
type UpdateAccountRequest struct {
	Name     *string `json:"name,omitempty"`
	Color    *string `json:"color,omitempty"`
	Currency *string `json:"currency,omitempty"`

	// Type-specific updates
	CurrentBalance     *float64 `json:"current_balance,omitempty"`
	CreditLimit        *float64 `json:"credit_limit,omitempty"`
	CreditOwed         *float64 `json:"credit_owed,omitempty"`
	ClosingDate        *int     `json:"closing_date,omitempty"`
	LoanCurrentOwed    *float64 `json:"loan_current_owed,omitempty"`
	MonthlyPayment     *float64 `json:"monthly_payment,omitempty"`
	YearlyInterestRate *float64 `json:"yearly_interest_rate,omitempty"`
}

// FinancialOverview represents the user's financial summary
type FinancialOverview struct {
	TotalAssets      float64            `json:"total_assets"`
	TotalLiabilities float64            `json:"total_liabilities"`
	NetWorth         float64            `json:"net_worth"`
	AssetsByType     map[string]float64 `json:"assets_by_type"`
	LiabilitiesByType map[string]float64 `json:"liabilities_by_type"`
}

// IsAssetAccount returns true if this account type is an asset
func (a *Account) IsAssetAccount() bool {
	switch a.Type {
	case AccountTypeCash, AccountTypeDebit, AccountTypeSaving, AccountTypeInvestment:
		return true
	default:
		return false
	}
}

// IsLiabilityAccount returns true if this account type is a liability
func (a *Account) IsLiabilityAccount() bool {
	switch a.Type {
	case AccountTypeCreditCard, AccountTypeLoan:
		return true
	default:
		return false
	}
}

// GetDisplayBalance returns the balance to display for this account type
func (a *Account) GetDisplayBalance() float64 {
	switch a.Type {
	case AccountTypeCreditCard:
		if a.CreditOwed != nil {
			return *a.CreditOwed
		}
		return 0
	case AccountTypeLoan:
		if a.LoanCurrentOwed != nil {
			return *a.LoanCurrentOwed
		}
		return 0
	default:
		return a.CurrentBalance
	}
}

// GetLiabilityAmount returns the liability amount for overview calculations
func (a *Account) GetLiabilityAmount() float64 {
	switch a.Type {
	case AccountTypeCreditCard:
		if a.CreditOwed != nil {
			return *a.CreditOwed
		}
		return 0
	case AccountTypeLoan:
		if a.LoanCurrentOwed != nil {
			return *a.LoanCurrentOwed
		}
		return 0
	default:
		return 0
	}
}
