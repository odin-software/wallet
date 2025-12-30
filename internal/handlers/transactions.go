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
	"github.com/kengru/odin-wallet/internal/services"
)

type TransactionHandler struct {
	db              *sql.DB
	exchangeService *services.ExchangeService
}

func NewTransactionHandler(db *sql.DB, exchangeService *services.ExchangeService) *TransactionHandler {
	return &TransactionHandler{db: db, exchangeService: exchangeService}
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
		SELECT t.id, t.account_id, t.type, t.amount, t.description, t.category, t.balance_after,
		       t.linked_transaction_id, t.created_at,
		       COALESCE((SELECT a2.name FROM transactions t2
		                 JOIN accounts a2 ON t2.account_id = a2.id
		                 WHERE t2.id = t.linked_transaction_id), '') as linked_account_name
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
		var linkedID sql.NullInt64
		var linkedName string
		err := rows.Scan(
			&t.ID, &t.AccountID, &t.Type,
			&t.Amount, &t.Description, &t.Category,
			&t.BalanceAfter, &linkedID, &t.CreatedAt, &linkedName,
		)
		if err != nil {
			continue
		}
		if linkedID.Valid {
			t.LinkedTransactionID = &linkedID.Int64
			t.LinkedAccountName = linkedName
		}
		transactions = append(transactions, t)
	}

	jsonResponse(w, transactions, http.StatusOK)
}

// Transfer handles inter-account transfers
func (h *TransactionHandler) Transfer(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	var req models.TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate amount
	if req.Amount <= 0 {
		jsonError(w, "Amount must be positive", http.StatusBadRequest)
		return
	}

	if req.FromAccountID == req.ToAccountID {
		jsonError(w, "Cannot transfer to the same account", http.StatusBadRequest)
		return
	}

	// Fetch both accounts
	type accountInfo struct {
		ID             int64
		Name           string
		Type           models.AccountType
		Currency       string
		CurrentBalance float64
		CreditOwed     sql.NullFloat64
		LoanOwed       sql.NullFloat64
	}

	var fromAccount, toAccount accountInfo

	err := h.db.QueryRow(`
		SELECT id, name, type, currency, current_balance, credit_owed, loan_current_owed
		FROM accounts WHERE id = ? AND user_id = ?
	`, req.FromAccountID, userID).Scan(
		&fromAccount.ID, &fromAccount.Name, &fromAccount.Type, &fromAccount.Currency,
		&fromAccount.CurrentBalance, &fromAccount.CreditOwed, &fromAccount.LoanOwed,
	)
	if err == sql.ErrNoRows {
		jsonError(w, "Source account not found", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, "Failed to fetch source account", http.StatusInternalServerError)
		return
	}

	err = h.db.QueryRow(`
		SELECT id, name, type, currency, current_balance, credit_owed, loan_current_owed
		FROM accounts WHERE id = ? AND user_id = ?
	`, req.ToAccountID, userID).Scan(
		&toAccount.ID, &toAccount.Name, &toAccount.Type, &toAccount.Currency,
		&toAccount.CurrentBalance, &toAccount.CreditOwed, &toAccount.LoanOwed,
	)
	if err == sql.ErrNoRows {
		jsonError(w, "Destination account not found", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, "Failed to fetch destination account", http.StatusInternalServerError)
		return
	}

	// Validate transfer direction
	// Source must be an asset account
	assetTypes := map[models.AccountType]bool{
		models.AccountTypeCash:       true,
		models.AccountTypeDebit:      true,
		models.AccountTypeSaving:     true,
		models.AccountTypeInvestment: true,
	}
	if !assetTypes[fromAccount.Type] {
		jsonError(w, "Can only transfer from asset accounts (cash, debit, savings, investment)", http.StatusBadRequest)
		return
	}

	// Destination can be asset or liability
	validDestTypes := map[models.AccountType]bool{
		models.AccountTypeCash:       true,
		models.AccountTypeDebit:      true,
		models.AccountTypeSaving:     true,
		models.AccountTypeInvestment: true,
		models.AccountTypeCreditCard: true,
		models.AccountTypeLoan:       true,
	}
	if !validDestTypes[toAccount.Type] {
		jsonError(w, "Invalid destination account type", http.StatusBadRequest)
		return
	}

	// Handle currency conversion
	fromAmount := req.Amount
	toAmount := req.Amount

	if fromAccount.Currency != toAccount.Currency {
		convertedAmount, err := h.exchangeService.Convert(req.Amount, fromAccount.Currency, toAccount.Currency)
		if err != nil {
			jsonError(w, "Failed to convert currency: "+err.Error(), http.StatusInternalServerError)
			return
		}
		toAmount = convertedAmount
	}

	// Calculate new balances
	fromNewBalance := fromAccount.CurrentBalance - fromAmount

	var toNewBalance float64
	var toUpdateQuery string

	switch toAccount.Type {
	case models.AccountTypeCash, models.AccountTypeDebit, models.AccountTypeSaving, models.AccountTypeInvestment:
		toNewBalance = toAccount.CurrentBalance + toAmount
		toUpdateQuery = "UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?"
	case models.AccountTypeCreditCard:
		owed := float64(0)
		if toAccount.CreditOwed.Valid {
			owed = toAccount.CreditOwed.Float64
		}
		toNewBalance = owed - toAmount // Payment reduces owed
		toUpdateQuery = "UPDATE accounts SET credit_owed = ?, updated_at = ? WHERE id = ?"
	case models.AccountTypeLoan:
		owed := float64(0)
		if toAccount.LoanOwed.Valid {
			owed = toAccount.LoanOwed.Float64
		}
		toNewBalance = owed - toAmount // Payment reduces owed
		toUpdateQuery = "UPDATE accounts SET loan_current_owed = ?, updated_at = ? WHERE id = ?"
	}

	// Start database transaction
	tx, err := h.db.Begin()
	if err != nil {
		jsonError(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	now := time.Now()

	// Update source account (withdrawal)
	_, err = tx.Exec("UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?",
		fromNewBalance, now, fromAccount.ID)
	if err != nil {
		jsonError(w, "Failed to update source account", http.StatusInternalServerError)
		return
	}

	// Update destination account
	_, err = tx.Exec(toUpdateQuery, toNewBalance, now, toAccount.ID)
	if err != nil {
		jsonError(w, "Failed to update destination account", http.StatusInternalServerError)
		return
	}

	// Create description with account names
	description := req.Description
	if description == "" {
		description = "Transfer"
	}
	fromDescription := description + " → " + toAccount.Name
	toDescription := description + " ← " + fromAccount.Name

	// Determine transaction types
	fromTxType := models.TransactionTypeWithdrawal
	var toTxType models.TransactionType
	switch toAccount.Type {
	case models.AccountTypeCash, models.AccountTypeDebit, models.AccountTypeSaving, models.AccountTypeInvestment:
		toTxType = models.TransactionTypeDeposit
	case models.AccountTypeCreditCard, models.AccountTypeLoan:
		toTxType = models.TransactionTypePayment
	}

	// Insert withdrawal transaction (source)
	result1, err := tx.Exec(`
		INSERT INTO transactions (account_id, type, amount, description, category, balance_after, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, fromAccount.ID, string(fromTxType), fromAmount, fromDescription, string(models.CategoryTransfer), fromNewBalance, now)
	if err != nil {
		jsonError(w, "Failed to create source transaction", http.StatusInternalServerError)
		return
	}
	fromTxID, _ := result1.LastInsertId()

	// Insert deposit/payment transaction (destination)
	result2, err := tx.Exec(`
		INSERT INTO transactions (account_id, type, amount, description, category, balance_after, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, toAccount.ID, string(toTxType), toAmount, toDescription, string(models.CategoryTransfer), toNewBalance, now)
	if err != nil {
		jsonError(w, "Failed to create destination transaction", http.StatusInternalServerError)
		return
	}
	toTxID, _ := result2.LastInsertId()

	// Link transactions
	_, err = tx.Exec("UPDATE transactions SET linked_transaction_id = ? WHERE id = ?", toTxID, fromTxID)
	if err != nil {
		jsonError(w, "Failed to link transactions", http.StatusInternalServerError)
		return
	}
	_, err = tx.Exec("UPDATE transactions SET linked_transaction_id = ? WHERE id = ?", fromTxID, toTxID)
	if err != nil {
		jsonError(w, "Failed to link transactions", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		jsonError(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Return the source transaction (withdrawal)
	response := models.Transaction{
		ID:                  fromTxID,
		AccountID:           fromAccount.ID,
		Type:                fromTxType,
		Amount:              fromAmount,
		Description:         fromDescription,
		Category:            models.CategoryTransfer,
		BalanceAfter:        fromNewBalance,
		LinkedTransactionID: &toTxID,
		LinkedAccountName:   toAccount.Name,
		CreatedAt:           now,
	}

	// Include converted amount info if cross-currency
	if fromAccount.Currency != toAccount.Currency {
		jsonResponse(w, map[string]interface{}{
			"transaction":      response,
			"converted_amount": toAmount,
			"to_currency":      toAccount.Currency,
		}, http.StatusCreated)
		return
	}

	jsonResponse(w, response, http.StatusCreated)
}

// Helper to get account type from string
func (h *TransactionHandler) isAssetAccount(accountType models.AccountType) bool {
	return accountType == models.AccountTypeCash ||
		accountType == models.AccountTypeDebit ||
		accountType == models.AccountTypeSaving ||
		accountType == models.AccountTypeInvestment
}
