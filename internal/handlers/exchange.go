package handlers

import (
	"fmt"
	"net/http"

	"github.com/kengru/odin-wallet/internal/services"
)

type ExchangeHandler struct {
	exchangeService *services.ExchangeService
}

func NewExchangeHandler(exchangeService *services.ExchangeService) *ExchangeHandler {
	return &ExchangeHandler{exchangeService: exchangeService}
}

// GetRates returns all exchange rates for a base currency
func (h *ExchangeHandler) GetRates(w http.ResponseWriter, r *http.Request) {
	base := r.URL.Query().Get("base")
	if base == "" {
		base = "USD" // Default to USD
	}

	rates := h.exchangeService.GetAllRates(base)
	jsonResponse(w, rates, http.StatusOK)
}

// Convert converts an amount between currencies
func (h *ExchangeHandler) Convert(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	amountStr := r.URL.Query().Get("amount")

	if from == "" || to == "" || amountStr == "" {
		jsonError(w, "Missing required parameters: from, to, amount", http.StatusBadRequest)
		return
	}

	var amount float64
	if _, err := parseFloat(amountStr, &amount); err != nil {
		jsonError(w, "Invalid amount", http.StatusBadRequest)
		return
	}

	converted, err := h.exchangeService.Convert(amount, from, to)
	if err != nil {
		jsonError(w, err.Error(), http.StatusNotFound)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"from":      from,
		"to":        to,
		"amount":    amount,
		"converted": converted,
		"rate":      converted / amount,
	}, http.StatusOK)
}

func parseFloat(s string, f *float64) (bool, error) {
	_, err := fmt.Sscanf(s, "%f", f)
	return err == nil, err
}
