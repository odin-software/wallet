package models

import "time"

type User struct {
	ID                  int64     `json:"id"`
	Email               string    `json:"email"`
	Name                *string   `json:"name,omitempty"`
	PreferredCurrency   string    `json:"preferred_currency"`
	OnboardingCompleted bool      `json:"onboarding_completed"`
	PasswordHash        string    `json:"-"`
	CreatedAt           time.Time `json:"created_at"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	User    *User  `json:"user"`
	Message string `json:"message,omitempty"`
}

type UpdatePreferencesRequest struct {
	Name              *string `json:"name,omitempty"`
	PreferredCurrency *string `json:"preferred_currency,omitempty"`
}
