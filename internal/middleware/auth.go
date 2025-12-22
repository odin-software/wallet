package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

type contextKey string

const UserIDKey contextKey = "user_id"

// Auth middleware validates the session and adds user ID to context
func Auth(db *sql.DB, sessionSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("session_id")
			if err != nil {
				jsonError(w, "Authentication required", http.StatusUnauthorized)
				return
			}

			// Validate session
			var userID int64
			var expiresAt time.Time
			err = db.QueryRow(
				"SELECT user_id, expires_at FROM sessions WHERE id = ?",
				cookie.Value,
			).Scan(&userID, &expiresAt)

			if err == sql.ErrNoRows {
				jsonError(w, "Invalid session", http.StatusUnauthorized)
				return
			}
			if err != nil {
				jsonError(w, "Failed to validate session", http.StatusInternalServerError)
				return
			}

			// Check if session expired
			if time.Now().After(expiresAt) {
				db.Exec("DELETE FROM sessions WHERE id = ?", cookie.Value)
				jsonError(w, "Session expired", http.StatusUnauthorized)
				return
			}

			// Add user ID to context
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID extracts user ID from context
func GetUserID(ctx context.Context) (int64, bool) {
	userID, ok := ctx.Value(UserIDKey).(int64)
	return userID, ok
}

func jsonError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
