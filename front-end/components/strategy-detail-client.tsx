"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  TrendingUp,
  Zap,
  Target,
  Clock,
  DollarSign,
  RefreshCw,
  Wallet,
  Loader2,
} from "lucide-react";
import { SwapInterface } from "@/components/swap-interface";
import { WalletConnect } from "@/components/WalletConnect";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useOrders } from "@/hooks/useOrders";
import AlphaVantageService, { TimeSeriesResponse } from "@/lib/alphavantage-service";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Map strategy IDs to their corresponding Alpha Vantage symbols
const getAlphaVantageSymbol = (strategyId: string): string => {
  const symbolMap: Record<string, string> = {
    // Major stocks
    'eth-whale-watch': 'AAPL',  // Default to AAPL for ETH whale watch (mentioned in description)
    'btc-momentum': 'BTCUSD',
    'tesla-volatility': 'TSLA',
    'apple-breakout': 'AAPL',
    'amazon-dca': 'AMZN',
    'msft-growth': 'MSFT',
    'googl-momentum': 'GOOGL',
    'meta-reversal': 'META',
    'nvda-trend': 'NVDA',
    
    // ETFs and indices
    'spy-tracker': 'SPY',
    'qqq-tech': 'QQQ',
    'vix-volatility': 'VIX',
    
    // Crypto
    'btc-strategy': 'BTCUSD',
    'eth-strategy': 'ETHUSD',
    
    // Commodities
    'gold-hedge': 'GLD',
    'oil-momentum': 'WTI',
    'wheat-seasonal': 'WHEAT',
    'corn-cycle': 'CORN',
    
    // Forex
    'eur-usd-carry': 'EUR/USD',
    'gbp-usd-momentum': 'GBP/USD',
    'usd-jpy-trend': 'USD/JPY',
  };
  
  console.log(`🔍 Looking up symbol for strategyId: "${strategyId}", found: "${symbolMap[strategyId] || 'AAPL (default)'}"`);
  return symbolMap[strategyId] || 'AAPL'; // Default to AAPL if not found
};

// Map strategy IDs to their metadata
const getStrategyMetadata = (strategyId: string) => {
  const strategyMap: Record<string, {
    name: string;
    tokenPair: string;
    trigger: string;
    icon: string;
    description: string;
    targetSymbol: string;
  }> = {
    'eth-whale-watch': {
      name: 'ETH Whale Watch',
      tokenPair: 'ETH/USDC',
      trigger: 'Alpha Vantage Data',
      icon: '🐋',
      description: 'Automatically execute swaps when AAPL stock price crosses above $150 using real blockchain indices.',
      targetSymbol: 'AAPL'
    },
    'btc-momentum': {
      name: 'BTC Momentum Strategy',
      tokenPair: 'BTC/USDT',
      trigger: 'Bitcoin Price Movement',
      icon: '₿',
      description: 'Trade based on Bitcoin momentum indicators and price action signals.',
      targetSymbol: 'BTCUSD'
    },
    'tesla-volatility': {
      name: 'Tesla Volatility Play',
      tokenPair: 'TSLA/USD',
      trigger: 'TSLA Stock Volatility',
      icon: '🚗',
      description: 'Capitalize on Tesla stock volatility using Alpha Vantage real-time data.',
      targetSymbol: 'TSLA'
    },
    'apple-breakout': {
      name: 'Apple Breakout Strategy',
      tokenPair: 'AAPL/USD',
      trigger: 'AAPL Technical Breakout',
      icon: '🍎',
      description: 'Execute trades when Apple stock breaks key resistance levels.',
      targetSymbol: 'AAPL'
    },
    'vix-volatility': {
      name: 'VIX Volatility Strategy',
      tokenPair: 'VIX/USD',
      trigger: 'Market Fear Index',
      icon: '📊',
      description: 'Trade based on market volatility spikes using the VIX index.',
      targetSymbol: 'VIX'
    },
    'corn-cycle': {
      name: 'Corn Seasonal Strategy',
      tokenPair: 'CORN/USD',
      trigger: 'Corn Price Movement',
      icon: '🌽',
      description: 'Trade based on seasonal corn price cycles using Alpha Vantage commodity data.',
      targetSymbol: 'CORN'
    },
    'wheat-seasonal': {
      name: 'Wheat Harvest Strategy',
      tokenPair: 'WHEAT/USD', 
      trigger: 'Wheat Price Movement',
      icon: '🌾',
      description: 'Capitalize on wheat seasonal patterns and harvest cycles.',
      targetSymbol: 'WHEAT'
    },
    'oil-momentum': {
      name: 'Oil Momentum Strategy',
      tokenPair: 'WTI/USD',
      trigger: 'WTI Oil Price',
      icon: '🛢️',
      description: 'Trade WTI crude oil based on price momentum and supply/demand dynamics.',
      targetSymbol: 'WTI'
    }
  };
  
  return strategyMap[strategyId] || strategyMap['eth-whale-watch']; // Default fallback
};

interface StrategyDetailClientProps {
  strategyId: string;
}

export function StrategyDetailClient({
  strategyId,
}: StrategyDetailClientProps) {
  const router = useRouter();
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [priceData, setPriceData] = useState<Array<{
    date: string;
    price: number;
    sentiment?: number;
  }>>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const {
    isConnected,
    walletAddress,
    indices,
    ethBalance,
    connectWallet,
    refreshIndices,
  } = useBlockchain();
  const {
    orders,
    isLoading: ordersLoading,
    error: ordersError,
    refreshOrders,
    cancelOrder,
  } = useOrders();

  // Load blockchain data on mount
  useEffect(() => {
    if (isConnected) {
      refreshIndices();
      refreshOrders();
    }
  }, [isConnected, refreshIndices, refreshOrders]);

  // Load chart data from Alpha Vantage
  const loadChartData = async () => {
    const symbol = getAlphaVantageSymbol(strategyId); // Get symbol dynamically based on strategy
    const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE || "123";
    
    try {
      setIsLoadingChart(true);
      setChartError(null);
      
      const alphaVantageService = new AlphaVantageService({ apiKey });
      
      console.log(`🔍 Loading chart data for ${symbol} (Strategy: ${strategyId})`);
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
        response = await alphaVantageService.getDailyTimeSeries('SPY', false, "full");
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
        response = await alphaVantageService.getDailyTimeSeries('SPY', false, "full");
        parsedData = AlphaVantageService.parseTimeSeriesData(response);
      } else if (['WTI', 'BRENT', 'WHEAT', 'CORN'].includes(symbol)) {
        // Commodity symbols
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
            .slice(-90) // Get last 90 data points
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
        response = await alphaVantageService.getDailyTimeSeries(symbol, false, "full");
        parsedData = AlphaVantageService.parseTimeSeriesData(response);
      }
      
      if (!(['WTI', 'BRENT', 'WHEAT', 'CORN'].includes(symbol))) {
        console.log(`📊 Raw API response for ${symbol}:`, response);
      }
      console.log(`📈 Parsed data (${parsedData.length} items):`, parsedData.slice(0, 3));
      
      // Format data for Recharts (last 90 days for 3 months)
      const chartDataFormatted = parsedData
        .slice(-90) // Get last 90 days (approximately 3 months)
        .map((item, index) => ({
          date: item.date,
          price: item.close,
          // Add dynamic sentiment data that varies with price changes
          sentiment: Math.max(30, Math.min(80, 50 + (item.close > (parsedData[parsedData.length - 91 + index - 1]?.close || item.close) ? 15 : -15) + Math.random() * 10)),
        }));
      
      console.log(`📋 Formatted chart data for ${symbol} (${chartDataFormatted.length} items):`, chartDataFormatted.slice(0, 3));
      setPriceData(chartDataFormatted);
    } catch (error) {
      console.error("❌ Error loading chart data:", error);
      setChartError(`Failed to load chart data for ${symbol}: ${(error as Error).message}`);
      // Set fallback mock data on error
      const fallbackPrice = 
        symbol === 'BTCUSD' ? 45000 : 
        symbol === 'TSLA' ? 250 : 
        symbol === 'CORN' ? 450 :  // Corn price in cents per bushel
        symbol === 'WHEAT' ? 650 :  // Wheat price in cents per bushel
        symbol === 'WTI' ? 75 :     // Oil price per barrel
        symbol === 'BRENT' ? 78 :   // Brent oil price per barrel
        175; // Default fallback
      setPriceData([
        { date: "2024-01-15", price: fallbackPrice * 0.98, sentiment: 45 },
        { date: "2024-01-16", price: fallbackPrice * 1.02, sentiment: 52 },
        { date: "2024-01-17", price: fallbackPrice * 0.96, sentiment: 41 },
        { date: "2024-01-18", price: fallbackPrice * 1.05, sentiment: 67 },
        { date: "2024-01-19", price: fallbackPrice * 1.01, sentiment: 59 },
        { date: "2024-01-20", price: fallbackPrice * 1.08, sentiment: 72 },
        { date: "2024-01-21", price: fallbackPrice * 1.12, sentiment: 78 },
      ]);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Load chart data on component mount and when strategy changes
  useEffect(() => {
    loadChartData();
  }, [strategyId]);

  // Get strategy data (enhanced with real blockchain data)
  const strategyMetadata = getStrategyMetadata(strategyId);
  const currentSymbol = getAlphaVantageSymbol(strategyId);
  const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1]?.price : null;
  
  const strategy = {
    id: strategyId,
    name: strategyMetadata.name,
    tokenPair: strategyMetadata.tokenPair,
    trigger: strategyMetadata.trigger,
    status: isConnected ? "active" : "disconnected",
    totalValue: ethBalance ? `${parseFloat(ethBalance).toFixed(4)} ETH` : "$0",
    currentPrice: currentPrice ? 
      `$${currentPrice.toFixed(2)}` : isLoadingChart ? "Loading..." : "$---",
    targetPrice: currentPrice ? 
      `$${(currentPrice * 1.1).toFixed(2)}` : "$---", // 10% above current price
    orders: indices.length,
    filled: Math.floor(indices.length / 2),
    pnl: currentPrice && priceData.length > 1 ? 
      `${priceData[priceData.length - 1].price > priceData[0].price ? '+' : ''}$${((priceData[priceData.length - 1].price - priceData[0].price) * 10).toFixed(0)}` : 
      "+$0",
    icon: strategyMetadata.icon,
    description: strategyMetadata.description,
    createdAt: "2024-01-15",
    lastTriggered:
      indices.length > 0 ? "Active indices detected" : "No indices found",
    targetSymbol: currentSymbol,
    swapConfig: {
      mode: "intent" as const,
      preset: "fast" as const,
      walletAddress: walletAddress || "",
      apiKey: process.env.NEXT_PUBLIC_ONEINCH_API_KEY || "",
      rpcUrl: "https://mainnet.base.org", // Use Base mainnet instead of sepolia
    },
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{strategy.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {strategy.name}
            </h1>
            <p className="text-gray-600">{strategy.tokenPair}</p>
          </div>
        </div>
        <Badge className="bg-green-100 text-green-800 ml-auto">
          {strategy.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <span>Price & Sentiment (3 Months)</span>
                  {chartError && (
                    <div className="text-sm text-orange-600 font-normal mt-1">
                      {chartError} - Showing fallback data
                    </div>
                  )}
                  {!chartError && !isLoadingChart && (
                    <div className="text-sm text-gray-500 font-normal mt-1">
                      Historical {currentSymbol} data from Alpha Vantage (Last 90 days)
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadChartData}
                    disabled={isLoadingChart}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingChart ? 'animate-spin' : ''}`} />
                  </Button>
                  {isLoadingChart && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                  <span className="text-2xl font-bold text-gray-900">
                    {priceData.length > 0 ? `$${priceData[priceData.length - 1]?.price?.toFixed(2)}` : strategy.currentPrice}
                  </span>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </CardTitle>
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
              ) : (
                <div className="h-80">
                  {/* @ts-ignore */}
                  <ResponsiveContainer width="100%" height="100%">
                    {/* @ts-ignore */}
                    <LineChart data={priceData}>
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
                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                      />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric' 
                        })}
                        formatter={(value: number, name: string) => [
                          name === 'price' ? `$${value.toFixed(2)}` : `${value.toFixed(1)}%`,
                          name === 'price' ? 'Stock Price' : 'Sentiment Score'
                        ]}
                      />
                      {/* @ts-ignore */}
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="price"
                      />
                      {/* @ts-ignore */}
                      <Line
                        type="monotone"
                        dataKey="sentiment"
                        stroke="#34d399"
                        strokeWidth={2}
                        dot={false}
                        name="sentiment"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategy Description */}
          <Card>
            <CardHeader>
              <CardTitle>Strategy Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{strategy.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 block">Created</span>
                  <span className="font-semibold">{strategy.createdAt}</span>
                </div>
                <div>
                  <span className="text-gray-600 block">Last Triggered</span>
                  <span className="font-semibold">
                    {strategy.lastTriggered}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet Connection */}
          {!isConnected && <WalletConnect compact={false} />}

          {/* Strategy Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strategy Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Total Value</span>
                </div>
                <span className="font-semibold">{strategy.totalValue}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">P&L</span>
                </div>
                <span className="font-semibold text-green-600">
                  {strategy.pnl}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Target Price</span>
                </div>
                <span className="font-semibold">{strategy.targetPrice}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Orders</span>
                </div>
                <span className="font-semibold">
                  {strategy.filled}/{strategy.orders}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Trigger Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trigger Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{strategy.trigger}</span>
              </div>
              <p className="text-sm text-gray-600">
                Monitors whale wallets and exchange outflows for transfers
                exceeding 10,000 ETH.
              </p>
              <div className="pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" className="w-full">
                  Edit Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order History</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshOrders}
                  disabled={ordersLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      ordersLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ordersError && (
                <div className="text-red-600 text-sm mb-4">
                  Error loading orders: {ordersError}
                </div>
              )}

              {ordersLoading ? (
                <div className="text-center py-4 text-gray-500">
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No orders found for this strategy.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div
                      key={order.hash}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              order.status === "active"
                                ? "default"
                                : order.status === "filled"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {order.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {order.description || "Order"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Hash: {order.hash.slice(0, 10)}...
                          {order.hash.slice(-8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Condition: Index {order.indexId}{" "}
                          {order.operator === 0
                            ? ">"
                            : order.operator === 1
                            ? "<"
                            : order.operator === 2
                            ? ">="
                            : order.operator === 3
                            ? "<="
                            : "=="}{" "}
                          {order.threshold}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {order.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelOrder(order.hash)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {orders.length > 5 && (
                    <div className="text-center py-2">
                      <span className="text-sm text-gray-500">
                        Showing 5 of {orders.length} orders
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isConnected ? (
                <Dialog
                  open={isSwapDialogOpen}
                  onOpenChange={setIsSwapDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full gradient-primary text-white">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Manual Trigger
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Manual Trigger Swap - {strategy.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      <SwapInterface
                        walletAddress={strategy.swapConfig.walletAddress}
                        apiKey={strategy.swapConfig.apiKey}
                        rpcUrl={strategy.swapConfig.rpcUrl}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button
                  onClick={connectWallet}
                  className="w-full"
                  variant="outline"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet to Trade
                </Button>
              )}
              <Button variant="outline" className="w-full">
                Pause Strategy
              </Button>
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  const activeOrders = orders.filter(
                    (order) => order.status === "active"
                  );
                  if (activeOrders.length === 0) {
                    alert("No active orders to cancel");
                    return;
                  }

                  if (confirm(`Cancel ${activeOrders.length} active orders?`)) {
                    for (const order of activeOrders) {
                      try {
                        await cancelOrder(order.hash);
                      } catch (error) {
                        console.error(
                          `Failed to cancel order ${order.hash}:`,
                          error
                        );
                      }
                    }
                    alert("Cancel requests sent for all active orders");
                  }
                }}
                disabled={ordersLoading}
              >
                Cancel All Orders (
                {orders.filter((order) => order.status === "active").length})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
