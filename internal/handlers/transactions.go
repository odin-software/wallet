package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/kengru/odin-wallet/internal/middleware"
	"github.com/kengru/odin-wallet/internal/models"
)

type TransactionHandler struct {
	db *sql.DB
}

func NewTransactionHandler(db *sql.DB) *TransactionHandler {
	return &TransactionHandler{db: db}
}

func (h *TransactionHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	// Get account and verify ownership
	var accountType string
	var currentBalance float64
	var creditOwed, loanCurrentOwed sql.NullFloat64
	err = h.db.QueryRow(`
		SELECT type, current_balance, credit_owed, loan_current_owed
		FROM accounts
		WHERE id = ? AND user_id = ?
	`, accountID, userID).Scan(&accountType, &currentBalance, &creditOwed, &loanCurrentOwed)

	if err == sql.ErrNoRows {
		jsonError(w, "Account not found", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, "Failed to fetch account", http.StatusInternalServerError)
		return
	}

	var req models.CreateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate transaction type for account type
	if !models.IsValidTransactionType(req.Type, models.AccountType(accountType)) {
		jsonError(w, "Invalid transaction type for this account", http.StatusBadRequest)
		return
	}

	// Validate amount
	if req.Amount <= 0 {
		jsonError(w, "Amount must be positive", http.StatusBadRequest)
		return
	}

	// Set default category if empty
	if req.Category == "" {
		req.Category = models.CategoryOther
	}

	// Calculate new balance and update account
	var balanceAfter float64
	var updateQuery string
	var updateValue float64

	switch models.AccountType(accountType) {
	case models.AccountTypeCash, models.AccountTypeDebit, models.AccountTypeSaving, models.AccountTypeInvestment:
		if req.Type == models.TransactionTypeDeposit {
			balanceAfter = currentBalance + req.Amount
		} else { // withdrawal
			balanceAfter = currentBalance - req.Amount
		}
		updateQuery = "UPDATE accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
		updateValue = balanceAfter

	case models.AccountTypeCreditCard:
		owed := float64(0)
		if creditOwed.Valid {
			owed = creditOwed.Float64
		}
		if req.Type == models.TransactionTypeExpense {
			balanceAfter = owed + req.Amount
		} else { // payment
			balanceAfter = owed - req.Amount
		}
		updateQuery = "UPDATE accounts SET credit_owed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
		updateValue = balanceAfter

	case models.AccountTypeLoan:
		owed := float64(0)
		if loanCurrentOwed.Valid {
			owed = loanCurrentOwed.Float64
		}
		// Loan only supports payment type
		balanceAfter = owed - req.Amount
		updateQuery = "UPDATE accounts SET loan_current_owed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
		updateValue = balanceAfter
	}

	// Use transaction for atomicity
	tx, err := h.db.Begin()
	if err != nil {
		jsonError(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Update account balance
	_, err = tx.Exec(updateQuery, updateValue, accountID)
	if err != nil {
		jsonError(w, "Failed to update account balance", http.StatusInternalServerError)
		return
	}

	// Insert transaction
	result, err := tx.Exec(`
		INSERT INTO transactions (account_id, type, amount, description, category, balance_after)
		VALUES (?, ?, ?, ?, ?, ?)
	`, accountID, string(req.Type), req.Amount, req.Description, string(req.Category), balanceAfter)
	if err != nil {
		jsonError(w, "Failed to create transaction", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		jsonError(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	transactionID, _ := result.LastInsertId()

	// Fetch and return the created transaction
	var transaction models.Transaction
	err = h.db.QueryRow(`
		SELECT id, account_id, type, amount, description, category, balance_after, created_at
		FROM transactions
		WHERE id = ?
	`, transactionID).Scan(
		&transaction.ID, &transaction.AccountID, &transaction.Type,
		&transaction.Amount, &transaction.Description, &transaction.Category,
		&transaction.BalanceAfter, &transaction.CreatedAt,
	)
	if err != nil {
		jsonError(w, "Transaction created but failed to fetch", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, transaction, http.StatusCreated)
}

func (h *TransactionHandler) ListByAccount(w http.ResponseWriter, r *http.Request) {
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

	// Verify account ownership
	var exists bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM accounts WHERE id = ? AND user_id = ?)", accountID, userID).Scan(&exists)
	if err != nil || !exists {
		jsonError(w, "Account not found", http.StatusNotFound)
		return
	}

	// Parse pagination params
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// Get total count
	var total int
	err = h.db.QueryRow("SELECT COUNT(*) FROM transactions WHERE account_id = ?", accountID).Scan(&total)
	if err != nil {
		jsonError(w, "Failed to count transactions", http.StatusInternalServerError)
		return
	}

	// Get transactions
	rows, err := h.db.Query(`
		SELECT id, account_id, type, amount, description, category, balance_after, created_at
		FROM transactions
		WHERE account_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, accountID, pageSize, offset)
	if err != nil {
		jsonError(w, "Failed to fetch transactions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	transactions := []models.Transaction{}
	for rows.Next() {
		var t models.Transaction
		err := rows.Scan(
			&t.ID, &t.AccountID, &t.Type,
			&t.Amount, &t.Description, &t.Category,
			&t.BalanceAfter, &t.CreatedAt,
		)
		if err != nil {
			continue
		}
		transactions = append(transactions, t)
	}

	jsonResponse(w, models.TransactionListResponse{
		Transactions: transactions,
		Total:        total,
		Page:         page,
		PageSize:     pageSize,
	}, http.StatusOK)
}

func (h *TransactionHandler) Recent(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 10
	}

	rows, err := h.db.Query(`
		SELECT t.id, t.account_id, t.type, t.amount, t.description, t.category, t.balance_after, t.created_at
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		WHERE a.user_id = ?
		ORDER BY t.created_at DESC
		LIMIT ?
	`, userID, limit)
	if err != nil {
		jsonError(w, "Failed to fetch transactions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	transactions := []models.Transaction{}
	for rows.Next() {
		var t models.Transaction
		err := rows.Scan(
			&t.ID, &t.AccountID, &t.Type,
			&t.Amount, &t.Description, &t.Category,
			&t.BalanceAfter, &t.CreatedAt,
		)
		if err != nil {
			continue
		}
		transactions = append(transactions, t)
	}

	jsonResponse(w, transactions, http.StatusOK)
}
