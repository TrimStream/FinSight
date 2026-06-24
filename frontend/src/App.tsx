import React, { useState, useEffect} from 'react';
import axios from "axios";
import './App.css';
import Ticker from './Ticker';
import StockChart from './StockChart';
import QueryBox from './QueryBox';

const GO_API = process.env.REACT_APP_GO_API || 'http://localhost:8080';
const PYTHON_API = process.env.REACT_APP_PYTHON_API || 'http://localhost:8001';

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
    const [summaries, setSummaries] = useState<StockSummary[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
    const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [historyLoading, setHistoryLoading] = useState<boolean>(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchPriceHistory(selectedSymbol);
    }, [selectedSymbol]);

    const fetchInitialData = async () => {
        try {
            const summariesRes = await axios.get(`${GO_API}/api/stocks/summary`);
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

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#3B8FE0', fontSize: '14px', fontFamily: 'DM Mono, monospace', letterSpacing: '1px' }}>
                Loading...
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="header">
                <div className="header-title">FinSight</div>
            </div>
            <div className="main-content">
                <Ticker
                    summaries={summaries}
                    selectedSymbol={selectedSymbol}
                    onSelect={setSelectedSymbol}
                />
                <div className="chart-area">
                    <StockChart
                        symbol={selectedSymbol}
                        priceHistory={priceHistory}
                        summary={summaries.find(s => s.symbol === selectedSymbol)}
                        loading={historyLoading}
                    />
                </div>
            </div>
            <QueryBox
                onQuery={handleQuery}
                result={queryResult}
            />
            <div className="last-updated">
                Updated {lastUpdated}
            </div>
        </div>
    );
};

export default App;