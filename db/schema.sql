CREATE TABLE stocks (
    id          SERIAL PRIMARY KEY,
    symbol      VARCHAR(10) UNIQUE NOT NULL,
    company     VARCHAR(255) NOT NULL,
    sector      VARCHAR(100),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE price_history (
    id          SERIAL PRIMARY KEY,
    stock_id    INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
    open        NUMERIC(12, 4),
    high        NUMERIC(12, 4),
    low         NUMERIC(12, 4),
    close       NUMERIC(12, 4),
    volume      BIGINT,
    recorded_at TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_history_stock_id ON price_history(stock_id);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at);

CREATE TABLE queries (
    id              SERIAL PRIMARY KEY,
    natural_language TEXT NOT NULL,
    generated_sql   TEXT,
    result_count    INTEGER,
    success         BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);
