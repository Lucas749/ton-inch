"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  Search,
  Loader2,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Globe,
  Bitcoin,
  Newspaper,
  Building,
  Calculator,
} from "lucide-react";
import AlphaVantageService, {
  TimeSeriesResponse,
  QuoteResponse,
  SearchResponse,
  TechnicalIndicatorResponse,
  CompanyOverview,
  NewsResponse,
  TechnicalIndicatorFunction,
  Interval,
  SeriesType,
} from "@/lib/alphavantage-service";

interface ExplorerProps {
  apiKey?: string;
}

const API_CATEGORIES = [
  {
    id: "stocks",
    name: "Core Stock APIs",
    icon: TrendingUp,
    description: "Time series data, quotes, and search",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "technical",
    name: "Technical Indicators",
    icon: Activity,
    description: "SMA, EMA, RSI, MACD, Bollinger Bands",
    color: "bg-green-50 text-green-700 border-green-200",
  },
  {
    id: "fundamental",
    name: "Fundamental Data",
    icon: Building,
    description: "Company overview, earnings, financials",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "forex",
    name: "Forex (FX)",
    icon: Globe,
    description: "Exchange rates and currency data",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    id: "crypto",
    name: "Cryptocurrencies",
    icon: Bitcoin,
    description: "Digital currency exchange rates",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  {
    id: "news",
    name: "News & Sentiment",
    icon: Newspaper,
    description: "Market news with sentiment analysis",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  {
    id: "economic",
    name: "Economic Indicators",
    icon: Calculator,
    description: "GDP, inflation, unemployment data",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

const TECHNICAL_INDICATORS = [
  { value: "SMA", label: "Simple Moving Average (SMA)" },
  { value: "EMA", label: "Exponential Moving Average (EMA)" },
  { value: "RSI", label: "Relative Strength Index (RSI)" },
  { value: "MACD", label: "MACD" },
  { value: "BBANDS", label: "Bollinger Bands" },
  { value: "STOCH", label: "Stochastic Oscillator" },
  { value: "ADX", label: "Average Directional Index" },
  { value: "WILLR", label: "Williams %R" },
  { value: "CCI", label: "Commodity Channel Index" },
  { value: "AROON", label: "Aroon Indicator" },
];

const POPULAR_SYMBOLS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "TSLA",
  "META",
  "NVDA",
  "NFLX",
  "IBM",
  "SPY",
];

export function AlphaVantageExplorer({ apiKey = "123" }: ExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState("stocks");
  const [symbol, setSymbol] = useState("IBM");
  const [searchQuery, setSearchQuery] = useState("");
  const [interval, setInterval] = useState<Interval>("daily");
  const [indicator, setIndicator] = useState<TechnicalIndicatorFunction>("SMA");
  const [timePeriod, setTimePeriod] = useState(20);
  const [seriesType, setSeriesType] = useState<SeriesType>("close");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  const alphaVantageService = new AlphaVantageService({ apiKey });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const searchResults = await alphaVantageService.searchSymbols(
        searchQuery
      );
      setData(searchResults);
    } catch (err) {
      setError(`Search failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStockData = async () => {
    setIsLoading(true);
    setError("");

    try {
      let response: TimeSeriesResponse;

      if (interval === "daily") {
        response = await alphaVantageService.getDailyTimeSeries(
          symbol,
          false,
          "compact"
        );
      } else if (interval === "weekly") {
        response = await alphaVantageService.getWeeklyTimeSeries(symbol);
      } else if (interval === "monthly") {
        response = await alphaVantageService.getMonthlyTimeSeries(symbol);
      } else {
        response = await alphaVantageService.getIntradayTimeSeries(
          symbol,
          interval as "1min" | "5min" | "15min" | "30min" | "60min",
          { outputSize: "compact" }
        );
      }

      setData(response);
      const parsedData = AlphaVantageService.parseTimeSeriesData(response);
      setChartData(parsedData.slice(-50)); // Show last 50 data points
    } catch (err) {
      setError(`Failed to fetch stock data: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTechnicalIndicator = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await alphaVantageService.getTechnicalIndicator(
        symbol,
        indicator,
        interval,
        { timePeriod, seriesType }
      );

      setData(response);
      const parsedData =
        AlphaVantageService.parseTechnicalIndicatorData(response);
      setChartData(parsedData.slice(-50)); // Show last 50 data points
    } catch (err) {
      setError(
        `Failed to fetch technical indicator: ${(err as Error).message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyOverview = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await alphaVantageService.getCompanyOverview(symbol);
      setData(response);
      setChartData([]);
    } catch (err) {
      setError(`Failed to fetch company overview: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuote = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await alphaVantageService.getQuote(symbol);
      setData(response);
      setChartData([]);
    } catch (err) {
      setError(`Failed to fetch quote: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchForexData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [from, to] = symbol.split("/");
      if (!from || !to) {
        throw new Error("Please use format like USD/EUR");
      }

      const response = await alphaVantageService.getForexTimeSeries(
        from,
        to,
        interval === "1min" ||
          interval === "5min" ||
          interval === "15min" ||
          interval === "30min" ||
          interval === "60min"
          ? interval
          : "daily",
        "compact"
      );

      setData(response);
      // Parse forex data (simplified)
      const timeSeriesKey = Object.keys(response).find((key) =>
        key.includes("Time Series")
      );
      if (timeSeriesKey) {
        const timeSeries = response[
          timeSeriesKey as keyof typeof response
        ] as any;
        const parsedData = Object.entries(timeSeries)
          .map(([date, data]: [string, any]) => ({
            date,
            close: parseFloat(data["4. close"]),
            open: parseFloat(data["1. open"]),
            high: parseFloat(data["2. high"]),
            low: parseFloat(data["3. low"]),
          }))
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .slice(-50);
        setChartData(parsedData);
      }
    } catch (err) {
      setError(`Failed to fetch forex data: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCryptoData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await alphaVantageService.getCryptoTimeSeries(
        symbol,
        "USD",
        "daily"
      );
      setData(response);
      setChartData([]);
    } catch (err) {
      setError(`Failed to fetch crypto data: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNewsData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await alphaVantageService.getNewsAndSentiment(
        [symbol],
        undefined,
        undefined,
        undefined,
        "LATEST",
        20
      );
      setData(response);
      setChartData([]);
    } catch (err) {
      setError(`Failed to fetch news data: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchData = () => {
    switch (selectedCategory) {
      case "stocks":
        fetchStockData();
        break;
      case "technical":
        fetchTechnicalIndicator();
        break;
      case "fundamental":
        fetchCompanyOverview();
        break;
      case "forex":
        fetchForexData();
        break;
      case "crypto":
        fetchCryptoData();
        break;
      case "news":
        fetchNewsData();
        break;
      default:
        fetchStockData();
    }
  };

  const renderChart = () => {
    if (!chartData.length) return null;

    if (selectedCategory === "stocks" || selectedCategory === "forex") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number) => [value.toFixed(2), "Price"]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#2563eb"
              strokeWidth={2}
              name="Close Price"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (selectedCategory === "technical") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Legend />
            {indicator === "BBANDS" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="real_upper_band"
                  stroke="#ef4444"
                  name="Upper Band"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="real_middle_band"
                  stroke="#2563eb"
                  name="Middle Band"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="real_lower_band"
                  stroke="#10b981"
                  name="Lower Band"
                  dot={false}
                />
              </>
            ) : indicator === "MACD" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="macd"
                  stroke="#2563eb"
                  name="MACD"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="macd_signal"
                  stroke="#ef4444"
                  name="Signal"
                  dot={false}
                />
                <Bar dataKey="macd_hist" fill="#10b981" name="Histogram" />
              </>
            ) : indicator === "STOCH" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="slowk"
                  stroke="#2563eb"
                  name="SlowK"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="slowd"
                  stroke="#ef4444"
                  name="SlowD"
                  dot={false}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                name={indicator}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  const renderDataDisplay = () => {
    if (!data) return null;

    if (selectedCategory === "fundamental" && data.Symbol) {
      const overview = data as CompanyOverview;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{overview.Name}</CardTitle>
                <Badge variant="outline">{overview.Symbol}</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Sector:</strong> {overview.Sector}
                  </div>
                  <div>
                    <strong>Industry:</strong> {overview.Industry}
                  </div>
                  <div>
                    <strong>Exchange:</strong> {overview.Exchange}
                  </div>
                  <div>
                    <strong>Currency:</strong> {overview.Currency}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Market Cap:</strong> $
                    {parseInt(
                      overview.MarketCapitalization || "0"
                    ).toLocaleString()}
                  </div>
                  <div>
                    <strong>P/E Ratio:</strong> {overview.PERatio}
                  </div>
                  <div>
                    <strong>EPS:</strong> {overview.EPS}
                  </div>
                  <div>
                    <strong>Dividend Yield:</strong> {overview.DividendYield}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{overview.Description}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (selectedCategory === "news" && data.feed) {
      const news = data as NewsResponse;
      return (
        <div className="space-y-4">
          {news.feed.slice(0, 10).map((article, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">{article.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{article.source}</span>
                    <span>
                      {new Date(article.time_published).toLocaleDateString()}
                    </span>
                    <Badge
                      variant={
                        article.overall_sentiment_label === "Bullish"
                          ? "default"
                          : article.overall_sentiment_label === "Bearish"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {article.overall_sentiment_label} (
                      {article.overall_sentiment_score.toFixed(2)})
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{article.summary}</p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Read full article →
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Raw API Response</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Alpha Vantage Data Explorer
        </h1>
        <p className="text-lg text-gray-600">
          Explore financial data across stocks, forex, crypto, and economic
          indicators
        </p>
        <Badge variant="outline" className="text-sm">
          Using API Key: {apiKey === "123" ? "Demo (Limited)" : "Custom"}
        </Badge>
      </div>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Select Data Category</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {API_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === category.id
                      ? `ring-2 ring-blue-500 ${category.color}`
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <h3 className="font-semibold text-sm">{category.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {category.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <div className="flex space-x-2">
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder={
                    selectedCategory === "forex" ? "USD/EUR" : "AAPL"
                  }
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {POPULAR_SYMBOLS.map((sym) => (
                  <Button
                    key={sym}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setSymbol(sym)}
                  >
                    {sym}
                  </Button>
                ))}
              </div>
            </div>

            {(selectedCategory === "stocks" ||
              selectedCategory === "technical" ||
              selectedCategory === "forex") && (
              <div className="space-y-2">
                <Label htmlFor="interval">Interval</Label>
                <Select
                  value={interval}
                  onValueChange={(value: Interval) => setInterval(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1min">1 minute</SelectItem>
                    <SelectItem value="5min">5 minutes</SelectItem>
                    <SelectItem value="15min">15 minutes</SelectItem>
                    <SelectItem value="30min">30 minutes</SelectItem>
                    <SelectItem value="60min">60 minutes</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedCategory === "technical" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="indicator">Technical Indicator</Label>
                  <Select
                    value={indicator}
                    onValueChange={(value: TechnicalIndicatorFunction) =>
                      setIndicator(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TECHNICAL_INDICATORS.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timePeriod">Time Period</Label>
                  <Input
                    id="timePeriod"
                    type="number"
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(parseInt(e.target.value))}
                    min="1"
                    max="200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seriesType">Series Type</Label>
                  <Select
                    value={seriesType}
                    onValueChange={(value: SeriesType) => setSeriesType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="close">Close</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex space-x-2">
            <Button
              onClick={handleFetchData}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Fetch Data
                </>
              )}
            </Button>

            {selectedCategory === "stocks" && (
              <Button
                onClick={fetchQuote}
                disabled={isLoading}
                variant="outline"
              >
                Get Quote
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Bar for Symbol Search */}
      <Card>
        <CardHeader>
          <CardTitle>Symbol Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for symbols (e.g., Apple, Microsoft)"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Chart Display */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chart Visualization</CardTitle>
          </CardHeader>
          <CardContent>{renderChart()}</CardContent>
        </Card>
      )}

      {/* Data Display */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Data Results</CardTitle>
          </CardHeader>
          <CardContent>{renderDataDisplay()}</CardContent>
        </Card>
      )}

      {/* API Information */}
      <Card>
        <CardHeader>
          <CardTitle>API Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              This explorer uses the Alpha Vantage API with demo data. For full
              access, get your free API key at{" "}
              <a
                href="https://www.alphavantage.co/support/#api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Alpha Vantage
              </a>
            </p>
            <p>
              Demo API key has limited functionality and may return cached data.
              Real-time and historical data available with personal API key.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
