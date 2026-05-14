import React, { useState, useEffect} from 'react';
import axios from "axios";
import './App.css';

const GO_API = 'http://localhost:8080';
const PYTHON_API = 'http://localhost:8001';

interface Stock {
  symbol: string
  company: string
  sector: string
}

interface StockSummary {
  symbol: string
  avg_close: number;
  lowest: number;
  highest: number;
  price_range: number;
}

interface PriceRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface QueryResult {
  question: string;
  sql: string;
  results: any[][];
  columns: string[];
}

const App: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [summaries, setSummaries] = useState<StockSummary[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
}

useEffect(() => {
  fetchInitialData();
}, []);

useEffect(() => {
  fetchPriceHistory(selectedSymbol);
}, [selectedSymbol]);

const fetchInitialData = async () => {
  try {
    const [stocksRes, summariesRes] = await Promise.all([
      axios.get(`${GO_API}/api/stocks`),
      axios.get(`${GO_API}/api/stocks/summary`)
    ]);
    setStocks(stocksRes.data);
    setSummaries(summariesRes.data);
    setLastUpdated(new Date().toLocaleString());
  } catch (err) {
    console.error("Failed to fetch initial data", err);
  } finally {
    setLoading(false);
  }
};

const fetchPriceHistory = async (symbol: string) => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${GO_API}/api/stocks/history?symbol=${symbol}`);
      setPriceHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch price history:', err);
    } finally {
      setHistoryLoading(false);
    }
};

const handleQuery = async (question: string) => {
    try {
      const res = await axios.post(`${PYTHON_API}/api/query`, { question });
      setQueryResult(res.data);
    } catch (err) {
      console.error('Query failed:', err);
    }
};
