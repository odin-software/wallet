package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/kengru/odin-wallet/internal/middleware"
	"github.com/kengru/odin-wallet/internal/services"
)

type ReportHandler struct {
	db              *sql.DB
	exchangeService *services.ExchangeService
}

func NewReportHandler(db *sql.DB, exchangeService *services.ExchangeService) *ReportHandler {
	return &ReportHandler{db: db, exchangeService: exchangeService}
}

type ReportResponse struct {
	PeriodStart          string             `json:"period_start"`
	PeriodEnd            string             `json:"period_end"`
	Currency             string             `json:"currency"`
	TotalIncome          float64            `json:"total_income"`
	TotalExpenses        float64            `json:"total_expenses"`
	ExpensesByCategory   map[string]float64 `json:"expenses_by_category"`
	FirstTransactionDate *string            `json:"first_transaction_date"`
}

func (h *ReportHandler) GetReport(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	// Parse query parameters
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "month"
	}

	dateStr := r.URL.Query().Get("date")
	var startDate, endDate time.Time

	now := time.Now()

	if dateStr == "" {
		// Default to current period
		if period == "week" {
			// Start of current week (Sunday)
			weekday := int(now.Weekday())
			startDate = time.Date(now.Year(), now.Month(), now.Day()-weekday, 0, 0, 0, 0, now.Location())
			endDate = startDate.AddDate(0, 0, 7).Add(-time.Second)
		} else {
			// Start of current month
			startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			endDate = startDate.AddDate(0, 1, 0).Add(-time.Second)
		}
	} else {
		// Parse the provided date
		if period == "week" {
			// Expect format: "2025-W52" or just a date like "2025-12-23"
			parsed, err := time.Parse("2006-01-02", dateStr)
			if err != nil {
				// Try parsing as year-month
				parsed, err = time.Parse("2006-01", dateStr)
				if err != nil {
					jsonError(w, "Invalid date format. Use YYYY-MM-DD or YYYY-MM", http.StatusBadRequest)
					return
				}
			}
			weekday := int(parsed.Weekday())
			startDate = time.Date(parsed.Year(), parsed.Month(), parsed.Day()-weekday, 0, 0, 0, 0, parsed.Location())
			endDate = startDate.AddDate(0, 0, 7).Add(-time.Second)
		} else {
			// Expect format: "2025-12"
			parsed, err := time.Parse("2006-01", dateStr)
			if err != nil {
				// Try full date format
				parsed, err = time.Parse("2006-01-02", dateStr)
				if err != nil {
					jsonError(w, "Invalid date format. Use YYYY-MM or YYYY-MM-DD", http.StatusBadRequest)
					return
				}
			}
			startDate = time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, parsed.Location())
			endDate = startDate.AddDate(0, 1, 0).Add(-time.Second)
		}
	}

	// Get user's preferred currency
	var preferredCurrency sql.NullString
	err := h.db.QueryRow("SELECT preferred_currency FROM users WHERE id = ?", userID).Scan(&preferredCurrency)
	if err != nil && err != sql.ErrNoRows {
		jsonError(w, "Failed to fetch user preferences", http.StatusInternalServerError)
		return
	}

	baseCurrency := "DOP"
	if preferredCurrency.Valid && preferredCurrency.String != "" {
		baseCurrency = preferredCurrency.String
	}

	// Get all user's account IDs with their currencies
	accountCurrencies := make(map[int64]string)
	accountRows, err := h.db.Query("SELECT id, currency FROM accounts WHERE user_id = ?", userID)
	if err != nil {
		jsonError(w, "Failed to fetch accounts", http.StatusInternalServerError)
		return
	}
	defer accountRows.Close()

	var accountIDs []int64
	for accountRows.Next() {
		var id int64
		var currency string
		if err := accountRows.Scan(&id, &currency); err != nil {
			continue
		}
		accountIDs = append(accountIDs, id)
		accountCurrencies[id] = currency
	}

	if len(accountIDs) == 0 {
		// No accounts, return empty report
		jsonResponse(w, ReportResponse{
			PeriodStart:        startDate.Format("2006-01-02"),
			PeriodEnd:          endDate.Format("2006-01-02"),
			Currency:           baseCurrency,
			TotalIncome:        0,
			TotalExpenses:      0,
			ExpensesByCategory: make(map[string]float64),
		}, http.StatusOK)
		return
	}

	// Build query for transactions within date range
	query := `
		SELECT t.account_id, t.type, t.amount, t.category, t.created_at
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		WHERE a.user_id = ? AND t.created_at >= ? AND t.created_at <= ?
		ORDER BY t.created_at DESC
	`

	rows, err := h.db.Query(query, userID, startDate.Format("2006-01-02 15:04:05"), endDate.Format("2006-01-02 15:04:05"))
	if err != nil {
		jsonError(w, "Failed to fetch transactions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var totalIncome, totalExpenses float64
	expensesByCategory := make(map[string]float64)

	for rows.Next() {
		var accountID int64
		var txType string
		var amount float64
		var category string
		var createdAt time.Time

		if err := rows.Scan(&accountID, &txType, &amount, &category, &createdAt); err != nil {
			continue
		}

		// Convert to base currency
		accountCurrency := accountCurrencies[accountID]
		convertedAmount := amount
		if accountCurrency != baseCurrency && h.exchangeService != nil {
			converted, err := h.exchangeService.Convert(amount, accountCurrency, baseCurrency)
			if err == nil {
				convertedAmount = converted
			}
		}

		// Categorize based on transaction type
		if txType == "deposit" {
			totalIncome += convertedAmount
		} else if txType == "withdrawal" || txType == "expense" {
			totalExpenses += convertedAmount
			expensesByCategory[category] += convertedAmount
		}
		// Note: "payment" type (credit card payments) are not counted as income or expense
		// They're internal transfers reducing debt
	}

	// Get first transaction date for this user
	var firstTxDate *string
	var firstDate sql.NullTime
	err = h.db.QueryRow(`
		SELECT MIN(t.created_at)
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		WHERE a.user_id = ?
	`, userID).Scan(&firstDate)
	if err == nil && firstDate.Valid {
		dateStr := firstDate.Time.Format("2006-01-02")
		firstTxDate = &dateStr
	}

	report := ReportResponse{
		PeriodStart:          startDate.Format("2006-01-02"),
		PeriodEnd:            endDate.Format("2006-01-02"),
		Currency:             baseCurrency,
		TotalIncome:          totalIncome,
		TotalExpenses:        totalExpenses,
		ExpensesByCategory:   expensesByCategory,
		FirstTransactionDate: firstTxDate,
	}

	jsonResponse(w, report, http.StatusOK)
}
