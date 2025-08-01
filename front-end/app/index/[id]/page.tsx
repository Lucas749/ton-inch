"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft, 
  Plus,
  Activity,
  BarChart3,
  Users,
  MessageCircle,
  Heart,
  Repeat2,
  Eye
} from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { blockchainService } from "@/lib/blockchain-service";

// Generate static params for all available indices
export function generateStaticParams() {
  return [
    { id: 'aapl_stock' },
    { id: 'btc_price' },
    { id: 'eth_price' },
    { id: 'gold_price' },
    { id: 'eur_usd' },
    { id: 'tsla_stock' },
    { id: 'spy_etf' },
    { id: 'vix_index' }
  ];
}

// Mock data for individual index details
const indexDetails: Record<string, any> = {
  aapl_stock: {
    id: "AAPL_STOCK",
    name: "Apple Inc.",
    symbol: "AAPL",
    handle: "@apple",
    description: "Apple Inc. stock price tracked in real-time",
    avatar: "🍎",
    color: "bg-blue-500",
    currentValue: 17550,
    price: "$175.50",
    change: "+2.34%",
    changeValue: "+4.08",
    isPositive: true,
    mindshare: "0.52%",
    sentiment: "+54.1%",
    volume24h: "924.91M",
    marketCap: "2.8T",
    chartData: [170, 172, 175, 174, 176, 175, 177, 175, 180, 178, 175],
    communityData: {
      positivePercent: 54.1,
      negativePercent: 45.9,
      totalCalls: "985.87 calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Gordon",
        handle: "@AltcoinGordon",
        time: "Jul 31",
        content: "Apple earnings looking strong this quarter. Revenue beat expectations across all segments.",
        likes: "3.74K",
        replies: "3.19K",
        retweets: "430",
        views: "639.16K"
      },
      {
        id: 2,
        user: "Tech Analyst",
        handle: "@techanalyst",
        time: "Jul 26", 
        content: "$AAPL continues to show resilience in the current market conditions. Strong fundamentals.",
        likes: "388",
        replies: "121",
        retweets: "58",
        views: "23.42K"
      }
    ]
  },
  btc_price: {
    id: "BTC_PRICE",
    name: "Bitcoin",
    symbol: "BTC",
    handle: "@bitcoin",
    description: "Bitcoin price tracked in real-time",
    avatar: "₿",
    color: "bg-orange-500",
    currentValue: 4350000,
    price: "$43,500",
    change: "+5.67%",
    changeValue: "+2,340",
    isPositive: true,
    mindshare: "1.45%",
    sentiment: "+62.3%",
    volume24h: "1.2B",
    marketCap: "847B",
    chartData: [41000, 42000, 43500, 43000, 44000, 43500, 45000, 43500, 46000, 44500, 43500],
    communityData: {
      positivePercent: 62.3,
      negativePercent: 37.7,
      totalCalls: "2.1K calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Crypto Bull",
        handle: "@cryptobull",
        time: "Aug 01",
        content: "Bitcoin breaking through key resistance levels. This could be the start of the next bull run.",
        likes: "5.2K",
        replies: "1.8K",
        retweets: "890",
        views: "142.5K"
      }
    ]
  },
  eth_price: {
    id: "ETH_PRICE",
    name: "Ethereum",
    symbol: "ETH",
    handle: "@ethereum",
    description: "Ethereum price tracked in real-time",
    avatar: "Ξ",
    color: "bg-purple-500",
    currentValue: 265000,
    price: "$2,650",
    change: "+3.21%",
    changeValue: "+82.50",
    isPositive: true,
    mindshare: "0.89%",
    sentiment: "+58.7%",
    volume24h: "892M",
    marketCap: "318B",
    chartData: [2500, 2600, 2650, 2580, 2700, 2650, 2680, 2650, 2720, 2680, 2650],
    communityData: {
      positivePercent: 58.7,
      negativePercent: 41.3,
      totalCalls: "1.4K calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "ETH Analyst",
        handle: "@ethanalyst",
        time: "Jul 30",
        content: "Ethereum's upcoming upgrades continue to drive institutional interest. Layer 2 adoption accelerating.",
        likes: "2.8K",
        replies: "945",
        retweets: "512",
        views: "89.3K"
      }
    ]
  },
  gold_price: {
    id: "GOLD_PRICE",
    name: "Gold",
    symbol: "XAU",
    handle: "@gold_price",
    description: "Gold price per ounce tracked in real-time",
    avatar: "🥇",
    color: "bg-yellow-500",
    currentValue: 205000,
    price: "$2,050",
    change: "+1.23%",
    changeValue: "+25.00",
    isPositive: true,
    mindshare: "0.33%",
    sentiment: "+45.2%",
    volume24h: "156M",
    marketCap: "12.8T",
    chartData: [2020, 2030, 2050, 2040, 2055, 2050, 2060, 2050, 2065, 2055, 2050],
    communityData: {
      positivePercent: 45.2,
      negativePercent: 54.8,
      totalCalls: "892 calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Gold Trader",
        handle: "@goldtrader",
        time: "Aug 01",
        content: "Gold maintaining strong support levels amid global uncertainty. Classic safe haven behavior.",
        likes: "1.2K",
        replies: "456",
        retweets: "234",
        views: "34.5K"
      }
    ]
  },
  eur_usd: {
    id: "EUR_USD",
    name: "EUR/USD",
    symbol: "EURUSD",
    handle: "@eurusd",
    description: "EUR/USD exchange rate tracked in real-time",
    avatar: "💱",
    color: "bg-green-500",
    currentValue: 10850,
    price: "1.0850",
    change: "-0.45%",
    changeValue: "-0.0049",
    isPositive: false,
    mindshare: "0.21%",
    sentiment: "+41.8%",
    volume24h: "2.1B",
    marketCap: "N/A",
    chartData: [1.090, 1.088, 1.085, 1.087, 1.083, 1.085, 1.082, 1.085, 1.081, 1.084, 1.085],
    communityData: {
      positivePercent: 41.8,
      negativePercent: 58.2,
      totalCalls: "567 calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "FX Analyst",
        handle: "@fxanalyst",
        time: "Jul 31",
        content: "EUR/USD consolidating ahead of ECB meeting. Dollar strength continuing to pressure the pair.",
        likes: "892",
        replies: "234",
        retweets: "156",
        views: "23.4K"
      }
    ]
  },
  tsla_stock: {
    id: "TSLA_STOCK",
    name: "Tesla Inc.",
    symbol: "TSLA",
    handle: "@tesla",
    description: "Tesla Inc. stock price tracked in real-time",
    avatar: "🚗",
    color: "bg-red-500",
    currentValue: 24550,
    price: "$245.50",
    change: "+7.89%",
    changeValue: "+17.95",
    isPositive: true,
    mindshare: "0.67%",
    sentiment: "+72.4%",
    volume24h: "1.8B",
    marketCap: "778B",
    chartData: [220, 230, 245, 240, 250, 245, 255, 245, 260, 250, 245],
    communityData: {
      positivePercent: 72.4,
      negativePercent: 27.6,
      totalCalls: "1.8K calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "EV Bull",
        handle: "@evbull",
        time: "Jul 29",
        content: "Tesla's Q2 delivery numbers exceeded expectations. Cybertruck production ramping up nicely.",
        likes: "4.1K",
        replies: "1.2K",
        retweets: "678",
        views: "156.7K"
      }
    ]
  },
  spy_etf: {
    id: "SPY_ETF",
    name: "S&P 500 ETF",
    symbol: "SPY",
    handle: "@spy_etf",
    description: "SPDR S&P 500 ETF Trust tracked in real-time",
    avatar: "📈",
    color: "bg-indigo-500",
    currentValue: 45200,
    price: "$452.00",
    change: "+1.56%",
    changeValue: "+6.95",
    isPositive: true,
    mindshare: "0.44%",
    sentiment: "+51.3%",
    volume24h: "3.2B",
    marketCap: "467B",
    chartData: [440, 445, 452, 448, 455, 452, 458, 452, 460, 455, 452],
    communityData: {
      positivePercent: 51.3,
      negativePercent: 48.7,
      totalCalls: "2.3K calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Index Trader",
        handle: "@indextrader",
        time: "Jul 31",
        content: "SPY continuing its steady climb. Market showing resilience despite macro headwinds.",
        likes: "1.9K",
        replies: "567",
        retweets: "345",
        views: "67.8K"
      }
    ]
  },
  vix_index: {
    id: "VIX_INDEX",
    name: "VIX Volatility",
    symbol: "VIX",
    handle: "@vix_index",
    description: "CBOE Volatility Index tracked in real-time",
    avatar: "⚡",
    color: "bg-gray-500",
    currentValue: 1875,
    price: "18.75",
    change: "-3.21%",
    changeValue: "-0.62",
    isPositive: false,
    mindshare: "0.19%",
    sentiment: "+38.9%",
    volume24h: "245M",
    marketCap: "N/A",
    chartData: [20, 19.5, 18.75, 19.2, 18.1, 18.75, 17.9, 18.75, 17.5, 18.2, 18.75],
    communityData: {
      positivePercent: 38.9,
      negativePercent: 61.1,
      totalCalls: "445 calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Vol Trader",
        handle: "@voltrader",
        time: "Aug 01",
        content: "VIX showing signs of complacency. Markets might be underpricing tail risks here.",
        likes: "756",
        replies: "289",
        retweets: "134",
        views: "19.8K"
      }
    ]
  }
};

export default function IndexDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isAddingToPortfolio, setIsAddingToPortfolio] = useState(false);
  const { isConnected } = useBlockchain();
  
  const indexId = params?.id as string;
  const index = indexDetails[indexId];

  useEffect(() => {
    if (!index) {
      router.push("/");
    }
  }, [index, router]);

  if (!index) {
    return <div>Index not found</div>;
  }

  const handleAddToPortfolio = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setIsAddingToPortfolio(true);
      
      const indexId = await blockchainService.createIndex(
        index.id,
        index.description,
        index.currentValue
      );

      console.log("✅ Index created with ID:", indexId);
      alert(`🎉 Successfully added ${index.name} to your portfolio!`);
      
      // Redirect to dashboard to see the new index
      router.push("/dashboard");
      
    } catch (error) {
      console.error("❌ Error creating index:", error);
      alert("Failed to add index: " + (error as Error).message);
    } finally {
      setIsAddingToPortfolio(false);
    }
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
                <div className={`w-16 h-16 rounded-full ${index.color} flex items-center justify-center text-white text-2xl font-bold`}>
                  {index.avatar}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{index.name}</h1>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">${index.symbol}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-500">{index.handle}</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
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
                  <div className="text-2xl font-bold text-gray-900">{index.price}</div>
                  <div className={`text-sm ${index.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {index.change}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Mindshare</div>
                  <div className="text-2xl font-bold text-gray-900">{index.mindshare}</div>
                  <div className="text-sm text-gray-500">{index.changeValue}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Sentiment</div>
                  <div className="text-2xl font-bold text-green-600">{index.sentiment}</div>
                  <div className="text-sm text-gray-500">Positive</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">24h Volume</div>
                  <div className="text-2xl font-bold text-gray-900">{index.volume24h}</div>
                  <div className="text-sm text-red-600">-54.45%</div>
                </CardContent>
              </Card>
            </div>

            {/* Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Price Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Interactive chart would be displayed here</p>
                    <p className="text-sm text-gray-400">Historical price data and trends</p>
                  </div>
                </div>
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