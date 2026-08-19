CREATE TABLE stock_prices (
    id          SERIAL PRIMARY KEY,
    symbol      VARCHAR(10) NOT NULL,
    date        DATE NOT NULL,
    open        NUMERIC(12, 4),
    high        NUMERIC(12, 4),
    low         NUMERIC(12, 4),
    close       NUMERIC(12, 4),
    volume      BIGINT,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(symbol, date)
);

CREATE INDEX idx_stock_prices_symbol ON stock_prices(symbol);
CREATE INDEX idx_stock_prices_date ON stock_prices(date);

CREATE TABLE queries (
    id                SERIAL PRIMARY KEY,
    natural_language  TEXT NOT NULL,
    generated_sql     TEXT,
    result_count      INTEGER,
    success           BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT NOW()
);
