"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft, 
  Plus,
  Activity,
  BarChart3,
  MessageCircle,
  Heart,
  Repeat2,
  Eye,
  Loader2,
  RefreshCw,
  ArrowUpDown
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useOrders, OPERATORS } from "@/hooks/useOrders";
import { blockchainService, CONTRACTS } from "@/lib/blockchain-service";
import AlphaVantageService, { TimeSeriesResponse } from "@/lib/alphavantage-service";
import { RealIndicesService } from "@/lib/real-indices-service";
import { SwapBox } from "@/components/SwapBox";
import { AdminBox } from "@/components/AdminBox";
import { TokenSelector } from "@/components/TokenSelector";
import { Token, tokenService } from "@/lib/token-service";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface IndexDetailClientProps {
  indexData: any;
}

// Map index IDs to Alpha Vantage symbols
const getAlphaVantageSymbol = (indexId: string): string => {
  const symbolMap: Record<string, string> = {
    'aapl_stock': 'AAPL',  // Make sure case matches
    'AAPL_STOCK': 'AAPL',
    'btc_price': 'BTCUSD',
    'BTC_PRICE': 'BTCUSD',
    'eth_price': 'ETHUSD',
    'ETH_PRICE': 'ETHUSD', 
    'gold_price': 'GLD',
    'GOLD_PRICE': 'GLD', // Using GLD ETF as proxy for gold
    'eur_usd': 'EURUSD',
    'EUR_USD': 'EURUSD',
    'tsla_stock': 'TSLA',
    'TSLA_STOCK': 'TSLA',
    'spy_etf': 'SPY',
    'SPY_ETF': 'SPY',
    'vix_index': 'VIX',
    'VIX_INDEX': 'VIX'
  };
  console.log(`🔍 Looking up symbol for indexId: "${indexId}", found: "${symbolMap[indexId] || 'IBM (default)'}"`);
  return symbolMap[indexId] || 'IBM'; // Default to IBM if not found
};

// Map index IDs to blockchain index IDs (supports both predefined and custom)
const getBlockchainIndexId = (indexId: string): number | null => {
  const indexMap: Record<string, number> = {
    // Market index mappings to predefined blockchain indices (0-5)
    'inflation_rate': 0,      // Inflation Rate
    'elon_followers': 1,      // Elon Followers
    'btc_price': 2,           // BTC Price (predefined)
    'vix_index': 3,           // VIX Index (predefined)
    'unemployment': 4,        // Unemployment Rate
    'tsla_stock': 5,          // Tesla Stock (predefined)
    
    // Fallback mappings for common market indices to custom indices
    'aapl_stock': 6,          // Apple (likely custom index)
    
    // Direct blockchain index support
    'blockchain_0': 0, 'blockchain_1': 1, 'blockchain_2': 2, 'blockchain_3': 3, 
    'blockchain_4': 4, 'blockchain_5': 5, 'blockchain_6': 6, 'blockchain_7': 7,
    'blockchain_8': 8, 'blockchain_9': 9, 'blockchain_10': 10, 'blockchain_11': 11, 'blockchain_12': 12
  };
  return indexMap[indexId] ?? null;
};

export function IndexDetailClient({ indexData: index }: IndexDetailClientProps) {
  const router = useRouter();
  const [isRequestingIndex, setIsRequestingIndex] = useState(false);
  const [chartData, setChartData] = useState<Array<{
    date: string;
    price: number;
    sentiment?: number;
    close: number;
    high: number;
    low: number;
    open: number;
    volume: number;
  }>>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [realIndexData, setRealIndexData] = useState(index);
  
  // Order creation form
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [orderForm, setOrderForm] = useState({
    description: "",
    fromAmount: "",
    toAmount: "",
    operator: OPERATORS.GT,
    threshold: "",
    expiry: "24" // hours
  });
  
  const { isConnected, walletAddress, indices: blockchainIndices } = useBlockchain();
  const { createOrder, isLoading: isCreatingOrder } = useOrders();

  // Initialize with popular tokens (crash-safe)
  useEffect(() => {
    try {
      const popularTokens = tokenService.getPopularTokensSync() || [];
      if (popularTokens.length >= 2 && !fromToken && !toToken) {
        // Safety check - ensure tokens have required properties
        const validTokens = popularTokens.filter(token => 
          token && token.address && token.symbol
        );
        
        if (validTokens.length >= 2) {
          setFromToken(validTokens[1]); // WETH
          setToToken(validTokens[0]); // ETH/USDC
        }
      }
    } catch (error) {
      console.error('❌ Error initializing order form tokens:', error);
    }
  }, [fromToken, toToken]);

  // Handle token swap
  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
  };
  
  // Check if this index exists on blockchain
  const blockchainIndexId = index.isBlockchainIndex 
    ? index.blockchainIndexId 
    : getBlockchainIndexId(index.id);
  const isAvailableOnBlockchain = blockchainIndexId !== null || index.isBlockchainIndex;
  const blockchainIndex = blockchainIndices.find(idx => idx.id === blockchainIndexId);

  // Load real Alpha Vantage data for this index
  const loadRealIndexData = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE || "123";
      const realIndicesService = new RealIndicesService(apiKey);
      const realIndices = await realIndicesService.getAllRealIndices();
      
      // Find the real data for this index
      const realData = realIndices.find(idx => idx.id === index.id);
      if (realData) {
        setRealIndexData(realData);
      }
    } catch (error) {
      console.error("Error loading real index data:", error);
    }
  };

  // Load historical chart data
  const loadChartData = async () => {
    const symbol = getAlphaVantageSymbol(index.id);
    const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE || "123";
    
    try {
      setIsLoadingChart(true);
      setChartError(null);
      
      const alphaVantageService = new AlphaVantageService({ apiKey });
      
      console.log(`🔍 Loading chart data for ${symbol} (${index.name})`);
      console.log(`📡 Using API key: ${apiKey.substring(0, 8)}...`);
      
      // Determine the appropriate API call based on symbol type
      let response: TimeSeriesResponse | undefined;
      let parsedData: Array<{
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>;

      if (symbol.includes('USD') && !symbol.includes('/')) {
        // Crypto symbols like BTCUSD, ETHUSD
        console.log(`📈 Fetching crypto data for ${symbol}`);
        const cryptoResponse = await alphaVantageService.getCryptoTimeSeries(
          symbol.replace('USD', ''), 'USD', 'daily'
        );
        // Note: Crypto API has different structure, would need custom parsing
        // For now, fallback to regular daily series
        response = await alphaVantageService.getDailyTimeSeries('SPY', false, "compact");
        parsedData = AlphaVantageService.parseTimeSeriesData(response);
      } else if (symbol.includes('/')) {
        // Forex pairs like EUR/USD
        console.log(`📈 Fetching forex data for ${symbol}`);
        const [fromCurrency, toCurrency] = symbol.split('/');
        const forexResponse = await alphaVantageService.getForexTimeSeries(
          fromCurrency, toCurrency, 'daily'
        );
        // Note: Forex API has different structure, would need custom parsing
        // For now, fallback to regular daily series
        response = await alphaVantageService.getDailyTimeSeries('SPY', false, "compact");
        parsedData = AlphaVantageService.parseTimeSeriesData(response);
      } else if (['WTI', 'BRENT', 'WHEAT', 'CORN'].includes(symbol)) {
        // Commodity symbols - use proper commodity APIs
        console.log(`📈 Fetching commodity data for ${symbol}`);
        let commodityResponse: any;
        
        switch (symbol) {
          case 'WTI':
            commodityResponse = await alphaVantageService.getWTIOil('monthly');
            break;
          case 'BRENT':
            commodityResponse = await alphaVantageService.getBrentOil('monthly');
            break;
          case 'WHEAT':
            commodityResponse = await alphaVantageService.getWheat('monthly');
            break;
          case 'CORN':
            commodityResponse = await alphaVantageService.getCorn('monthly');
            break;
          default:
            throw new Error(`Unsupported commodity: ${symbol}`);
        }
        
        console.log(`📊 Raw commodity API response for ${symbol}:`, commodityResponse);
        
        // Parse commodity data (different structure from stock data)
        if (commodityResponse && commodityResponse.data && Array.isArray(commodityResponse.data)) {
          parsedData = commodityResponse.data
            .slice(-30) // Get last 30 data points
            .map((item: { date: string; value: string }) => ({
              date: item.date,
              open: parseFloat(item.value),
              high: parseFloat(item.value) * 1.02, // Mock slight variations since commodity data only has one value
              low: parseFloat(item.value) * 0.98,
              close: parseFloat(item.value),
              volume: 1000000 // Mock volume
            }))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else {
          throw new Error(`Invalid commodity data structure for ${symbol}`);
        }
      } else {
        // Regular stocks and ETFs
        console.log(`📈 Fetching stock data for ${symbol}`);
        response = await alphaVantageService.getDailyTimeSeries(symbol, false, "compact");
        parsedData = AlphaVantageService.parseTimeSeriesData(response);
      }
      
      if (!(['WTI', 'BRENT', 'WHEAT', 'CORN'].includes(symbol))) {
        console.log(`📊 Raw API response for ${symbol}:`, response);
      }
      console.log(`📈 Parsed data (${parsedData.length} items):`, parsedData.slice(0, 3));
      
      // Format data for Recharts (last 30 days for index pages)
      const chartDataFormatted = parsedData
        .slice(-30) // Get last 30 days
        .map(item => ({
          date: item.date,
          close: item.close,
          high: item.high,
          low: item.low,
          open: item.open,
          volume: item.volume
        }));
      
      console.log(`📋 Formatted chart data (${chartDataFormatted.length} items):`, chartDataFormatted.slice(0, 3));
      setChartData(chartDataFormatted);
    } catch (error) {
      console.error("❌ Error loading chart data:", error);
      console.error("❌ Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack,
        symbol,
        indexId: index.id,
        apiKey: apiKey.substring(0, 8) + '...'
      });
      setChartError(`Failed to load chart data for ${symbol}. Using demo visualization.`);
      
      // Generate fallback demo data with realistic prices for different asset types
      const symbol = getAlphaVantageSymbol(index.id);
      const basePrice = 
        symbol === 'BTCUSD' ? 45000 : 
        symbol === 'ETHUSD' ? 2500 :
        symbol === 'CORN' ? 450 :  // Corn price in cents per bushel
        symbol === 'WHEAT' ? 650 :  // Wheat price in cents per bushel
        symbol === 'WTI' ? 75 :     // Oil price per barrel
        symbol === 'BRENT' ? 78 :   // Brent oil price per barrel
        symbol === 'GLD' ? 180 :    // Gold ETF price
        symbol === 'VIX' ? 20 :     // VIX volatility index
        index.price || 100;         // Default fallback
      
      const demoData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        const price = basePrice * (1 + variation);
        
        return {
          date: date.toISOString().split('T')[0],
          close: Number(price.toFixed(2)),
          high: Number((price * 1.02).toFixed(2)),
          low: Number((price * 0.98).toFixed(2)),
          open: Number((price * (0.99 + Math.random() * 0.02)).toFixed(2)),
          volume: Math.floor(Math.random() * 1000000)
        };
      });
      
      setChartData(demoData);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadRealIndexData();
    loadChartData();
  }, [index.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequestIndex = async () => {
    setIsRequestingIndex(true);
    
    try {
      // Simulate request submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(`📝 Request submitted for ${realIndexData.name}! We'll notify you when it's available on-chain.`);
    } catch (error) {
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsRequestingIndex(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!isConnected || !blockchainIndexId) {
      alert("Please connect your wallet first");
      return;
    }

    if (!fromToken || !toToken) {
      alert("Please select both from and to tokens");
      return;
    }

    try {
      await createOrder({
        indexId: blockchainIndexId,
        operator: orderForm.operator,
        threshold: parseInt(orderForm.threshold),
        description: orderForm.description,
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: orderForm.fromAmount,
        toAmount: orderForm.toAmount,
        expiry: parseInt(orderForm.expiry) * 3600 // Convert hours to seconds
      });

      // Reset form
      setOrderForm({
        description: "",
        fromAmount: "",
        toAmount: "",
        operator: OPERATORS.GT,
        threshold: "",
        expiry: "24"
      });

      alert(`🎉 Order created successfully! It will execute when ${realIndexData.name} ${getOperatorSymbol(orderForm.operator)} ${orderForm.threshold}`);
      
    } catch (error) {
      console.error("❌ Error creating order:", error);
      alert("Failed to create order: " + (error as Error).message);
    }
  };

  const fillDemoOrderData = async () => {
    try {
      const popularTokens = tokenService.getPopularTokensSync() || [];
      const validTokens = popularTokens.filter(token => 
        token && token.address && token.symbol
      );
      
      if (validTokens.length >= 2) {
        // Set tokens: WETH -> USDC
        const wethToken = validTokens.find(t => t.symbol === 'WETH') || validTokens[1];
        const usdcToken = validTokens.find(t => t.symbol === 'USDC') || validTokens[0];
        
        setFromToken(wethToken);
        setToToken(usdcToken);
      }

      setOrderForm({
        description: `Buy ${toToken?.symbol || 'tokens'} when ${realIndexData.name} > threshold`,
        fromAmount: "0.0001", // 0.0001 WETH - minimal amount for testing (~$0.25-0.40)
        toAmount: "0.25", // Proportionally small USDC amount
        operator: OPERATORS.GT,
        threshold: "18000", // Demo threshold
        expiry: "2" // 2 hours
      });
      
      alert(`🚀 Demo order data loaded! Buy ${toToken?.symbol || 'tokens'} when ${realIndexData.name} > threshold using 0.0001 ${fromToken?.symbol || 'tokens'}`);
    } catch (error) {
      console.error('❌ Error setting demo data:', error);
      alert('Failed to load demo data');
    }
  };

  const getOperatorSymbol = (operator: number) => {
    switch (operator) {
      case OPERATORS.GT: return ">";
      case OPERATORS.LT: return "<";
      case OPERATORS.GTE: return "≥";
      case OPERATORS.LTE: return "≤";
      case OPERATORS.EQ: return "=";
      default: return "?";
    }
  };

  const handleRefreshChart = () => {
    loadChartData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Indices
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Chart and Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full ${realIndexData.color} flex items-center justify-center text-white text-2xl font-bold`}>
                  {realIndexData.avatar}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{realIndexData.name}</h1>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">${realIndexData.symbol}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-500">{realIndexData.handle}</span>
                  </div>
                  {realIndexData.lastUpdated && (
                    <div className="text-xs text-gray-400 mt-1">
                      Last updated: {realIndexData.lastUpdated}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleRefreshChart}
                  disabled={isLoadingChart}
                  variant="outline"
                  className="px-4"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingChart ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                {isAvailableOnBlockchain ? (
                  <div className="flex items-center space-x-2">
                    <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ⛓️ Live On-Chain
                    </div>
                    {blockchainIndex && (
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        ID: {blockchainIndex.id}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={handleRequestIndex}
                    disabled={isRequestingIndex}
                    variant="outline"
                    className="px-6"
                  >
                    {isRequestingIndex ? (
                      "Requesting..."
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Request Index
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Price</div>
                  <div className="text-2xl font-bold text-gray-900">{realIndexData.valueLabel}</div>
                  <div className={`text-sm ${realIndexData.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {realIndexData.change}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Mindshare</div>
                  <div className="text-2xl font-bold text-gray-900">{realIndexData.mindshare}</div>
                  <div className="text-sm text-gray-500">{realIndexData.changeValue}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Category</div>
                  <div className="text-2xl font-bold text-blue-600">{realIndexData.category}</div>
                  <div className="text-sm text-gray-500">{realIndexData.provider}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">24h Volume</div>
                  <div className="text-2xl font-bold text-gray-900">{realIndexData.volume24h || 'N/A'}</div>
                  <div className="text-sm text-gray-500">Trading Volume</div>
                </CardContent>
              </Card>
            </div>

            {/* Price Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Price Chart</CardTitle>
                  <div className="text-sm text-gray-500">
                    {chartError ? (
                      <span className="text-orange-600">{chartError}</span>
                    ) : (
                      `Historical data for ${realIndexData.symbol} (Last 30 days)`
                    )}
                  </div>
                </div>
                {isLoadingChart && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                )}
              </CardHeader>
              <CardContent>
                {isLoadingChart ? (
                  <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                      <p className="text-gray-500">Loading chart data...</p>
                      <p className="text-sm text-gray-400">Fetching from Alpha Vantage</p>
                    </div>
                  </div>
                ) : chartData.length > 0 ? (
                  <div className="h-80">
                    {/* @ts-ignore */}
                    <ResponsiveContainer width="100%" height="100%">
                      {/* @ts-ignore */}
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        {/* @ts-ignore */}
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        />
                        {/* @ts-ignore */}
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => 
                            realIndexData.category === 'Forex' 
                              ? value.toFixed(4)
                              : value >= 1000 
                                ? `$${(value / 1000).toFixed(1)}K`
                                : `$${value.toFixed(2)}`
                          }
                        />
                        <Tooltip
                          labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                          formatter={(value: number, name: string) => [
                            realIndexData.category === 'Forex' 
                              ? value.toFixed(4)
                              : `$${value.toFixed(2)}`,
                            name === 'close' ? 'Close Price' : name
                          ]}
                          labelStyle={{ color: '#374151' }}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                        />
                        {/* @ts-ignore */}
                        <Legend />
                        {/* @ts-ignore */}
                        <Line
                          type="monotone"
                          dataKey="close"
                          stroke={realIndexData.isPositive ? "#10b981" : "#ef4444"}
                          strokeWidth={2}
                          name="Close Price"
                          dot={false}
                          activeDot={{ r: 4, fill: realIndexData.isPositive ? "#10b981" : "#ef4444" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No chart data available</p>
                      <p className="text-sm text-gray-400">Unable to load historical data</p>
                      <Button 
                        onClick={handleRefreshChart}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>


          </div>

          {/* Right Column - Trading & Social Feed */}
          <div className="space-y-6">
            {/* Conditional Order Creation Box - Only when available on blockchain */}
            {isAvailableOnBlockchain && (
              <Card>
                <CardHeader>
                  <CardTitle>Create Conditional Order</CardTitle>
                  <div className="text-sm text-gray-500">
                    Set up an order that executes when {realIndexData.name} meets your conditions
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      placeholder={`Buy when ${realIndexData.name} hits target`}
                      value={orderForm.description}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {/* From Token */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From</label>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="0.0001"
                          value={orderForm.fromAmount}
                          onChange={(e) => setOrderForm(prev => ({ ...prev, fromAmount: e.target.value }))}
                          disabled={isCreatingOrder}
                        />
                      </div>
                      <div className="w-32">
                        <TokenSelector
                          selectedToken={fromToken}
                          onTokenSelect={setFromToken}
                          placeholder="From"
                          disabled={isCreatingOrder}
                          excludeTokens={toToken ? [toToken.address] : []}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSwapTokens}
                      disabled={isCreatingOrder}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* To Token */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To</label>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="0.25"
                          value={orderForm.toAmount}
                          onChange={(e) => setOrderForm(prev => ({ ...prev, toAmount: e.target.value }))}
                          disabled={isCreatingOrder}
                        />
                      </div>
                      <div className="w-32">
                        <TokenSelector
                          selectedToken={toToken}
                          onTokenSelect={setToToken}
                          placeholder="To"
                          disabled={isCreatingOrder}
                          excludeTokens={fromToken ? [fromToken.address] : []}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Condition</label>
                      <Select value={orderForm.operator.toString()} onValueChange={(value) => setOrderForm(prev => ({ ...prev, operator: parseInt(value) }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={OPERATORS.GT.toString()}>Greater than (&gt;)</SelectItem>
                          <SelectItem value={OPERATORS.LT.toString()}>Less than (&lt;)</SelectItem>
                          <SelectItem value={OPERATORS.GTE.toString()}>Greater or equal (≥)</SelectItem>
                          <SelectItem value={OPERATORS.LTE.toString()}>Less or equal (≤)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Threshold</label>
                      <Input
                        placeholder="18000"
                        value={orderForm.threshold}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, threshold: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleCreateOrder}
                      disabled={!isConnected || isCreatingOrder || !orderForm.threshold || !orderForm.fromAmount || !fromToken || !toToken}
                      className="flex-1"
                    >
                      {isCreatingOrder ? "Creating Order..." : "Create Order"}
                    </Button>
                    <Button
                      onClick={fillDemoOrderData}
                      variant="outline"
                      disabled={!isConnected}
                    >
                      Fill Demo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Swap Box - Available for all indices */}
            <SwapBox 
              walletAddress={walletAddress || undefined}
              apiKey={process.env.NEXT_PUBLIC_ONEINCH_API_KEY}
              rpcUrl={process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
                ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
                : "https://mainnet.base.org"
              }
              indexName={realIndexData.name}
            />

            {/* Request Index Card - Only when NOT available on blockchain */}
            {!isAvailableOnBlockchain && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Limited Functionality</h3>
                  <p className="text-orange-700 mb-4">
                    This index is not yet available for conditional orders. Request it to be added for full trading functionality.
                  </p>
                  <Button 
                    onClick={handleRequestIndex}
                    disabled={isRequestingIndex}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isRequestingIndex ? "Requesting..." : "Request Index"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Admin Box - Only for blockchain indices when connected */}
            {isAvailableOnBlockchain && blockchainIndexId !== null && (
              <AdminBox 
                indexId={blockchainIndexId}
                indexName={realIndexData.name}
                className="mt-0"
              />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Latest Buzz</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {index.socialFeed.map((post: any) => (
                  <div key={post.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{post.user}</span>
                          <span className="text-gray-500 text-sm">{post.handle}</span>
                          <span className="text-gray-400 text-sm">•</span>
                          <span className="text-gray-400 text-sm">{post.time}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{post.content}</p>
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>{post.replies}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Repeat2 className="w-3 h-3" />
                            <span>{post.retweets}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="w-3 h-3" />
                            <span>{post.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{post.views}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Connection Warning */}
            {!isConnected && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-yellow-600" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Connect Wallet</h4>
                      <p className="text-sm text-yellow-700">
                        Connect your wallet to add this index to your portfolio.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}