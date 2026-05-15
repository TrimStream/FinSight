import React from "react";

interface StockSummary {
	symbol: string;
	avg_close: number;
	lowest: number;
	highest: number;
	price_range: number;
}

interface TickerProps {
	summaries: StockSummary[];
	selectedSymbol: string;
	onSelect: (symbol: string) => void;
}

const Ticker: React.FC<TickerProps> = ({ summaries, selectedSymbol, onSelect }) => {

	const getPriceChange = (summary: StockSummary) => {
		const change = summary.highest - summary.lowest;
		const changePercent = ((change / summary.lowest) * 100).toFixed(2);
		return { change: change.toFixed(2), changePercent};
	};

	return (
    <div className="sidebar">
      {summaries.map((summary) => {
        const { change, changePercent } = getPriceChange(summary);
        const isPositive = parseFloat(change) > 0;
        const isActive = summary.symbol === selectedSymbol;

        return (
          <div
            key={summary.symbol}
            className={`sidebar-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(summary.symbol)}
          >
            <div className="sidebar-symbol">{summary.symbol}</div>
            <div className="sidebar-price">${summary.avg_close}</div>
            <div className={`sidebar-change ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '+' : ''}{change} ({changePercent}%)
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Ticker;