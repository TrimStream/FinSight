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

type AlphaVantageResponse struct {
	MetaData   map[string]string            `json:"Meta Data"`
	TimeSeries map[string]map[string]string `json:"Time Series (Daily)"`
}

var db *sql.DB

func main() {
	godotenv.Load()

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

	fmt.Println("Connected to database, starting fetch...")

	symbols := []string{"AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "JPM", "NVDA", "META"}
	for _, symbol := range symbols {
		fmt.Printf("Fetching %s...\n", symbol)
		if err := fetchAndStore(symbol); err != nil {
			log.Printf("Error fetching %s: %v", symbol, err)
		}
		time.Sleep(15 * time.Second)
	}

	fmt.Println("Fetch complete.")
}

func fetchAndStore(symbol string) error {
	apiKey := os.Getenv("ALPHA_VANTAGE_KEY")
	url := fmt.Sprintf(
		"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=%s&apikey=%s",
		symbol, apiKey,
	)

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	var data AlphaVantageResponse
	err = json.NewDecoder(resp.Body).Decode(&data)
	if err != nil {
		return fmt.Errorf("JSON decode failed: %w", err)
	}

	if data.TimeSeries == nil {
		return fmt.Errorf("no time series data returned for %s", symbol)
	}

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
			INSERT INTO stock_prices (symbol, date, open, high, low, close, volume)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (symbol, date) DO NOTHING
		`, symbol, recordedAt, open, high, low, close, volume)

		if err != nil {
			log.Printf("Error inserting price for %s on %s: %v", symbol, dateStr, err)
			continue
		}
		count++
	}

	fmt.Printf("Stored %d price records for %s\n", count, symbol)
	return nil
}
