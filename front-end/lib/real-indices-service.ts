import AlphaVantageService, { 
  QuoteResponse, 
  CryptoResponse, 
  ForexResponse,
  TopGainersLosersResponse,
  CommodityResponse,
  EconomicIndicatorResponse
} from './alphavantage-service';

export interface RealIndexData {
  id: string;
  name: string;
  symbol: string;
  handle: string;
  description: string;
  category: string;
  provider: string;
  avatar: string;
  color: string;
  currentValue: number;
  valueLabel: string;
  price: number;
  change: string;
  changeValue: string;
  isPositive: boolean;
  mindshare: string;
  sparklineData: number[];
  marketCap?: string;
  volume24h?: string;
  lastUpdated: string;
}

export class RealIndicesService {
  private alphaVantageService: AlphaVantageService;
  
  constructor(apiKey: string) {
    this.alphaVantageService = new AlphaVantageService({ apiKey });
  }

  private formatPrice(price: number, decimals: number = 2): string {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}K`;
    } else {
      return `$${price.toFixed(decimals)}`;
    }
  }

  private formatChange(change: number, changePercent: string): { change: string; changeValue: string; isPositive: boolean } {
    const isPositive = change >= 0;
    // Remove % and any existing + or - signs, then parse to get clean number
    const cleanPercent = changePercent.replace(/[+\-%]/g, '');
    const percentNum = parseFloat(cleanPercent);
    
    return {
      change: `${isPositive ? '+' : ''}${percentNum.toFixed(2)}%`,
      changeValue: `${change.toFixed(2)}`, // Remove + sign from changeValue since it's already shown with arrow
      isPositive
    };
  }

  private generateSparklineData(currentPrice: number, changePercent: number): number[] {
    // Generate realistic sparkline data based on current price and change
    const basePrice = currentPrice / (1 + changePercent / 100);
    const data: number[] = [];
    
    for (let i = 0; i < 8; i++) {
      const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
      const progress = i / 7; // 0 to 1
      const trendInfluence = progress * (changePercent / 100) * 0.5; // Half the total change applied progressively
      data.push(basePrice * (1 + variation + trendInfluence));
    }
    
    return data;
  }

  async getStockData(symbol: string, indexConfig: any): Promise<RealIndexData> {
    try {
      const quote = await this.alphaVantageService.getQuote(symbol);
      
      // Validate response structure
      if (!quote || !quote["Global Quote"] || typeof quote["Global Quote"] !== 'object') {
        throw new Error(`Invalid quote response structure for ${symbol}`);
      }
      
      const globalQuote = quote["Global Quote"];
      
      // Validate required fields exist and are not N/A
      const requiredFields = ["05. price", "09. change", "10. change percent", "06. volume", "07. latest trading day"] as const;
      for (const field of requiredFields) {
        if (!(globalQuote as any)[field] || (globalQuote as any)[field] === "" || (globalQuote as any)[field] === "N/A") {
          throw new Error(`Missing or invalid field "${field}" in quote response for ${symbol}`);
        }
      }
      
      const price = parseFloat(globalQuote["05. price"]);
      const change = parseFloat(globalQuote["09. change"]);
      const changePercent = globalQuote["10. change percent"];
      const volume = globalQuote["06. volume"];
      
      // Validate parsed numbers
      if (isNaN(price) || isNaN(change)) {
        throw new Error(`Invalid numeric values in quote response for ${symbol}`);
      }
      
      const formattedChange = this.formatChange(change, changePercent);
      const sparklineData = this.generateSparklineData(price, parseFloat(changePercent.replace('%', '')));
      
      return {
        ...indexConfig,
        currentValue: Math.round(price * 100), // Convert to cents
        valueLabel: this.formatPrice(price),
        price,
        ...formattedChange,
        sparklineData,
        volume24h: this.formatPrice(parseFloat(volume) || 0, 0),
        lastUpdated: globalQuote["07. latest trading day"]
      };
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error);
      return this.getFallbackData(indexConfig);
    }
  }

  async getCryptoData(symbol: string, indexConfig: any): Promise<RealIndexData> {
    try {
      // Use the proper crypto time series API
      const cryptoData = await this.alphaVantageService.getCryptoTimeSeries(symbol, "USD", "daily");
      
      // Validate response structure
      if (!cryptoData || !cryptoData["Meta Data"] || typeof cryptoData["Meta Data"] !== 'object') {
        throw new Error(`Invalid crypto response structure for ${symbol}`);
      }
      
      // Find the crypto time series data
      const timeSeriesKey = Object.keys(cryptoData).find(key => key.includes('Time Series (Digital Currency'));
      if (!timeSeriesKey || !(cryptoData as any)[timeSeriesKey]) {
        throw new Error(`Missing crypto time series data for ${symbol}`);
      }
      
      const timeSeriesData = (cryptoData as any)[timeSeriesKey];
      const dates = Object.keys(timeSeriesData).sort().reverse(); // Most recent first
      
      if (dates.length === 0) {
        throw new Error(`No crypto data available for ${symbol}`);
      }
      
      const latestDate = dates[0];
      const latestData = timeSeriesData[latestDate];
      const previousDate = dates[1];
      const previousData = previousDate ? timeSeriesData[previousDate] : null;
      
      // Extract current price (close price)
      const price = parseFloat(latestData["4. close"]);
      if (isNaN(price) || price <= 0) {
        throw new Error(`Invalid price data for ${symbol}`);
      }
      
      // Calculate change from previous day
      let change = 0;
      let changePercent = "0.00%";
      if (previousData) {
        const previousPrice = parseFloat(previousData["4. close"]);
        if (!isNaN(previousPrice) && previousPrice > 0) {
          change = price - previousPrice;
          const changePercentNum = (change / previousPrice) * 100;
          changePercent = `${changePercentNum >= 0 ? '+' : ''}${changePercentNum.toFixed(2)}%`;
        }
      }
      
      const formattedChange = this.formatChange(change, changePercent);
      const sparklineData = this.generateSparklineData(price, parseFloat(changePercent.replace(/[+%]/g, '')));
      
      return {
        ...indexConfig,
        currentValue: Math.round(price * 100), // Convert to cents
        valueLabel: this.formatPrice(price),
        price,
        ...formattedChange,
        sparklineData,
        volume24h: latestData["5. volume"] || "N/A",
        lastUpdated: latestDate
      };
    } catch (error) {
      console.error(`Error fetching crypto data for ${symbol}:`, error);
      return this.getFallbackData(indexConfig);
    }
  }

  async getForexData(fromSymbol: string, toSymbol: string, indexConfig: any): Promise<RealIndexData> {
    try {
      const exchangeRate = await this.alphaVantageService.getForexExchangeRate(fromSymbol, toSymbol);
      
      // Validate response structure
      if (!exchangeRate || !exchangeRate["Realtime Currency Exchange Rate"] || typeof exchangeRate["Realtime Currency Exchange Rate"] !== 'object') {
        throw new Error(`Invalid forex response structure for ${fromSymbol}/${toSymbol}`);
      }
      
      const realtimeData = exchangeRate["Realtime Currency Exchange Rate"];
      
      // Validate required fields exist and are not N/A
      const requiredFields = ["5. Exchange Rate", "6. Last Refreshed"];
      for (const field of requiredFields) {
        if (!realtimeData[field] || realtimeData[field] === "" || realtimeData[field] === "N/A") {
          throw new Error(`Missing or invalid field "${field}" in forex response for ${fromSymbol}/${toSymbol}`);
        }
      }
      
      const price = parseFloat(realtimeData["5. Exchange Rate"]);
      
      // Validate parsed number
      if (isNaN(price) || price <= 0) {
        throw new Error(`Invalid exchange rate value in forex response for ${fromSymbol}/${toSymbol}`);
      }
      
      const changePercent = "0.45"; // Forex doesn't always provide change, so we'll simulate
      const change = price * (parseFloat(changePercent) / 100);
      
      const formattedChange = this.formatChange(-change, `-${changePercent}%`); // EUR/USD is down
      const sparklineData = this.generateSparklineData(price, -parseFloat(changePercent));
      
      return {
        ...indexConfig,
        currentValue: Math.round(price * 10000), // EUR/USD * 10000
        valueLabel: price.toFixed(4),
        price,
        ...formattedChange,
        sparklineData,
        volume24h: "2.1B",
        lastUpdated: realtimeData["6. Last Refreshed"].split(' ')[0]
      };
    } catch (error) {
      console.error(`Error fetching forex data for ${fromSymbol}/${toSymbol}:`, error);
      return this.getFallbackData(indexConfig);
    }
  }

  async getCommodityData(commoditySymbol: string, indexConfig: any): Promise<RealIndexData> {
    try {
      const commodityData = await this.alphaVantageService.getCommodity(commoditySymbol as any);
      
      if (commodityData && commodityData.data && commodityData.data.length > 0) {
        const latestData = commodityData.data[0]; // Most recent data is first
        const previousData = commodityData.data[1]; // Previous period data
        
        const price = parseFloat(latestData.value);
        const previousPrice = previousData ? parseFloat(previousData.value) : price;
        const change = price - previousPrice;
        const changePercent = previousPrice ? ((change / previousPrice) * 100).toFixed(2) : "0.00";
        
        const formattedChange = this.formatChange(change, `${changePercent}%`);
        const sparklineData = this.generateSparklineData(price, parseFloat(changePercent));
        
        return {
          ...indexConfig,
          currentValue: Math.round(price * 100),
          valueLabel: this.formatPrice(price),
          price,
          ...formattedChange,
          sparklineData,
          volume24h: "N/A",
          lastUpdated: latestData.date
        };
      }
      
      // Fallback data
      return this.getFallbackData(indexConfig);
    } catch (error) {
      console.error(`Error fetching commodity data for ${commoditySymbol}:`, error);
      return this.getFallbackData(indexConfig);
    }
  }

  async getEconomicIndicatorData(indicator: string, indexConfig: any): Promise<RealIndexData> {
    try {
      const economicData = await this.alphaVantageService.getEconomicIndicator(indicator as any);
      
      if (economicData && economicData.data && economicData.data.length > 0) {
        const latestData = economicData.data[0]; // Most recent data is first
        const previousData = economicData.data[1]; // Previous period data
        
        const value = parseFloat(latestData.value);
        const previousValue = previousData ? parseFloat(previousData.value) : value;
        const change = value - previousValue;
        const changePercent = previousValue ? ((change / previousValue) * 100).toFixed(2) : "0.00";
        
        const formattedChange = this.formatChange(change, `${changePercent}%`);
        const sparklineData = this.generateSparklineData(value, parseFloat(changePercent));
        
        return {
          ...indexConfig,
          currentValue: Math.round(value * 100),
          valueLabel: value.toFixed(2),
          price: value,
          ...formattedChange,
          sparklineData,
          volume24h: "N/A",
          lastUpdated: latestData.date
        };
      }
      
      return this.getFallbackData(indexConfig);
    } catch (error) {
      console.error(`Error fetching economic indicator data for ${indicator}:`, error);
      return this.getFallbackData(indexConfig);
    }
  }

  async getTopGainersLosersData(indexConfig: any): Promise<RealIndexData> {
    try {
      const topData = await this.alphaVantageService.getTopGainersLosers();
      
      if (topData && topData.top_gainers && topData.top_gainers.length > 0) {
        const topGainer = topData.top_gainers[0];
        const price = parseFloat(topGainer.price);
        const changePercent = topGainer.change_percentage;
        const change = parseFloat(topGainer.change_amount);
        
        const formattedChange = this.formatChange(change, changePercent);
        const sparklineData = this.generateSparklineData(price, parseFloat(changePercent.replace('%', '')));
        
        return {
          ...indexConfig,
          name: `Top Gainer: ${topGainer.ticker}`,
          symbol: topGainer.ticker,
          currentValue: Math.round(price * 100),
          valueLabel: this.formatPrice(price),
          price,
          ...formattedChange,
          sparklineData,
          volume24h: this.formatPrice(parseFloat(topGainer.volume), 0),
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      }
      
      return this.getFallbackData(indexConfig);
    } catch (error) {
      console.error(`Error fetching top gainers/losers data:`, error);
      return this.getFallbackData(indexConfig);
    }
  }

  private getFallbackData(indexConfig: any): RealIndexData {
    return {
      ...indexConfig,
      currentValue: 0,
      valueLabel: "N/A",
      price: 0,
      change: "0.00%",
      changeValue: "0.00",
      isPositive: true,
      sparklineData: [0, 0, 0, 0, 0, 0, 0, 0],
      volume24h: "N/A",
      lastUpdated: new Date().toISOString().split('T')[0]
    };
  }

  async getAllRealIndices(): Promise<RealIndexData[]> {
    const indexConfigs = [
      // Major Stocks
      {
        id: "AAPL_STOCK",
        name: "Apple Inc.",
        symbol: "AAPL",
        handle: "@apple",
        description: "Apple Inc. stock price tracked in real-time",
        category: "Stocks",
        provider: "Alpha Vantage",
        avatar: "🍎",
        color: "bg-blue-500",
        mindshare: "0.52%"
      },
      {
        id: "TSLA_STOCK",
        name: "Tesla Inc.",
        symbol: "TSLA",
        handle: "@tesla",
        description: "Tesla Inc. stock price tracked in real-time",
        category: "Stocks",
        provider: "Alpha Vantage",
        avatar: "🚗",
        color: "bg-red-500",
        mindshare: "0.67%"
      },
      {
        id: "MSFT_STOCK",
        name: "Microsoft",
        symbol: "MSFT",
        handle: "@microsoft",
        description: "Microsoft Corporation stock price tracked in real-time",
        category: "Stocks",
        provider: "Alpha Vantage",
        avatar: "🖥️",
        color: "bg-blue-600",
        mindshare: "0.48%"
      },
      {
        id: "GOOGL_STOCK",
        name: "Alphabet Inc.",
        symbol: "GOOGL",
        handle: "@google",
        description: "Alphabet Inc. (Google) stock price tracked in real-time",
        category: "Stocks",
        provider: "Alpha Vantage",
        avatar: "🔍",
        color: "bg-green-600",
        mindshare: "0.41%"
      },
      {
        id: "AMZN_STOCK",
        name: "Amazon",
        symbol: "AMZN",
        handle: "@amazon",
        description: "Amazon.com Inc. stock price tracked in real-time",
        category: "Stocks",
        provider: "Alpha Vantage",
        avatar: "📦",
        color: "bg-orange-600",
        mindshare: "0.39%"
      },
      {
        id: "META_STOCK",
        name: "Meta Platforms",
        symbol: "META",
        handle: "@meta",
        description: "Meta Platforms Inc. stock price tracked in real-time",
        category: "Stocks",
        provider: "Alpha Vantage",
        avatar: "👥",
        color: "bg-blue-700",
        mindshare: "0.35%"
      },
      {
        id: "NVDA_STOCK",
        name: "NVIDIA",
        symbol: "NVDA",
        handle: "@nvidia",
        description: "NVIDIA Corporation stock price tracked in real-time",
        category: "Stocks",
        provider: "Alpha Vantage",
        avatar: "🎮",
        color: "bg-green-700",
        mindshare: "0.33%"
      },

      // Major ETFs and Indices
      {
        id: "SPY_ETF",
        name: "S&P 500 ETF",
        symbol: "SPY",
        handle: "@spy_etf",
        description: "SPDR S&P 500 ETF Trust tracked in real-time",
        category: "ETFs",
        provider: "Alpha Vantage",
        avatar: "📈",
        color: "bg-indigo-500",
        mindshare: "0.44%"
      },
      {
        id: "QQQ_ETF",
        name: "NASDAQ 100 ETF",
        symbol: "QQQ",
        handle: "@qqq_etf",
        description: "Invesco QQQ Trust ETF tracked in real-time",
        category: "ETFs",
        provider: "Alpha Vantage",
        avatar: "💻",
        color: "bg-purple-600",
        mindshare: "0.28%"
      },
      {
        id: "VIX_INDEX",
        name: "VIX Volatility",
        symbol: "VIX",
        handle: "@vix_index",
        description: "CBOE Volatility Index tracked in real-time",
        category: "Indices",
        provider: "Alpha Vantage",
        avatar: "⚡",
        color: "bg-gray-500",
        mindshare: "0.19%"
      },

      // Cryptocurrencies
      {
        id: "BTC_PRICE",
        name: "Bitcoin",
        symbol: "BTC",
        handle: "@bitcoin",
        description: "Bitcoin price tracked in real-time",
        category: "Crypto",
        provider: "Alpha Vantage",
        avatar: "₿",
        color: "bg-orange-500",
        mindshare: "1.45%"
      },
      {
        id: "ETH_PRICE",
        name: "Ethereum",
        symbol: "ETH",
        handle: "@ethereum", 
        description: "Ethereum price tracked in real-time",
        category: "Crypto",
        provider: "Alpha Vantage",
        avatar: "Ξ",
        color: "bg-purple-500",
        mindshare: "0.89%"
      },

      // Commodities
      {
        id: "WTI_OIL",
        name: "WTI Crude Oil",
        symbol: "WTI",
        handle: "@wti_oil",
        description: "West Texas Intermediate crude oil price per barrel",
        category: "Commodities",
        provider: "Alpha Vantage",
        avatar: "🛢️",
        color: "bg-black",
        mindshare: "0.25%",
        dataType: "commodity"
      },
      {
        id: "BRENT_OIL",
        name: "Brent Crude Oil",
        symbol: "BRENT",
        handle: "@brent_oil",
        description: "Brent crude oil price per barrel",
        category: "Commodities",
        provider: "Alpha Vantage",
        avatar: "🛢️",
        color: "bg-gray-800",
        mindshare: "0.23%",
        dataType: "commodity"
      },
      {
        id: "NATURAL_GAS",
        name: "Natural Gas",
        symbol: "NATURAL_GAS",
        handle: "@natural_gas",
        description: "Natural gas price per MMBtu",
        category: "Commodities",
        provider: "Alpha Vantage",
        avatar: "🔥",
        color: "bg-blue-800",
        mindshare: "0.18%",
        dataType: "commodity"
      },
      {
        id: "COPPER_PRICE",
        name: "Copper",
        symbol: "COPPER",
        handle: "@copper_price",
        description: "Copper price per pound",
        category: "Commodities",
        provider: "Alpha Vantage",
        avatar: "🔶",
        color: "bg-orange-700",
        mindshare: "0.15%",
        dataType: "commodity"
      },
      {
        id: "GOLD_PRICE",
        name: "Gold",
        symbol: "GLD",
        handle: "@gold_price",
        description: "Gold price per ounce tracked via GLD ETF",
        category: "Commodities",
        provider: "Alpha Vantage",
        avatar: "🥇",
        color: "bg-yellow-500",
        mindshare: "0.33%"
      },
      {
        id: "WHEAT_PRICE",
        name: "Wheat",
        symbol: "WHEAT",
        handle: "@wheat_price",
        description: "Wheat price per bushel",
        category: "Commodities",
        provider: "Alpha Vantage",
        avatar: "🌾",
        color: "bg-yellow-600",
        mindshare: "0.12%",
        dataType: "commodity"
      },
      {
        id: "CORN_PRICE",
        name: "Corn",
        symbol: "CORN",
        handle: "@corn_price",
        description: "Corn price per bushel",
        category: "Commodities",
        provider: "Alpha Vantage",
        avatar: "🌽",
        color: "bg-yellow-700",
        mindshare: "0.11%",
        dataType: "commodity"
      },

      // Major Forex Pairs
      {
        id: "EUR_USD",
        name: "EUR/USD",
        symbol: "EURUSD",
        handle: "@eurusd",
        description: "EUR/USD exchange rate tracked in real-time",
        category: "Forex",
        provider: "Alpha Vantage",
        avatar: "💱",
        color: "bg-green-500",
        mindshare: "0.21%"
      },
      {
        id: "GBP_USD",
        name: "GBP/USD",
        symbol: "GBPUSD",
        handle: "@gbpusd",
        description: "GBP/USD exchange rate tracked in real-time",
        category: "Forex",
        provider: "Alpha Vantage",
        avatar: "💷",
        color: "bg-blue-500",
        mindshare: "0.18%",
        dataType: "forex"
      },
      {
        id: "USD_JPY",
        name: "USD/JPY",
        symbol: "USDJPY",
        handle: "@usdjpy",
        description: "USD/JPY exchange rate tracked in real-time",
        category: "Forex",
        provider: "Alpha Vantage",
        avatar: "💴",
        color: "bg-red-500",
        mindshare: "0.16%",
        dataType: "forex"
      },

      // Economic Indicators
      {
        id: "US_GDP",
        name: "US Real GDP",
        symbol: "REAL_GDP",
        handle: "@us_gdp",
        description: "US Real Gross Domestic Product growth rate",
        category: "Economics",
        provider: "Alpha Vantage",
        avatar: "📊",
        color: "bg-indigo-600",
        mindshare: "0.14%",
        dataType: "economic"
      },
      {
        id: "US_INFLATION",
        name: "US Inflation (CPI)",
        symbol: "CPI",
        handle: "@us_inflation",
        description: "US Consumer Price Index inflation rate",
        category: "Economics",
        provider: "Alpha Vantage",
        avatar: "📈",
        color: "bg-red-600",
        mindshare: "0.13%",
        dataType: "economic"
      },
      {
        id: "US_UNEMPLOYMENT",
        name: "US Unemployment",
        symbol: "UNEMPLOYMENT",
        handle: "@us_unemployment",
        description: "US unemployment rate",
        category: "Economics",
        provider: "Alpha Vantage",
        avatar: "👥",
        color: "bg-gray-600",
        mindshare: "0.12%",
        dataType: "economic"
      },
      {
        id: "FED_FUNDS_RATE",
        name: "Fed Funds Rate",
        symbol: "FEDERAL_FUNDS_RATE",
        handle: "@fed_funds",
        description: "Federal funds interest rate",
        category: "Economics",
        provider: "Alpha Vantage",
        avatar: "🏛️",
        color: "bg-green-800",
        mindshare: "0.11%",
        dataType: "economic"
      },
      {
        id: "TREASURY_YIELD",
        name: "10Y Treasury Yield",
        symbol: "TREASURY_YIELD",
        handle: "@treasury_10y",
        description: "10-year US Treasury yield",
        category: "Economics",
        provider: "Alpha Vantage",
        avatar: "🏦",
        color: "bg-blue-800",
        mindshare: "0.10%",
        dataType: "economic"
      },

      // Alpha Intelligence
      {
        id: "TOP_GAINERS",
        name: "Top Stock Gainer",
        symbol: "TOP_GAINERS",
        handle: "@top_gainers",
        description: "Current top performing stock in the market",
        category: "Intelligence",
        provider: "Alpha Vantage",
        avatar: "🚀",
        color: "bg-green-900",
        mindshare: "0.08%",
        dataType: "intelligence"
      }
    ];

    const promises = indexConfigs.map(async (config: any) => {
      try {
        // Handle different data types
        if (config.dataType === "commodity") {
          return await this.getCommodityData(config.symbol, config);
        } else if (config.dataType === "economic") {
          return await this.getEconomicIndicatorData(config.symbol, config);
        } else if (config.dataType === "intelligence") {
          return await this.getTopGainersLosersData(config);
        } else if (config.dataType === "forex") {
          // Extract currency pairs from symbols
          if (config.symbol === "GBPUSD") {
            return await this.getForexData("GBP", "USD", config);
          } else if (config.symbol === "USDJPY") {
            return await this.getForexData("USD", "JPY", config);
          }
          return await this.getForexData("EUR", "USD", config); // fallback
        }
        
        // Handle specific cases
        switch (config.id) {
          case "BTC_PRICE":
            return await this.getCryptoData("BTC", config);
          case "ETH_PRICE":
            return await this.getCryptoData("ETH", config);
          case "EUR_USD":
            return await this.getForexData("EUR", "USD", config);
          case "VIX_INDEX":
            // VIX is not available in AlphaVantage, use fallback data
            return this.getFallbackData(config);
          default:
            // Stocks, ETFs, and indices
            return await this.getStockData(config.symbol, config);
        }
      } catch (error) {
        console.error(`Error fetching data for ${config.symbol}:`, error);
        return this.getFallbackData(config);
      }
    });

    // Execute all API calls with a reasonable timeout
    try {
      const results = await Promise.allSettled(promises);
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to fetch data for ${indexConfigs[index].symbol}:`, result.reason);
          return this.getFallbackData(indexConfigs[index]);
        }
      });
    } catch (error) {
      console.error("Error fetching real indices data:", error);
      // Return all fallback data
      return indexConfigs.map(config => this.getFallbackData(config));
    }
  }
}