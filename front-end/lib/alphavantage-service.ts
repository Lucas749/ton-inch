// Alpha Vantage API Service
// Documentation: https://www.alphavantage.co/documentation/

export interface AlphaVantageConfig {
  apiKey: string;
}

// Core Time Series Interfaces
export interface TimeSeriesData {
  "1. open": string;
  "2. high": string;
  "3. low": string;
  "4. close": string;
  "5. volume": string;
}

export interface TimeSeriesResponse {
  "Meta Data": {
    "1. Information": string;
    "2. Symbol": string;
    "3. Last Refreshed": string;
    "4. Interval"?: string;
    "5. Output Size"?: string;
    "6. Time Zone": string;
  };
  "Time Series (1min)"?: Record<string, TimeSeriesData>;
  "Time Series (5min)"?: Record<string, TimeSeriesData>;
  "Time Series (15min)"?: Record<string, TimeSeriesData>;
  "Time Series (30min)"?: Record<string, TimeSeriesData>;
  "Time Series (60min)"?: Record<string, TimeSeriesData>;
  "Time Series (Daily)"?: Record<string, TimeSeriesData>;
  "Weekly Time Series"?: Record<string, TimeSeriesData>;
  "Monthly Time Series"?: Record<string, TimeSeriesData>;
}

// Quote Endpoint
export interface QuoteResponse {
  "Global Quote": {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
}

// Search Endpoint
export interface SearchMatch {
  "1. symbol": string;
  "2. name": string;
  "3. type": string;
  "4. region": string;
  "5. marketOpen": string;
  "6. marketClose": string;
  "7. timezone": string;
  "8. currency": string;
  "9. matchScore": string;
}

export interface SearchResponse {
  bestMatches: SearchMatch[];
}

// Forex Interfaces
export interface ForexResponse {
  "Meta Data": {
    "1. Information": string;
    "2. From Symbol": string;
    "3. To Symbol": string;
    "4. Output Size": string;
    "5. Last Refreshed": string;
    "6. Time Zone": string;
  };
  "Time Series FX (1min)"?: Record<string, {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
  }>;
  "Time Series FX (Daily)"?: Record<string, {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
  }>;
}

// Cryptocurrency Interfaces
export interface CryptoResponse {
  "Meta Data": {
    "1. Information": string;
    "2. Digital Currency Code": string;
    "3. Digital Currency Name": string;
    "4. Market Code": string;
    "5. Market Name": string;
    "6. Last Refreshed": string;
    "7. Time Zone": string;
  };
  "Time Series (Digital Currency Daily)"?: Record<string, {
    "1a. open (USD)": string;
    "1b. open (USD)": string;
    "2a. high (USD)": string;
    "2b. high (USD)": string;
    "3a. low (USD)": string;
    "3b. low (USD)": string;
    "4a. close (USD)": string;
    "4b. close (USD)": string;
    "5. volume": string;
    "6. market cap (USD)": string;
  }>;
}

// Technical Indicators Interface
export interface TechnicalIndicatorResponse {
  "Meta Data": {
    "1: Symbol": string;
    "2: Indicator": string;
    "3: Last Refreshed": string;
    "4: Interval": string;
    "5: Time Period"?: string;
    "6: Series Type"?: string;
    "7: Time Zone": string;
  };
  "Technical Analysis: SMA"?: Record<string, { "SMA": string }>;
  "Technical Analysis: EMA"?: Record<string, { "EMA": string }>;
  "Technical Analysis: RSI"?: Record<string, { "RSI": string }>;
  "Technical Analysis: MACD"?: Record<string, { 
    "MACD": string;
    "MACD_Hist": string;
    "MACD_Signal": string;
  }>;
  "Technical Analysis: BBANDS"?: Record<string, {
    "Real Lower Band": string;
    "Real Middle Band": string;
    "Real Upper Band": string;
  }>;
  "Technical Analysis: STOCH"?: Record<string, {
    "SlowK": string;
    "SlowD": string;
  }>;
  "Technical Analysis: ADX"?: Record<string, { "ADX": string }>;
}

// Company Overview Interface
export interface CompanyOverview {
  Symbol: string;
  AssetType: string;
  Name: string;
  Description: string;
  CIK: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  Address: string;
  FiscalYearEnd: string;
  LatestQuarter: string;
  MarketCapitalization: string;
  EBITDA: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  "52WeekHigh": string;
  "52WeekLow": string;
  "50DayMovingAverage": string;
  "200DayMovingAverage": string;
  SharesOutstanding: string;
  DividendDate: string;
  ExDividendDate: string;
}

// News & Sentiment Interface
export interface NewsArticle {
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  banner_image: string;
  source: string;
  category_within_source: string;
  source_domain: string;
  topics: Array<{
    topic: string;
    relevance_score: string;
  }>;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment: Array<{
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }>;
}

export interface NewsResponse {
  items: string;
  sentiment_score_definition: string;
  relevance_score_definition: string;
  feed: NewsArticle[];
}

// Economic Indicators Interface
export interface EconomicIndicatorResponse {
  name: string;
  interval: string;
  unit: string;
  data: Array<{
    date: string;
    value: string;
  }>;
}

// API Function Types
export type TimeSeriesFunction = 
  | "TIME_SERIES_INTRADAY"
  | "TIME_SERIES_DAILY"
  | "TIME_SERIES_DAILY_ADJUSTED"
  | "TIME_SERIES_WEEKLY"
  | "TIME_SERIES_WEEKLY_ADJUSTED"
  | "TIME_SERIES_MONTHLY"
  | "TIME_SERIES_MONTHLY_ADJUSTED";

export type TechnicalIndicatorFunction =
  | "SMA" | "EMA" | "WMA" | "DEMA" | "TEMA" | "TRIMA" | "KAMA" | "MAMA" | "T3"
  | "MACD" | "MACDEXT" | "STOCH" | "STOCHF" | "RSI" | "STOCHRSI" | "WILLR"
  | "ADX" | "ADXR" | "APO" | "PPO" | "MOM" | "BOP" | "CCI" | "CMO" | "ROC"
  | "ROCR" | "AROON" | "AROONOSC" | "MFI" | "TRIX" | "ULTOSC" | "DX"
  | "MINUS_DI" | "PLUS_DI" | "MINUS_DM" | "PLUS_DM" | "BBANDS" | "MIDPOINT"
  | "MIDPRICE" | "SAR" | "TRANGE" | "ATR" | "NATR" | "AD" | "ADOSC" | "OBV";

export type Interval = "1min" | "5min" | "15min" | "30min" | "60min" | "daily" | "weekly" | "monthly";
export type SeriesType = "close" | "open" | "high" | "low";
export type OutputSize = "compact" | "full";

export class AlphaVantageService {
  private config: AlphaVantageConfig;
  private baseUrl = "https://www.alphavantage.co/query";

  constructor(config: AlphaVantageConfig) {
    this.config = config;
  }

  private async callAPI<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("apikey", this.config.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // Check for API error messages
    if (data["Error Message"]) {
      throw new Error(`Alpha Vantage API Error: ${data["Error Message"]}`);
    }
    
    if (data["Note"]) {
      throw new Error(`Alpha Vantage API Note: ${data["Note"]}`);
    }

    return data as T;
  }

  // ===== CORE STOCK APIS =====

  /**
   * Get intraday time series data
   */
  async getIntradayTimeSeries(
    symbol: string,
    interval: "1min" | "5min" | "15min" | "30min" | "60min",
    options: {
      adjusted?: boolean;
      extendedHours?: boolean;
      month?: string;
      outputSize?: OutputSize;
    } = {}
  ): Promise<TimeSeriesResponse> {
    const params: Record<string, string> = {
      function: "TIME_SERIES_INTRADAY",
      symbol,
      interval,
    };

    if (options.adjusted !== undefined) params.adjusted = options.adjusted.toString();
    if (options.extendedHours !== undefined) params.extended_hours = options.extendedHours.toString();
    if (options.month) params.month = options.month;
    if (options.outputSize) params.outputsize = options.outputSize;

    return this.callAPI<TimeSeriesResponse>(params);
  }

  /**
   * Get daily time series data
   */
  async getDailyTimeSeries(
    symbol: string,
    adjusted: boolean = false,
    outputSize: OutputSize = "compact"
  ): Promise<TimeSeriesResponse> {
    return this.callAPI<TimeSeriesResponse>({
      function: adjusted ? "TIME_SERIES_DAILY_ADJUSTED" : "TIME_SERIES_DAILY",
      symbol,
      outputsize: outputSize,
    });
  }

  /**
   * Get weekly time series data
   */
  async getWeeklyTimeSeries(
    symbol: string,
    adjusted: boolean = false
  ): Promise<TimeSeriesResponse> {
    return this.callAPI<TimeSeriesResponse>({
      function: adjusted ? "TIME_SERIES_WEEKLY_ADJUSTED" : "TIME_SERIES_WEEKLY",
      symbol,
    });
  }

  /**
   * Get monthly time series data
   */
  async getMonthlyTimeSeries(
    symbol: string,
    adjusted: boolean = false
  ): Promise<TimeSeriesResponse> {
    return this.callAPI<TimeSeriesResponse>({
      function: adjusted ? "TIME_SERIES_MONTHLY_ADJUSTED" : "TIME_SERIES_MONTHLY",
      symbol,
    });
  }

  /**
   * Get real-time quote
   */
  async getQuote(symbol: string): Promise<QuoteResponse> {
    return this.callAPI<QuoteResponse>({
      function: "GLOBAL_QUOTE",
      symbol,
    });
  }

  /**
   * Search for symbols
   */
  async searchSymbols(keywords: string): Promise<SearchResponse> {
    return this.callAPI<SearchResponse>({
      function: "SYMBOL_SEARCH",
      keywords,
    });
  }

  // ===== TECHNICAL INDICATORS =====

  /**
   * Get technical indicator data
   */
  async getTechnicalIndicator(
    symbol: string,
    indicator: TechnicalIndicatorFunction,
    interval: Interval,
    options: {
      timePeriod?: number;
      seriesType?: SeriesType;
      fastPeriod?: number;
      slowPeriod?: number;
      signalPeriod?: number;
      fastKPeriod?: number;
      slowKPeriod?: number;
      slowDPeriod?: number;
      fastDPeriod?: number;
      maType?: number;
      nbdevup?: number;
      nbdevdn?: number;
      month?: string;
    } = {}
  ): Promise<TechnicalIndicatorResponse> {
    const params: Record<string, string> = {
      function: indicator,
      symbol,
      interval,
    };

    if (options.timePeriod) params.time_period = options.timePeriod.toString();
    if (options.seriesType) params.series_type = options.seriesType;
    if (options.fastPeriod) params.fastperiod = options.fastPeriod.toString();
    if (options.slowPeriod) params.slowperiod = options.slowPeriod.toString();
    if (options.signalPeriod) params.signalperiod = options.signalPeriod.toString();
    if (options.fastKPeriod) params.fastkperiod = options.fastKPeriod.toString();
    if (options.slowKPeriod) params.slowkperiod = options.slowKPeriod.toString();
    if (options.slowDPeriod) params.slowdperiod = options.slowDPeriod.toString();
    if (options.fastDPeriod) params.fastdperiod = options.fastDPeriod.toString();
    if (options.maType) params.matype = options.maType.toString();
    if (options.nbdevup) params.nbdevup = options.nbdevup.toString();
    if (options.nbdevdn) params.nbdevdn = options.nbdevdn.toString();
    if (options.month) params.month = options.month;

    return this.callAPI<TechnicalIndicatorResponse>(params);
  }

  // ===== FUNDAMENTAL DATA =====

  /**
   * Get company overview
   */
  async getCompanyOverview(symbol: string): Promise<CompanyOverview> {
    return this.callAPI<CompanyOverview>({
      function: "OVERVIEW",
      symbol,
    });
  }

  // ===== FOREX =====

  /**
   * Get forex exchange rates
   */
  async getForexExchangeRate(fromCurrency: string, toCurrency: string): Promise<any> {
    return this.callAPI({
      function: "CURRENCY_EXCHANGE_RATE",
      from_currency: fromCurrency,
      to_currency: toCurrency,
    });
  }

  /**
   * Get forex time series data
   */
  async getForexTimeSeries(
    fromSymbol: string,
    toSymbol: string,
    interval: "1min" | "5min" | "15min" | "30min" | "60min" | "daily" | "weekly" | "monthly",
    outputSize: OutputSize = "compact"
  ): Promise<ForexResponse> {
    const functionMap = {
      "1min": "FX_INTRADAY",
      "5min": "FX_INTRADAY", 
      "15min": "FX_INTRADAY",
      "30min": "FX_INTRADAY",
      "60min": "FX_INTRADAY",
      "daily": "FX_DAILY",
      "weekly": "FX_WEEKLY",
      "monthly": "FX_MONTHLY",
    };

    const params: Record<string, string> = {
      function: functionMap[interval],
      from_symbol: fromSymbol,
      to_symbol: toSymbol,
      outputsize: outputSize,
    };

    if (["1min", "5min", "15min", "30min", "60min"].includes(interval)) {
      params.interval = interval;
    }

    return this.callAPI<ForexResponse>(params);
  }

  // ===== CRYPTOCURRENCIES =====

  /**
   * Get cryptocurrency exchange rates
   */
  async getCryptoExchangeRate(fromCurrency: string, toCurrency: string): Promise<any> {
    return this.callAPI({
      function: "CURRENCY_EXCHANGE_RATE",
      from_currency: fromCurrency,
      to_currency: toCurrency,
    });
  }

  /**
   * Get cryptocurrency time series data
   */
  async getCryptoTimeSeries(
    symbol: string,
    market: string = "USD",
    interval: "daily" | "weekly" | "monthly" = "daily"
  ): Promise<CryptoResponse> {
    const functionMap = {
      daily: "DIGITAL_CURRENCY_DAILY",
      weekly: "DIGITAL_CURRENCY_WEEKLY", 
      monthly: "DIGITAL_CURRENCY_MONTHLY",
    };

    return this.callAPI<CryptoResponse>({
      function: functionMap[interval],
      symbol,
      market,
    });
  }

  // ===== NEWS & SENTIMENT =====

  /**
   * Get news and sentiment data
   */
  async getNewsAndSentiment(
    tickers?: string[],
    topics?: string[],
    timeFrom?: string,
    timeTo?: string,
    sort?: "LATEST" | "EARLIEST" | "RELEVANCE",
    limit?: number
  ): Promise<NewsResponse> {
    const params: Record<string, string> = {
      function: "NEWS_SENTIMENT",
    };

    if (tickers && tickers.length > 0) params.tickers = tickers.join(",");
    if (topics && topics.length > 0) params.topics = topics.join(",");
    if (timeFrom) params.time_from = timeFrom;
    if (timeTo) params.time_to = timeTo;
    if (sort) params.sort = sort;
    if (limit) params.limit = limit.toString();

    return this.callAPI<NewsResponse>(params);
  }

  // ===== ECONOMIC INDICATORS =====

  /**
   * Get economic indicator data
   */
  async getEconomicIndicator(
    indicator: "REAL_GDP" | "REAL_GDP_PER_CAPITA" | "TREASURY_YIELD" | "FEDERAL_FUNDS_RATE" | 
              "CPI" | "INFLATION" | "RETAIL_SALES" | "DURABLES" | "UNEMPLOYMENT" | "NONFARM_PAYROLL",
    interval?: "annual" | "quarterly" | "monthly"
  ): Promise<EconomicIndicatorResponse> {
    const params: Record<string, string> = {
      function: indicator,
    };

    if (interval) params.interval = interval;

    return this.callAPI<EconomicIndicatorResponse>(params);
  }

  // ===== UTILITY METHODS =====

  /**
   * Parse time series data into a more usable format
   */
  static parseTimeSeriesData(response: TimeSeriesResponse): Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> {
    const timeSeriesKey = Object.keys(response).find(key => key.includes("Time Series"));
    if (!timeSeriesKey) return [];

    const timeSeries = response[timeSeriesKey as keyof TimeSeriesResponse] as Record<string, TimeSeriesData>;
    
    return Object.entries(timeSeries).map(([date, data]) => ({
      date,
      open: parseFloat(data["1. open"]),
      high: parseFloat(data["2. high"]),
      low: parseFloat(data["3. low"]),
      close: parseFloat(data["4. close"]),
      volume: parseInt(data["5. volume"]),
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Parse technical indicator data
   */
  static parseTechnicalIndicatorData(response: TechnicalIndicatorResponse): Array<{
    date: string;
    value: number;
    [key: string]: any;
  }> {
    const indicatorKey = Object.keys(response).find(key => key.includes("Technical Analysis"));
    if (!indicatorKey) return [];

    const indicatorData = response[indicatorKey as keyof TechnicalIndicatorResponse] as Record<string, any>;
    
    return Object.entries(indicatorData).map(([date, data]) => {
      const result: any = { date };
      
      if (typeof data === "object") {
        Object.entries(data).forEach(([key, value]) => {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "_");
          result[cleanKey] = typeof value === "string" ? parseFloat(value) : value;
        });
      } else {
        result.value = typeof data === "string" ? parseFloat(data) : data;
      }
      
      return result;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

export default AlphaVantageService;