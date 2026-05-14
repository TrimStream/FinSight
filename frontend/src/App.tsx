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
