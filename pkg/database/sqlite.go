package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

// Init initializes the SQLite database and runs migrations
func Init(dbPath string) (*sql.DB, error) {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Run migrations
	if err := migrate(db); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return db, nil
}

func migrate(db *sql.DB) error {
	migrations := []string{
		// Users table
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// Sessions table
		`CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,

		// Accounts table
		`CREATE TABLE IF NOT EXISTS accounts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL CHECK (type IN ('cash', 'debit', 'credit_card', 'loan', 'saving', 'investment')),
			color TEXT NOT NULL DEFAULT '#DDE61F',
			currency TEXT NOT NULL DEFAULT 'USD',
			current_balance REAL DEFAULT 0,
			credit_limit REAL,
			credit_owed REAL,
			closing_date INTEGER,
			loan_initial_amount REAL,
			loan_current_owed REAL,
			monthly_payment REAL,
			yearly_interest_rate REAL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,

		// Transactions table
		`CREATE TABLE IF NOT EXISTS transactions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			account_id INTEGER NOT NULL,
			type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'expense', 'payment')),
			amount REAL NOT NULL,
			description TEXT,
			category TEXT DEFAULT 'other',
			balance_after REAL NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
		)`,

		// Exchange rates table
		`CREATE TABLE IF NOT EXISTS exchange_rates (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			base_currency TEXT NOT NULL,
			target_currency TEXT NOT NULL,
			rate REAL NOT NULL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(base_currency, target_currency)
		)`,

		// Category budgets table
		`CREATE TABLE IF NOT EXISTS category_budgets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			category TEXT NOT NULL CHECK (category IN ('groceries', 'dining', 'transport', 'utilities', 'rent', 'healthcare', 'entertainment', 'shopping', 'subscriptions', 'games', 'travel', 'education', 'fitness', 'personal', 'gifts', 'other')),
			monthly_limit REAL NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE(user_id, category)
		)`,

		// Indexes for performance
		`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`,
		`CREATE INDEX IF NOT EXISTS idx_exchange_rates_base ON exchange_rates(base_currency)`,
		`CREATE INDEX IF NOT EXISTS idx_category_budgets_user_id ON category_budgets(user_id)`,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %w\nSQL: %s", err, migration)
		}
	}

	// Run ALTER TABLE migrations (these are idempotent - check if column exists first)
	alterMigrations := []struct {
		table  string
		column string
		sql    string
	}{
		{"users", "name", "ALTER TABLE users ADD COLUMN name TEXT"},
		{"users", "preferred_currency", "ALTER TABLE users ADD COLUMN preferred_currency TEXT DEFAULT 'DOP'"},
		{"users", "onboarding_completed", "ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0"},
		{"transactions", "linked_transaction_id", "ALTER TABLE transactions ADD COLUMN linked_transaction_id INTEGER REFERENCES transactions(id)"},
	}

	for _, m := range alterMigrations {
		if !columnExists(db, m.table, m.column) {
			if _, err := db.Exec(m.sql); err != nil {
				return fmt.Errorf("alter migration failed: %w\nSQL: %s", err, m.sql)
			}
		}
	}

	return nil
}

// columnExists checks if a column exists in a table
func columnExists(db *sql.DB, table, column string) bool {
	query := fmt.Sprintf("SELECT COUNT(*) FROM pragma_table_info('%s') WHERE name='%s'", table, column)
	var count int
	if err := db.QueryRow(query).Scan(&count); err != nil {
		return false
	}
	return count > 0
}
