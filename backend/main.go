package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

// Stock represents a row in the stocks table
type Stock struct {
	ID      int
	Symbol  string
	Company string
	Sector  string
}

// AlphaVantageResponse is the structure of the API response
type AlphaVantageResponse struct {
	MetaData   map[string]string            `json:"Meta Data"`
	TimeSeries map[string]map[string]string `json:"Time Series (Daily)"`
}

type CompanyOverview struct {
	Symbol string `json:"Symbol"`
	Name   string `json:"Name"`
	Sector string `json:"Sector"`
}

// db is our global database connection
var db *sql.DB

func main() {
	// Load .env file if present
	godotenv.Load()

	// Connect to PostgreSQL
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_SSLMODE"),
	)

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Error connecting to database:", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatal("Cannot reach database:", err)
	}
	fmt.Println("Connected to PostgreSQL successfully!")

	startAPI()
}

func fetchAndStore(symbol string) error {
	apiKey := os.Getenv("ALPHA_VANTAGE_KEY")
	url := fmt.Sprintf(
		"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=%s&apikey=%s",
		symbol, apiKey,
	)

	// Make the HTTP request
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Parse the JSON response
	var data AlphaVantageResponse
	err = json.NewDecoder(resp.Body).Decode(&data)
	if err != nil {
		return fmt.Errorf("JSON decode failed: %w", err)
	}

	if data.TimeSeries == nil {
		return fmt.Errorf("no time series data returned for %s", symbol)
	}

	companyNames := map[string]string{
		"AAPL":  "Apple Inc.",
		"GOOGL": "Alphabet Inc.",
		"MSFT":  "Microsoft Corporation",
		"AMZN":  "Amazon.com Inc.",
		"TSLA":  "Tesla Inc.",
		"JPM":   "JPMorgan Chase & Co.",
		"NVDA":  "NVIDIA Corporation",
		"META":  "Meta Platforms Inc.",
	}

	companySectors := map[string]string{
		"AAPL":  "Technology",
		"GOOGL": "Technology",
		"MSFT":  "Technology",
		"AMZN":  "Consumer Cyclical",
		"TSLA":  "Automotive",
		"JPM":   "Financial Services",
		"NVDA":  "Technology",
		"META":  "Technology",
	}

	stockID, err := upsertStock(symbol, companyNames[symbol], companySectors[symbol])
	if err != nil {
		return fmt.Errorf("upsert stock failed: %w", err)
	}

	// Insert price history for each day
	count := 0
	for dateStr, values := range data.TimeSeries {
		recordedAt, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			continue
		}

		open, _ := strconv.ParseFloat(values["1. open"], 64)
		high, _ := strconv.ParseFloat(values["2. high"], 64)
		low, _ := strconv.ParseFloat(values["3. low"], 64)
		close, _ := strconv.ParseFloat(values["4. close"], 64)
		volume, _ := strconv.ParseInt(values["5. volume"], 10, 64)

		_, err = db.Exec(`
            INSERT INTO price_history (stock_id, open, high, low, close, volume, recorded_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT DO NOTHING
        `, stockID, open, high, low, close, volume, recordedAt)

		if err != nil {
			log.Printf("Error inserting price for %s on %s: %v", symbol, dateStr, err)
			continue
		}
		count++
	}

	fmt.Printf("Stored %d price records for %s\n", count, symbol)
	return nil
}

func upsertStock(symbol string, company string, sector string) (int, error) {
	var id int
	err := db.QueryRow(`
        INSERT INTO stocks (symbol, company, sector)
        VALUES ($1, $2, $3)
        ON CONFLICT (symbol) DO UPDATE 
        SET company = EXCLUDED.company,
            sector = EXCLUDED.sector
        RETURNING id
    `, symbol, company, sector).Scan(&id)

	return id, err
}
