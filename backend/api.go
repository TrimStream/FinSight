package main

import (
	"encoding/json"
	"log"
	"net/http"
)

// PriceRecord represents one row of price history we send back to the frontend
type PriceRecord struct {
	Date   string  `json:"date"`
	Open   float64 `json:"open"`
	High   float64 `json:"high"`
	Low    float64 `json:"low"`
	Close  float64 `json:"close"`
	Volume int64   `json:"volume"`
}

// StockSummary represents the summary stats for one stock
type StockSummary struct {
	Symbol     string  `json:"symbol"`
	AvgClose   float64 `json:"avg_close"`
	Lowest     float64 `json:"lowest"`
	Highest    float64 `json:"highest"`
	PriceRange float64 `json:"price_range"`
}

// Stock represents basic stock info
type StockInfo struct {
	Symbol string `json:"symbol"`
}

// startAPI starts the HTTP server
func startAPI() {
	http.HandleFunc("/api/stocks", handleStocks)
	http.HandleFunc("/api/stocks/summary", handleSummary)
	http.HandleFunc("/api/stocks/history", handleHistory)
	log.Println("API server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// handleStocks returns a list of all stocks we are tracking
func handleStocks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Query(`SELECT DISTINCT symbol FROM stock_prices ORDER BY symbol`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stocks []StockInfo
	for rows.Next() {
		var s StockInfo
		err := rows.Scan(&s.Symbol)
		if err != nil {
			continue
		}
		stocks = append(stocks, s)
	}

	writeJSON(w, stocks)
}

// handleSummary returns avg, min, max, range for all stocks
func handleSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Query(`
		SELECT symbol,
			   ROUND(AVG(close)::numeric, 2),
			   ROUND(MIN(close)::numeric, 2),
			   ROUND(MAX(close)::numeric, 2),
			   ROUND((MAX(close) - MIN(close))::numeric, 2)
		FROM stock_prices
		GROUP BY symbol
		ORDER BY ROUND(AVG(close)::numeric, 2) DESC
	`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Println("Summary query error:", err)
		return
	}
	defer rows.Close()

	var summaries []StockSummary
	for rows.Next() {
		var s StockSummary
		err := rows.Scan(&s.Symbol, &s.AvgClose, &s.Lowest, &s.Highest, &s.PriceRange)
		if err != nil {
			continue
		}
		summaries = append(summaries, s)
	}

	writeJSON(w, summaries)
}

// handleHistory returns price history for a specific stock
// usage: /api/stocks/history?symbol=AAPL
func handleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	symbol := r.URL.Query().Get("symbol")
	if symbol == "" {
		http.Error(w, "symbol parameter is required", http.StatusBadRequest)
		return
	}

	rows, err := db.Query(`
		SELECT TO_CHAR(date, 'YYYY-MM-DD') as date,
		       open, high, low, close, volume
		FROM stock_prices
		WHERE symbol = $1
		ORDER BY date ASC
	`, symbol)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var records []PriceRecord
	for rows.Next() {
		var pr PriceRecord
		err := rows.Scan(&pr.Date, &pr.Open, &pr.High, &pr.Low, &pr.Close, &pr.Volume)
		if err != nil {
			continue
		}
		records = append(records, pr)
	}

	writeJSON(w, records)
}

// writeJSON is a helper that sends a JSON response
func writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(data)
}
