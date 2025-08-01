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
  RefreshCw
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
import { blockchainService } from "@/lib/blockchain-service";
import AlphaVantageService, { TimeSeriesResponse } from "@/lib/alphavantage-service";
import { RealIndicesService } from "@/lib/real-indices-service";

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

export function IndexDetailClient({ indexData: index }: IndexDetailClientProps) {
  const router = useRouter();
  const [isAddingToPortfolio, setIsAddingToPortfolio] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [realIndexData, setRealIndexData] = useState(index);
  
  const { isConnected } = useBlockchain();

  // Load real Alpha Vantage data for this index
  const loadRealIndexData = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY || "demo";
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
    try {
      setIsLoadingChart(true);
      setChartError(null);
      
      const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY || "demo";
      const alphaVantageService = new AlphaVantageService({ apiKey });
      const symbol = getAlphaVantageSymbol(index.id);
      
      console.log(`🔍 Loading chart data for ${symbol} (${index.name})`);
      console.log(`📡 Using API key: ${apiKey.substring(0, 8)}...`);
      
      // Get daily time series data
      const response = await alphaVantageService.getDailyTimeSeries(symbol, false, "compact");
      console.log(`📊 Raw API response:`, response);
      
      const parsedData = AlphaVantageService.parseTimeSeriesData(response);
      console.log(`📈 Parsed data (${parsedData.length} items):`, parsedData.slice(0, 3));
      
      // Format data for Recharts (last 30 days)
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
      
      // Generate fallback demo data
      const demoData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        
        const basePrice = index.price || 100;
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
  }, [index.id]);

  const handleAddToPortfolio = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setIsAddingToPortfolio(true);
      
      const indexId = await blockchainService.createIndex(
        realIndexData.id,
        realIndexData.description,
        realIndexData.currentValue
      );

      console.log("✅ Index created with ID:", indexId);
      alert(`🎉 Successfully added ${realIndexData.name} to your portfolio!`);
      
      // Redirect to dashboard to see the new index
      router.push("/dashboard");
      
    } catch (error) {
      console.error("❌ Error creating index:", error);
      alert("Failed to add index: " + (error as Error).message);
    } finally {
      setIsAddingToPortfolio(false);
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
                <Button
                  onClick={handleAddToPortfolio}
                  disabled={!isConnected || isAddingToPortfolio}
                  className="px-6"
                >
                  {isAddingToPortfolio ? (
                    "Adding..."
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Portfolio
                    </>
                  )}
                </Button>
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
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        />
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
                        <Legend />
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

            {/* Community Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle>Community Sentiment</CardTitle>
                <div className="text-sm text-gray-500">{index.communityData.totalCalls}</div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">{index.communityData.positivePercent}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">{index.communityData.negativePercent}%</span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-l-full" 
                    style={{ width: `${index.communityData.positivePercent}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Social Feed */}
          <div className="space-y-6">
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