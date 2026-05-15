import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface PriceRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockSummary {
  symbol: string;
  avg_close: number;
  lowest: number;
  highest: number;
  price_range: number;
}

interface StockChartProps {
  symbol: string;
  priceHistory: PriceRecord[];
  summary: StockSummary | undefined;
  loading: boolean;
}

const StockChart: React.FC<StockChartProps> = ({ symbol, priceHistory, summary, loading }) => {

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '10px 14px',
        }}>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
          <p style={{ color: '#3b82f6', fontWeight: 600 }}>${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#3b82f6' }}>
        Loading chart...
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="stock-header">
        <div className="stock-symbol">{symbol}</div>
        <div className="stock-stats">
          <div className="stat-item">
            <span className="stat-label">Avg Close</span>
            <span className="stat-value">${summary?.avg_close}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">52W Low</span>
            <span className="stat-value">${summary?.lowest}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">52W High</span>
            <span className="stat-value">${summary?.highest}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Range</span>
            <span className="stat-value positive">${summary?.price_range}</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={priceHistory}>
          <defs>
            <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickFormatter={(date) => date.slice(5)}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 11 }}
            domain={['auto', 'auto']}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorClose)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;