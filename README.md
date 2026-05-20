# FinSight

A full-stack financial intelligence platform combining real-time stock data with AI-powered natural language queries. Ask questions in plain English, get SQL-backed answers.

**🔗 Live:** [eshaan-finsight.vercel.app](https://eshaan-finsight.vercel.app)

## What It Does

- Tracks 8 major stocks (AAPL, GOOGL, MSFT, AMZN, TSLA, JPM, NVDA, META) with 100 days of price history
- Updates daily via automated GitHub Actions workflow
- Translates natural language to SQL using Google Gemini AI
- Displays interactive price charts and query results in a React dashboard

## Architecture
GitHub Actions (daily cron)

↓

Neon PostgreSQL (800+ records)

↓

Go API + Python AI (Render)

↓

React Frontend (Vercel)

**Stack:** Go, Python (FastAPI), React + TypeScript, PostgreSQL, Docker, GitHub Actions

## Try It

Ask questions like:
- "Which stock had the highest average closing price?"
- "Show me the top 3 most traded stocks by volume"
- "What was the biggest single-day price drop?"

## Local Setup

**Prerequisites:** Go 1.26+, Python 3.11+, Node 20+, PostgreSQL 15+

1. Clone and install:
```bash
git clone https://github.com/TrimStream/FinSight.git
cd FinSight
cd backend && go mod download
cd ../python && pip install -r requirements.txt
cd ../frontend && npm install
```

2. Create `.env` files in `backend/`, `python/`, and `frontend/` (see `.env.example` in each directory)

3. Set up database:
```sql
CREATE TABLE stock_prices (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    open NUMERIC(10,2),
    high NUMERIC(10,2),
    low NUMERIC(10,2),
    close NUMERIC(10,2) NOT NULL,
    volume BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, date)
);
```

4. Run services:
```bash
# Terminal 1 - Go API
cd backend && go run main.go api.go

# Terminal 2 - Python AI
cd python && python -m uvicorn main:app --port 8000 --reload

# Terminal 3 - Frontend
cd frontend && npm start
```

Frontend runs at `http://localhost:3000`

## Deployment

All services run on free tiers:
- **Frontend:** Vercel
- **Go API + Python AI:** Render (Docker containers)
- **Database:** Neon (serverless Postgres)
- **Data updates:** GitHub Actions (daily 22:00 UTC)

## Project Structure
FinSight/
├── backend/          # Go REST API
│   ├── fetcher/      # Alpha Vantage data ingestion
│   └── Dockerfile
├── python/           # FastAPI + Gemini NL-to-SQL
│   └── Dockerfile
├── frontend/         # React + TypeScript + Vite
└── .github/workflows/ # Automated daily updates

## License

MIT

---

**Eshaan Singh** • [Portfolio](https://trimstream.github.io) • [GitHub](https://github.com/TrimStream)