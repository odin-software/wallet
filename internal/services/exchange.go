package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// ExchangeService handles fetching and caching exchange rates
type ExchangeService struct {
	db         *sql.DB
	httpClient *http.Client
	mu         sync.RWMutex
	rates      map[string]float64 // cache: "USD_DOP" -> rate
	updatedAt  time.Time
}

// ExchangeRateAPIResponse represents the API response from open.er-api.com
type ExchangeRateAPIResponse struct {
	Result   string             `json:"result"`
	BaseCode string             `json:"base_code"`
	Rates    map[string]float64 `json:"rates"`
}

// ExchangeRates represents the rates returned to the frontend
type ExchangeRates struct {
	Base      string             `json:"base"`
	Rates     map[string]float64 `json:"rates"`
	UpdatedAt time.Time          `json:"updated_at"`
}

// NewExchangeService creates a new exchange service
func NewExchangeService(db *sql.DB) *ExchangeService {
	return &ExchangeService{
		db: db,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		rates: make(map[string]float64),
	}
}

// FetchAndStore fetches rates from open.er-api.com and stores them in the database
func (s *ExchangeService) FetchAndStore() error {
	log.Println("Fetching exchange rates from open.er-api.com...")

	// Fetch USD-based rates (this API supports DOP)
	resp, err := s.httpClient.Get("https://open.er-api.com/v6/latest/USD")
	if err != nil {
		return fmt.Errorf("failed to fetch exchange rates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("exchange rate API returned status %d", resp.StatusCode)
	}

	var data ExchangeRateAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return fmt.Errorf("failed to decode exchange rates: %w", err)
	}

	if data.Result != "success" {
		return fmt.Errorf("exchange rate API returned non-success result")
	}

	// Extract only the currencies we need
	supportedCurrencies := []string{"USD", "DOP", "EUR"}
	rates := make(map[string]float64)
	for _, curr := range supportedCurrencies {
		if rate, ok := data.Rates[curr]; ok {
			rates[curr] = rate
		}
	}

	now := time.Now()

	// Start a transaction
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Store USD -> other currencies
	for currency, rate := range rates {
		if err := s.upsertRate(tx, "USD", currency, rate, now); err != nil {
			return err
		}
	}

	// Store reverse rates (other -> USD)
	for currency, rate := range rates {
		if rate > 0 {
			if err := s.upsertRate(tx, currency, "USD", 1/rate, now); err != nil {
				return err
			}
		}
	}

	// Store cross rates (e.g., DOP -> EUR, EUR -> DOP)
	if dopRate, ok := rates["DOP"]; ok {
		if eurRate, ok := rates["EUR"]; ok {
			// DOP to EUR
			if dopRate > 0 {
				dopToEur := eurRate / dopRate
				if err := s.upsertRate(tx, "DOP", "EUR", dopToEur, now); err != nil {
					return err
				}
			}
			// EUR to DOP
			if eurRate > 0 {
				eurToDop := dopRate / eurRate
				if err := s.upsertRate(tx, "EUR", "DOP", eurToDop, now); err != nil {
					return err
				}
			}
		}
	}

	// Store identity rates (1:1)
	for _, curr := range supportedCurrencies {
		if err := s.upsertRate(tx, curr, curr, 1.0, now); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Update in-memory cache
	s.loadRatesFromDB()

	log.Printf("Exchange rates updated successfully. USD->DOP: %.2f, USD->EUR: %.4f",
		rates["DOP"], rates["EUR"])

	return nil
}

func (s *ExchangeService) upsertRate(tx *sql.Tx, base, target string, rate float64, updatedAt time.Time) error {
	_, err := tx.Exec(`
		INSERT INTO exchange_rates (base_currency, target_currency, rate, updated_at)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(base_currency, target_currency) DO UPDATE SET
			rate = excluded.rate,
			updated_at = excluded.updated_at
	`, base, target, rate, updatedAt)
	if err != nil {
		return fmt.Errorf("failed to upsert rate %s->%s: %w", base, target, err)
	}
	return nil
}

// loadRatesFromDB loads all rates from the database into memory
func (s *ExchangeService) loadRatesFromDB() {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(`SELECT base_currency, target_currency, rate, updated_at FROM exchange_rates`)
	if err != nil {
		log.Printf("Failed to load exchange rates from DB: %v", err)
		return
	}
	defer rows.Close()

	s.rates = make(map[string]float64)
	var latestUpdate time.Time

	for rows.Next() {
		var base, target string
		var rate float64
		var updatedAt time.Time
		if err := rows.Scan(&base, &target, &rate, &updatedAt); err != nil {
			continue
		}
		key := base + "_" + target
		s.rates[key] = rate
		if updatedAt.After(latestUpdate) {
			latestUpdate = updatedAt
		}
	}

	s.updatedAt = latestUpdate
}

// GetRate returns the exchange rate between two currencies
func (s *ExchangeService) GetRate(from, to string) (float64, bool) {
	if from == to {
		return 1.0, true
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	key := from + "_" + to
	rate, ok := s.rates[key]
	return rate, ok
}

// Convert converts an amount from one currency to another
func (s *ExchangeService) Convert(amount float64, from, to string) (float64, error) {
	rate, ok := s.GetRate(from, to)
	if !ok {
		return 0, fmt.Errorf("exchange rate not found for %s->%s", from, to)
	}
	return amount * rate, nil
}

// GetAllRates returns all rates for a base currency
func (s *ExchangeService) GetAllRates(base string) *ExchangeRates {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rates := make(map[string]float64)
	for key, rate := range s.rates {
		if len(key) > 4 && key[:3] == base && key[3] == '_' {
			target := key[4:]
			rates[target] = rate
		}
	}

	return &ExchangeRates{
		Base:      base,
		Rates:     rates,
		UpdatedAt: s.updatedAt,
	}
}

// GetUpdatedAt returns the last update time
func (s *ExchangeService) GetUpdatedAt() time.Time {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.updatedAt
}

// StartDailyUpdater starts a goroutine that updates rates daily
func (s *ExchangeService) StartDailyUpdater() {
	go func() {
		// Calculate time until next 6 AM
		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day(), 6, 0, 0, 0, now.Location())
		if now.After(next) {
			next = next.Add(24 * time.Hour)
		}

		// Wait until 6 AM
		time.Sleep(time.Until(next))

		// Then run every 24 hours
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		for {
			if err := s.FetchAndStore(); err != nil {
				log.Printf("Failed to update exchange rates: %v", err)
			}
			<-ticker.C
		}
	}()
	log.Println("Daily exchange rate updater started (runs at 6 AM)")
}

// Init initializes the service by loading from DB or fetching if empty
func (s *ExchangeService) Init() error {
	// First try to load from DB
	s.loadRatesFromDB()

	// If no rates in DB or rates are older than 24 hours, fetch new ones
	if len(s.rates) == 0 || time.Since(s.updatedAt) > 24*time.Hour {
		if err := s.FetchAndStore(); err != nil {
			// If fetch fails but we have cached rates, continue with warning
			if len(s.rates) > 0 {
				log.Printf("Warning: Failed to fetch new rates, using cached rates from %v: %v", s.updatedAt, err)
				return nil
			}
			return err
		}
	} else {
		log.Printf("Using cached exchange rates from %v", s.updatedAt.Format(time.RFC3339))
	}

	return nil
}
