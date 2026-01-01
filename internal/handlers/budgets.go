package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kengru/odin-wallet/internal/middleware"
	"github.com/kengru/odin-wallet/internal/models"
)

type BudgetHandler struct {
	db *sql.DB
}

func NewBudgetHandler(db *sql.DB) *BudgetHandler {
	return &BudgetHandler{db: db}
}

// List returns all budgets for the authenticated user
func (h *BudgetHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	rows, err := h.db.Query(`
		SELECT id, user_id, category, monthly_limit, created_at, updated_at
		FROM category_budgets
		WHERE user_id = ?
		ORDER BY category
	`, userID)
	if err != nil {
		jsonError(w, "Failed to fetch budgets", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	budgets := []models.CategoryBudget{}
	for rows.Next() {
		var budget models.CategoryBudget
		err := rows.Scan(
			&budget.ID, &budget.UserID, &budget.Category,
			&budget.MonthlyLimit, &budget.CreatedAt, &budget.UpdatedAt,
		)
		if err != nil {
			continue
		}
		budgets = append(budgets, budget)
	}

	jsonResponse(w, budgets, http.StatusOK)
}

// Set creates or updates a budget for a category
func (h *BudgetHandler) Set(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	var req models.SetBudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate category
	validCategories := map[string]bool{
		"groceries": true, "dining": true, "transport": true,
		"utilities": true, "rent": true, "healthcare": true,
		"entertainment": true, "shopping": true, "subscriptions": true,
		"games": true, "travel": true, "education": true,
		"fitness": true, "personal": true, "gifts": true, "other": true,
	}
	if !validCategories[req.Category] {
		jsonError(w, "Invalid category", http.StatusBadRequest)
		return
	}

	// Validate amount
	if req.MonthlyLimit <= 0 {
		jsonError(w, "Monthly limit must be positive", http.StatusBadRequest)
		return
	}

	now := time.Now()

	// Upsert budget
	_, err := h.db.Exec(`
		INSERT INTO category_budgets (user_id, category, monthly_limit, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(user_id, category)
		DO UPDATE SET monthly_limit = excluded.monthly_limit, updated_at = excluded.updated_at
	`, userID, req.Category, req.MonthlyLimit, now, now)
	if err != nil {
		jsonError(w, "Failed to set budget", http.StatusInternalServerError)
		return
	}

	// Fetch and return the budget
	var budget models.CategoryBudget
	err = h.db.QueryRow(`
		SELECT id, user_id, category, monthly_limit, created_at, updated_at
		FROM category_budgets
		WHERE user_id = ? AND category = ?
	`, userID, req.Category).Scan(
		&budget.ID, &budget.UserID, &budget.Category,
		&budget.MonthlyLimit, &budget.CreatedAt, &budget.UpdatedAt,
	)
	if err != nil {
		jsonError(w, "Budget saved but failed to fetch", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, budget, http.StatusOK)
}

// Delete removes a budget for a category
func (h *BudgetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	category := chi.URLParam(r, "category")
	if category == "" {
		jsonError(w, "Category is required", http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec(`
		DELETE FROM category_budgets
		WHERE user_id = ? AND category = ?
	`, userID, category)
	if err != nil {
		jsonError(w, "Failed to delete budget", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		jsonError(w, "Budget not found", http.StatusNotFound)
		return
	}

	jsonResponse(w, map[string]string{"message": "Budget deleted successfully"}, http.StatusOK)
}
