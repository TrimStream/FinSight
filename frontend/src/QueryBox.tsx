import React, { useState } from 'react';

interface QueryResult {
  question: string;
  sql: string;
  results: any[][];
  columns: string[];
}

interface QueryBoxProps {
  onQuery: (question: string) => void;
  result: QueryResult | null;
}

const QueryBox: React.FC<QueryBoxProps> = ({ onQuery, result }) => {
  const [question, setQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setIsLoading(true);
    await onQuery(question);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="query-section">
      <div className="query-title">Ask a question</div>
      <div className="query-input-row">
        <input
          className="query-input"
          type="text"
          placeholder="e.g. which stock had the highest average closing price"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          className="query-button"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Thinking...' : 'Ask'}
        </button>
      </div>
      {result && (
        <div className="query-results">
          <table className="results-table">
            <thead>
              <tr>
                {result.columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.results.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QueryBox;