package models

import "time"

// CategoryBudget represents a monthly spending limit for a category
type CategoryBudget struct {
	ID           int64     `json:"id"`
	UserID       int64     `json:"user_id"`
	Category     string    `json:"category"`
	MonthlyLimit float64   `json:"monthly_limit"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// SetBudgetRequest represents the request to set a category budget
type SetBudgetRequest struct {
	Category     string  `json:"category"`
	MonthlyLimit float64 `json:"monthly_limit"`
}
