// Predefined index templates for common use cases

export interface PredefinedIndex {
  id: string;
  name: string;
  description: string;
  category: "stocks" | "crypto" | "forex" | "commodities" | "custom";
  symbol?: string;
  baseValue: number;
  updateFrequency: string;
  dataSource: string;
  icon?: string;
  tags: string[];
}

export const PREDEFINED_INDICES: PredefinedIndex[] = [
  // Stock Indices
  {
    id: "aapl-stock",
    name: "Apple Stock Price",
    description: "Real-time Apple Inc. (AAPL) stock price from NASDAQ",
    category: "stocks",
    symbol: "AAPL",
    baseValue: 17500, // $175.00 scaled by 100
    updateFrequency: "Real-time during market hours",
    dataSource: "Alpha Vantage API",
    icon: "🍎",
    tags: ["technology", "large-cap", "nasdaq"],
  },
  {
    id: "tsla-stock",
    name: "Tesla Stock Price",
    description: "Real-time Tesla Inc. (TSLA) stock price",
    category: "stocks",
    symbol: "TSLA",
    baseValue: 25000, // $250.00 scaled by 100
    updateFrequency: "Real-time during market hours",
    dataSource: "Alpha Vantage API",
    icon: "🚗",
    tags: ["automotive", "electric-vehicles", "growth"],
  },
  {
    id: "spy-etf",
    name: "S&P 500 ETF",
    description: "SPDR S&P 500 ETF Trust (SPY) tracking the S&P 500",
    category: "stocks",
    symbol: "SPY",
    baseValue: 45000, // $450.00 scaled by 100
    updateFrequency: "Real-time during market hours",
    dataSource: "Alpha Vantage API",
    icon: "📈",
    tags: ["etf", "diversified", "large-cap"],
  },

  // Cryptocurrency Indices
  {
    id: "btc-price",
    name: "Bitcoin Price",
    description: "Bitcoin (BTC) price in USD",
    category: "crypto",
    symbol: "BTC",
    baseValue: 4300000, // $43,000 scaled by 100
    updateFrequency: "24/7 real-time",
    dataSource: "Alpha Vantage Crypto API",
    icon: "₿",
    tags: ["cryptocurrency", "store-of-value", "digital-gold"],
  },
  {
    id: "eth-price",
    name: "Ethereum Price",
    description: "Ethereum (ETH) price in USD",
    category: "crypto",
    symbol: "ETH",
    baseValue: 260000, // $2,600 scaled by 100
    updateFrequency: "24/7 real-time",
    dataSource: "Alpha Vantage Crypto API",
    icon: "♦️",
    tags: ["cryptocurrency", "smart-contracts", "defi"],
  },

  // Forex Indices
  {
    id: "eurusd-rate",
    name: "EUR/USD Exchange Rate",
    description: "Euro to US Dollar exchange rate",
    category: "forex",
    symbol: "EURUSD",
    baseValue: 108500, // 1.085 scaled by 100000
    updateFrequency: "24/5 real-time",
    dataSource: "Alpha Vantage Forex API",
    icon: "💱",
    tags: ["forex", "major-pair", "currency"],
  },

  // Commodities
  {
    id: "gold-price",
    name: "Gold Price",
    description: "Gold spot price in USD per ounce",
    category: "commodities",
    symbol: "XAU",
    baseValue: 200000, // $2,000 scaled by 100
    updateFrequency: "24/5 real-time",
    dataSource: "Alpha Vantage Commodities",
    icon: "🥇",
    tags: ["precious-metals", "safe-haven", "inflation-hedge"],
  },
  {
    id: "oil-price",
    name: "Crude Oil Price",
    description: "WTI Crude Oil price per barrel",
    category: "commodities",
    symbol: "WTI",
    baseValue: 7500, // $75.00 scaled by 100
    updateFrequency: "24/5 real-time",
    dataSource: "Alpha Vantage Commodities",
    icon: "🛢️",
    tags: ["energy", "commodities", "oil"],
  },

  // Custom/Technical Indices
  {
    id: "vix-index",
    name: "VIX Volatility Index",
    description: "CBOE Volatility Index (Fear Index)",
    category: "custom",
    symbol: "VIX",
    baseValue: 2000, // 20.00 scaled by 100
    updateFrequency: "Real-time during market hours",
    dataSource: "Alpha Vantage API",
    icon: "📊",
    tags: ["volatility", "fear-index", "market-sentiment"],
  },
];

export function getIndicesByCategory(category: string): PredefinedIndex[] {
  return PREDEFINED_INDICES.filter((index) => index.category === category);
}

export function searchPredefinedIndices(searchTerm: string): PredefinedIndex[] {
  const term = searchTerm.toLowerCase();
  return PREDEFINED_INDICES.filter(
    (index) =>
      index.name.toLowerCase().includes(term) ||
      index.description.toLowerCase().includes(term) ||
      index.symbol?.toLowerCase().includes(term) ||
      index.tags.some((tag) => tag.toLowerCase().includes(term))
  );
}

export function getPredefinedIndexById(
  id: string
): PredefinedIndex | undefined {
  return PREDEFINED_INDICES.find((index) => index.id === id);
}

export const INDEX_CATEGORIES = [
  { id: "stocks", name: "Stocks & ETFs", icon: "📈" },
  { id: "crypto", name: "Cryptocurrency", icon: "₿" },
  { id: "forex", name: "Foreign Exchange", icon: "💱" },
  { id: "commodities", name: "Commodities", icon: "🥇" },
  { id: "custom", name: "Custom Indices", icon: "🔧" },
];
