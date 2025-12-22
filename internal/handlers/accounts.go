package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kengru/odin-wallet/internal/middleware"
	"github.com/kengru/odin-wallet/internal/models"
)

type AccountHandler struct {
	db *sql.DB
}

func NewAccountHandler(db *sql.DB) *AccountHandler {
	return &AccountHandler{db: db}
}

func (h *AccountHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(`
		SELECT id, user_id, name, type, color, currency, current_balance,
			   credit_limit, credit_owed, closing_date,
			   loan_initial_amount, loan_current_owed, monthly_payment,
			   yearly_interest_rate, created_at, updated_at
		FROM accounts
		WHERE user_id = ?
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		jsonError(w, "Failed to fetch accounts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	accounts := []models.Account{}
	for rows.Next() {
		var a models.AccountDB
		err := rows.Scan(
			&a.ID, &a.UserID, &a.Name, &a.Type, &a.Color, &a.Currency, &a.CurrentBalance,
			&a.CreditLimit, &a.CreditOwed, &a.ClosingDate,
			&a.LoanInitialAmount, &a.LoanCurrentOwed, &a.MonthlyPayment,
			&a.YearlyInterestRate, &a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			jsonError(w, "Failed to scan account", http.StatusInternalServerError)
			return
		}
		accounts = append(accounts, *a.ToAccount())
	}

	jsonResponse(w, accounts, http.StatusOK)
}

func (h *AccountHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	var req models.CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Name == "" {
		jsonError(w, "Account name is required", http.StatusBadRequest)
		return
	}

	// Validate account type
	validTypes := []models.AccountType{
		models.AccountTypeCash, models.AccountTypeDebit, models.AccountTypeCreditCard,
		models.AccountTypeLoan, models.AccountTypeSaving, models.AccountTypeInvestment,
	}
	validType := false
	for _, t := range validTypes {
		if t == req.Type {
			validType = true
			break
		}
	}
	if !validType {
		jsonError(w, "Invalid account type", http.StatusBadRequest)
		return
	}

	// Set defaults
	if req.Color == "" {
		req.Color = "#DDE61F"
	}
	if req.Currency == "" {
		req.Currency = "USD"
	}

	// Prepare values based on account type
	var currentBalance float64
	var creditLimit, creditOwed, loanInitialAmount, loanCurrentOwed, monthlyPayment, yearlyInterestRate sql.NullFloat64
	var closingDate sql.NullInt64

	switch req.Type {
	case models.AccountTypeCash, models.AccountTypeDebit:
		if req.InitialBalance != nil {
			currentBalance = *req.InitialBalance
		}

	case models.AccountTypeCreditCard:
		if req.CreditLimit != nil {
			creditLimit = sql.NullFloat64{Float64: *req.CreditLimit, Valid: true}
		}
		if req.CreditOwed != nil {
			creditOwed = sql.NullFloat64{Float64: *req.CreditOwed, Valid: true}
		}
		if req.ClosingDate != nil {
			closingDate = sql.NullInt64{Int64: int64(*req.ClosingDate), Valid: true}
		}

	case models.AccountTypeLoan:
		if req.LoanInitialAmount != nil {
			loanInitialAmount = sql.NullFloat64{Float64: *req.LoanInitialAmount, Valid: true}
		}
		if req.LoanCurrentOwed != nil {
			loanCurrentOwed = sql.NullFloat64{Float64: *req.LoanCurrentOwed, Valid: true}
		}
		if req.MonthlyPayment != nil {
			monthlyPayment = sql.NullFloat64{Float64: *req.MonthlyPayment, Valid: true}
		}

	case models.AccountTypeSaving, models.AccountTypeInvestment:
		if req.InitialBalance != nil {
			currentBalance = *req.InitialBalance
		}
		if req.YearlyInterestRate != nil {
			yearlyInterestRate = sql.NullFloat64{Float64: *req.YearlyInterestRate, Valid: true}
		}
	}

	now := time.Now()
	result, err := h.db.Exec(`
		INSERT INTO accounts (
			user_id, name, type, color, currency, current_balance,
			credit_limit, credit_owed, closing_date,
			loan_initial_amount, loan_current_owed, monthly_payment,
			yearly_interest_rate, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, userID, req.Name, string(req.Type), req.Color, req.Currency, currentBalance,
		creditLimit, creditOwed, closingDate,
		loanInitialAmount, loanCurrentOwed, monthlyPayment,
		yearlyInterestRate, now, now)

	if err != nil {
		jsonError(w, "Failed to create account", http.StatusInternalServerError)
		return
	}

	accountID, _ := result.LastInsertId()

	// Fetch and return the created account
	account, err := h.getAccountByID(accountID, userID)
	if err != nil {
		jsonError(w, "Account created but failed to fetch", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, account, http.StatusCreated)
}

func (h *AccountHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	accountID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		jsonError(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	account, err := h.getAccountByID(accountID, userID)
	if err == sql.ErrNoRows {
		jsonError(w, "Account not found", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, "Failed to fetch account", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, account, http.StatusOK)
}

func (h *AccountHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	accountID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		jsonError(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	// Verify ownership
	var exists bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM accounts WHERE id = ? AND user_id = ?)", accountID, userID).Scan(&exists)
	if err != nil || !exists {
		jsonError(w, "Account not found", http.StatusNotFound)
		return
	}

	var req models.UpdateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}

	if req.Name != nil {
		updates = append(updates, "name = ?")
		args = append(args, *req.Name)
	}
	if req.Color != nil {
		updates = append(updates, "color = ?")
		args = append(args, *req.Color)
	}
	if req.Currency != nil {
		updates = append(updates, "currency = ?")
		args = append(args, *req.Currency)
	}
	if req.CurrentBalance != nil {
		updates = append(updates, "current_balance = ?")
		args = append(args, *req.CurrentBalance)
	}
	if req.CreditLimit != nil {
		updates = append(updates, "credit_limit = ?")
		args = append(args, *req.CreditLimit)
	}
	if req.CreditOwed != nil {
		updates = append(updates, "credit_owed = ?")
		args = append(args, *req.CreditOwed)
	}
	if req.ClosingDate != nil {
		updates = append(updates, "closing_date = ?")
		args = append(args, *req.ClosingDate)
	}
	if req.LoanCurrentOwed != nil {
		updates = append(updates, "loan_current_owed = ?")
		args = append(args, *req.LoanCurrentOwed)
	}
	if req.MonthlyPayment != nil {
		updates = append(updates, "monthly_payment = ?")
		args = append(args, *req.MonthlyPayment)
	}
	if req.YearlyInterestRate != nil {
		updates = append(updates, "yearly_interest_rate = ?")
		args = append(args, *req.YearlyInterestRate)
	}

	if len(updates) == 0 {
		jsonError(w, "No fields to update", http.StatusBadRequest)
		return
	}

	updates = append(updates, "updated_at = ?")
	args = append(args, time.Now())
	args = append(args, accountID, userID)

	query := "UPDATE accounts SET "
	for i, u := range updates {
		if i > 0 {
			query += ", "
		}
		query += u
	}
	query += " WHERE id = ? AND user_id = ?"

	_, err = h.db.Exec(query, args...)
	if err != nil {
		jsonError(w, "Failed to update account", http.StatusInternalServerError)
		return
	}

	// Fetch and return updated account
	account, err := h.getAccountByID(accountID, userID)
	if err != nil {
		jsonError(w, "Account updated but failed to fetch", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, account, http.StatusOK)
}

func (h *AccountHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	accountID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		jsonError(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec("DELETE FROM accounts WHERE id = ? AND user_id = ?", accountID, userID)
	if err != nil {
		jsonError(w, "Failed to delete account", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		jsonError(w, "Account not found", http.StatusNotFound)
		return
	}

	jsonResponse(w, map[string]string{"message": "Account deleted successfully"}, http.StatusOK)
}

func (h *AccountHandler) Overview(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(`
		SELECT type, current_balance, credit_owed, loan_current_owed
		FROM accounts
		WHERE user_id = ?
	`, userID)
	if err != nil {
		jsonError(w, "Failed to fetch accounts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	overview := models.FinancialOverview{
		AssetsByType:      make(map[string]float64),
		LiabilitiesByType: make(map[string]float64),
	}

	for rows.Next() {
		var accountType string
		var currentBalance float64
		var creditOwed, loanCurrentOwed sql.NullFloat64

		err := rows.Scan(&accountType, &currentBalance, &creditOwed, &loanCurrentOwed)
		if err != nil {
			continue
		}

		switch models.AccountType(accountType) {
		case models.AccountTypeCash, models.AccountTypeDebit, models.AccountTypeSaving, models.AccountTypeInvestment:
			overview.TotalAssets += currentBalance
			overview.AssetsByType[accountType] += currentBalance
		case models.AccountTypeCreditCard:
			if creditOwed.Valid {
				overview.TotalLiabilities += creditOwed.Float64
				overview.LiabilitiesByType[accountType] += creditOwed.Float64
			}
		case models.AccountTypeLoan:
			if loanCurrentOwed.Valid {
				overview.TotalLiabilities += loanCurrentOwed.Float64
				overview.LiabilitiesByType[accountType] += loanCurrentOwed.Float64
			}
		}
	}

	overview.NetWorth = overview.TotalAssets - overview.TotalLiabilities

	jsonResponse(w, overview, http.StatusOK)
}

func (h *AccountHandler) getAccountByID(accountID, userID int64) (*models.Account, error) {
	var a models.AccountDB
	err := h.db.QueryRow(`
		SELECT id, user_id, name, type, color, currency, current_balance,
			   credit_limit, credit_owed, closing_date,
			   loan_initial_amount, loan_current_owed, monthly_payment,
			   yearly_interest_rate, created_at, updated_at
		FROM accounts
		WHERE id = ? AND user_id = ?
	`, accountID, userID).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Type, &a.Color, &a.Currency, &a.CurrentBalance,
		&a.CreditLimit, &a.CreditOwed, &a.ClosingDate,
		&a.LoanInitialAmount, &a.LoanCurrentOwed, &a.MonthlyPayment,
		&a.YearlyInterestRate, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return a.ToAccount(), nil
}
