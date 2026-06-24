import React from 'react';
import {
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
            backgroundColor: '#0C1319',
            border: '1px solid #131B24',
            borderRadius: '2px',
            padding: '10px 14px',
          }}>
            <p style={{ color: '#485E70', fontSize: '11px', marginBottom: '4px', fontFamily: 'DM Mono, monospace' }}>{label}</p>
            <p style={{ color: '#3B8FE0', fontWeight: 500, fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>${payload[0].value.toFixed(2)}</p>
          </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#485E70', fontSize: '12px', fontFamily: 'DM Mono, monospace', letterSpacing: '1px' }}>
          Loading...
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
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={priceHistory}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B8FE0" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B8FE0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="#131B24" />
            <XAxis
                dataKey="date"
                tick={{ fill: '#485E70', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                tickFormatter={(date) => date.slice(5)}
                axisLine={{ stroke: '#131B24' }}
                tickLine={false}
            />
            <YAxis
                tick={{ fill: '#485E70', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `$${val}`}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#131B24', strokeWidth: 1 }} />
            <Area
                type="monotone"
                dataKey="close"
                stroke="#3B8FE0"
                strokeWidth={1.5}
                fill="url(#colorClose)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
  );
};

export default StockChart;