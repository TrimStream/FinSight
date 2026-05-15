# FinSight

A full-stack financial intelligence platform that lets you explore real stock market data using natural language queries.

## What it does

- Ingests real-time stock price data from Alpha Vantage API for 8 major stocks
- Stores and indexes 100 days of price history in PostgreSQL
- Serves data through a Go REST API
- Translates plain English questions into SQL queries using Google Gemini AI
- Displays interactive price charts and a live query interface in a React dashboard

## Tech Stack

**Backend (Go)**
- Data ingestion worker that fetches real market data concurrently from Alpha Vantage
- REST API with endpoints for stocks, price history, and summary statistics
- PostgreSQL with optimized indexes for time series queries

**AI Layer (Python)**
- FastAPI service that accepts natural language questions
- Uses Google Gemini to generate valid PostgreSQL queries from plain English
- Validates all AI-generated SQL before execution for safety
- Logs every query and generated SQL for auditability

**Frontend (TypeScript/React)**
- Dark terminal-style dashboard inspired by trading platforms
- Interactive area charts with gradient fill using Recharts
- Sidebar with color coded price change indicators
- Natural language query box that displays results as a formatted table

## Architecture
Alpha Vantage API

|

Go Ingestion Worker --> PostgreSQL <-- Go REST API (port 8080)

|

Python AI Service (port 8001) <-- Google Gemini

|

React Frontend (port 3000)

## Getting Started

### Prerequisites
- Go 1.21+
- Python 3.11+
- PostgreSQL 15+
- Node.js 18+

### Setup

1. Clone the repo
2. Create the database
```bash
psql -U postgres -c "CREATE DATABASE finsight"
psql -U postgres -d finsight -f db/schema.sql
```

3. Add environment variables to `backend/.env` and `python/.env`

DB_HOST=localhost

DB_PORT=5432

DB_USER=postgres

DB_PASSWORD=yourpassword

DB_NAME=finsight

ALPHA_VANTAGE_KEY=yourkey

GEMINI_API_KEY=yourkey

4. Run the Go backend
```bash
cd backend
go run main.go api.go
```

5. Run the Python AI service
```bash
cd python
python -m uvicorn main:app --port 8001 --reload
```

6. Run the React frontend
```bash
cd frontend
npm start
```

## Example Queries

- "which stock had the highest average closing price"
- "show me the top 3 most traded stocks by volume"
- "which stock had the biggest price drop in a single day"
- "what is the average daily volume for NVDA"