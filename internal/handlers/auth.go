package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/kengru/odin-wallet/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db            *sql.DB
	sessionSecret string
}

func NewAuthHandler(db *sql.DB, sessionSecret string) *AuthHandler {
	return &AuthHandler{
		db:            db,
		sessionSecret: sessionSecret,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate email
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		jsonError(w, "Invalid email address", http.StatusBadRequest)
		return
	}

	// Validate password
	if len(req.Password) < 8 {
		jsonError(w, "Password must be at least 8 characters", http.StatusBadRequest)
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	// Insert user
	result, err := h.db.Exec(
		"INSERT INTO users (email, password_hash) VALUES (?, ?)",
		req.Email, string(hashedPassword),
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			jsonError(w, "Email already registered", http.StatusConflict)
			return
		}
		jsonError(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	userID, _ := result.LastInsertId()

	// Create session
	sessionID, err := h.createSession(userID)
	if err != nil {
		jsonError(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Set session cookie
	h.setSessionCookie(w, sessionID)

	// Return user
	user := &models.User{
		ID:                userID,
		Email:             req.Email,
		PreferredCurrency: "DOP", // Default
	}

	jsonResponse(w, models.AuthResponse{
		User:    user,
		Message: "Registration successful",
	}, http.StatusCreated)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	// Find user
	var user models.User
	var name sql.NullString
	var preferredCurrency sql.NullString
	err := h.db.QueryRow(
		"SELECT id, email, name, preferred_currency, password_hash, created_at FROM users WHERE email = ?",
		req.Email,
	).Scan(&user.ID, &user.Email, &name, &preferredCurrency, &user.PasswordHash, &user.CreatedAt)

	if err == sql.ErrNoRows {
		jsonError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}
	if err != nil {
		jsonError(w, "Failed to find user", http.StatusInternalServerError)
		return
	}

	if name.Valid {
		user.Name = &name.String
	}
	user.PreferredCurrency = "DOP" // Default
	if preferredCurrency.Valid {
		user.PreferredCurrency = preferredCurrency.String
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		jsonError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Create session
	sessionID, err := h.createSession(user.ID)
	if err != nil {
		jsonError(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Set session cookie
	h.setSessionCookie(w, sessionID)

	jsonResponse(w, models.AuthResponse{
		User:    &user,
		Message: "Login successful",
	}, http.StatusOK)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err == nil {
		// Delete session from database
		h.db.Exec("DELETE FROM sessions WHERE id = ?", cookie.Value)
	}

	// Clear cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	jsonResponse(w, map[string]string{"message": "Logged out successfully"}, http.StatusOK)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		jsonError(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	// Find session and user
	var user models.User
	var name sql.NullString
	var preferredCurrency sql.NullString
	var expiresAt time.Time
	err = h.db.QueryRow(`
		SELECT u.id, u.email, u.name, u.preferred_currency, u.created_at, s.expires_at
		FROM users u
		JOIN sessions s ON u.id = s.user_id
		WHERE s.id = ?
	`, cookie.Value).Scan(&user.ID, &user.Email, &name, &preferredCurrency, &user.CreatedAt, &expiresAt)

	if err == sql.ErrNoRows {
		jsonError(w, "Session not found", http.StatusUnauthorized)
		return
	}
	if err != nil {
		jsonError(w, "Failed to get user", http.StatusInternalServerError)
		return
	}

	// Check if session expired
	if time.Now().After(expiresAt) {
		h.db.Exec("DELETE FROM sessions WHERE id = ?", cookie.Value)
		jsonError(w, "Session expired", http.StatusUnauthorized)
		return
	}

	if name.Valid {
		user.Name = &name.String
	}
	user.PreferredCurrency = "DOP" // Default
	if preferredCurrency.Valid {
		user.PreferredCurrency = preferredCurrency.String
	}

	jsonResponse(w, models.AuthResponse{User: &user}, http.StatusOK)
}

func (h *AuthHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		jsonError(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	// Get user ID from session
	var userID int64
	var expiresAt time.Time
	err = h.db.QueryRow(`
		SELECT user_id, expires_at FROM sessions WHERE id = ?
	`, cookie.Value).Scan(&userID, &expiresAt)

	if err == sql.ErrNoRows {
		jsonError(w, "Session not found", http.StatusUnauthorized)
		return
	}
	if err != nil {
		jsonError(w, "Failed to get session", http.StatusInternalServerError)
		return
	}

	if time.Now().After(expiresAt) {
		jsonError(w, "Session expired", http.StatusUnauthorized)
		return
	}

	// Parse request
	var req models.UpdatePreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build update query
	updates := []string{}
	args := []interface{}{}

	if req.Name != nil {
		updates = append(updates, "name = ?")
		args = append(args, *req.Name)
	}

	if req.PreferredCurrency != nil {
		// Validate currency
		validCurrencies := []string{"DOP", "USD", "EUR"}
		valid := false
		for _, c := range validCurrencies {
			if c == *req.PreferredCurrency {
				valid = true
				break
			}
		}
		if !valid {
			jsonError(w, "Invalid currency. Must be DOP, USD, or EUR", http.StatusBadRequest)
			return
		}
		updates = append(updates, "preferred_currency = ?")
		args = append(args, *req.PreferredCurrency)
	}

	if len(updates) == 0 {
		jsonError(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Execute update
	query := "UPDATE users SET " + strings.Join(updates, ", ") + " WHERE id = ?"
	args = append(args, userID)

	_, err = h.db.Exec(query, args...)
	if err != nil {
		jsonError(w, "Failed to update preferences", http.StatusInternalServerError)
		return
	}

	// Fetch updated user
	var user models.User
	var name sql.NullString
	var preferredCurrency sql.NullString
	err = h.db.QueryRow(`
		SELECT id, email, name, preferred_currency, created_at FROM users WHERE id = ?
	`, userID).Scan(&user.ID, &user.Email, &name, &preferredCurrency, &user.CreatedAt)

	if err != nil {
		jsonError(w, "Failed to fetch updated user", http.StatusInternalServerError)
		return
	}

	if name.Valid {
		user.Name = &name.String
	}
	user.PreferredCurrency = "DOP"
	if preferredCurrency.Valid {
		user.PreferredCurrency = preferredCurrency.String
	}

	jsonResponse(w, models.AuthResponse{
		User:    &user,
		Message: "Preferences updated successfully",
	}, http.StatusOK)
}

func (h *AuthHandler) createSession(userID int64) (string, error) {
	// Generate session ID
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	sessionID := hex.EncodeToString(bytes)

	// Session expires in 7 days
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	// Insert session
	_, err := h.db.Exec(
		"INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
		sessionID, userID, expiresAt,
	)
	if err != nil {
		return "", err
	}

	// Clean up old sessions for this user (keep last 5)
	h.db.Exec(`
		DELETE FROM sessions WHERE user_id = ? AND id NOT IN (
			SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
		)
	`, userID, userID)

	return sessionID, nil
}

func (h *AuthHandler) setSessionCookie(w http.ResponseWriter, sessionID string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60, // 7 days
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   false, // Set to true in production with HTTPS
	})
}

// Helper functions for JSON responses
func jsonResponse(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, message string, status int) {
	jsonResponse(w, map[string]string{"error": message}, status)
}
