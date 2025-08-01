"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  Search,
  Eye
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Sparkline } from "./Sparkline";

// Available indices inspired by Alpha Vantage
const availableIndices = [
  {
    id: "AAPL_STOCK",
    name: "Apple Inc.",
    symbol: "AAPL",
    handle: "@apple",
    description: "Apple Inc. stock price in USD cents",
    category: "Stocks",
    provider: "Alpha Vantage",
    currentValue: 17550,
    valueLabel: "$175.50",
    change: "+2.34%",
    changeValue: "+4.08",
    isPositive: true,
    avatar: "🍎",
    mindshare: "0.52%",
    sparklineData: [170, 172, 175, 174, 176, 175, 177, 175],
    color: "bg-blue-500"
  },
  {
    id: "BTC_PRICE",
    name: "Bitcoin",
    symbol: "BTC",
    handle: "@bitcoin",
    description: "Bitcoin price in USD",
    category: "Crypto", 
    provider: "Alpha Vantage",
    currentValue: 4350000,
    valueLabel: "$43,500",
    change: "+5.67%",
    changeValue: "+2,340",
    isPositive: true,
    avatar: "₿",
    mindshare: "1.45%",
    sparklineData: [41000, 42000, 43500, 43000, 44000, 43500, 45000, 43500],
    color: "bg-orange-500"
  },
  {
    id: "ETH_PRICE",
    name: "Ethereum",
    symbol: "ETH",
    handle: "@ethereum",
    description: "Ethereum price in USD",
    category: "Crypto",
    provider: "Alpha Vantage",
    currentValue: 265000,
    valueLabel: "$2,650",
    change: "+3.21%",
    changeValue: "+82.50",
    isPositive: true,
    avatar: "Ξ",
    mindshare: "0.89%",
    sparklineData: [2500, 2600, 2650, 2580, 2700, 2650, 2680, 2650],
    color: "bg-purple-500"
  },
  {
    id: "GOLD_PRICE",
    name: "Gold",
    symbol: "XAU",
    handle: "@gold_price",
    description: "Gold price per ounce in USD cents",
    category: "Commodities",
    provider: "Alpha Vantage",
    currentValue: 205000,
    valueLabel: "$2,050",
    change: "+1.23%",
    changeValue: "+25.00",
    isPositive: true,
    avatar: "🥇",
    mindshare: "0.33%",
    sparklineData: [2020, 2030, 2050, 2040, 2055, 2050, 2060, 2050],
    color: "bg-yellow-500"
  },
  {
    id: "EUR_USD",
    name: "EUR/USD",
    symbol: "EURUSD",
    handle: "@eurusd",
    description: "EUR/USD exchange rate * 10000",
    category: "Forex",
    provider: "Alpha Vantage",
    currentValue: 10850,
    valueLabel: "1.0850",
    change: "-0.45%",
    changeValue: "-0.0049",
    isPositive: false,
    avatar: "💱",
    mindshare: "0.21%",
    sparklineData: [1.090, 1.088, 1.085, 1.087, 1.083, 1.085, 1.082, 1.085],
    color: "bg-green-500"
  },
  {
    id: "TSLA_STOCK",
    name: "Tesla Inc.",
    symbol: "TSLA",
    handle: "@tesla",
    description: "Tesla Inc. stock price in USD cents",
    category: "Stocks",
    provider: "Alpha Vantage",
    currentValue: 24550,
    valueLabel: "$245.50",
    change: "+7.89%",
    changeValue: "+17.95",
    isPositive: true,
    avatar: "🚗",
    mindshare: "0.67%",
    sparklineData: [220, 230, 245, 240, 250, 245, 255, 245],
    color: "bg-red-500"
  },
  {
    id: "SPY_ETF",
    name: "S&P 500 ETF",
    symbol: "SPY",
    handle: "@spy_etf",
    description: "SPDR S&P 500 ETF Trust price in USD cents",
    category: "ETFs",
    provider: "Alpha Vantage",
    currentValue: 45200,
    valueLabel: "$452.00",
    change: "+1.56%",
    changeValue: "+6.95",
    isPositive: true,
    avatar: "📈",
    mindshare: "0.44%",
    sparklineData: [440, 445, 452, 448, 455, 452, 458, 452],
    color: "bg-indigo-500"
  },
  {
    id: "VIX_INDEX",
    name: "VIX Volatility",
    symbol: "VIX",
    handle: "@vix_index",
    description: "CBOE Volatility Index",
    category: "Indices",
    provider: "Alpha Vantage",
    currentValue: 1875,
    valueLabel: "18.75",
    change: "-3.21%",
    changeValue: "-0.62",
    isPositive: false,
    avatar: "⚡",
    mindshare: "0.19%",
    sparklineData: [20, 19.5, 18.75, 19.2, 18.1, 18.75, 17.9, 18.75],
    color: "bg-gray-500"
  }
];

const categories = ["All", "Stocks", "Crypto", "Commodities", "Forex", "ETFs", "Indices"];

export function IndicesExplorer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const router = useRouter();

  const filteredIndices = availableIndices.filter(index => {
    const matchesSearch = index.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         index.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         index.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || index.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleViewIndex = (index: typeof availableIndices[0]) => {
    router.push(`/index/${index.id.toLowerCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Market Indices</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover and track market indices. Click on any index to view detailed charts and add to your portfolio.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search indices, symbols..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Indices Grid - Cookie.fun style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIndices.map((index) => (
          <Card 
            key={index.id} 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 rounded-xl"
            onClick={() => handleViewIndex(index)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                {/* Left side - Avatar and info */}
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full ${index.color} flex items-center justify-center text-white text-lg font-bold`}>
                    {index.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{index.name}</div>
                    <div className="text-sm text-gray-500">{index.handle}</div>
                  </div>
                </div>

                {/* Right side - Price change and sparkline */}
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      index.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {index.change}
                    </div>
                    <div className="text-xs text-gray-500">
                      {index.isPositive ? '▲' : '▼'} {index.changeValue}
                    </div>
                  </div>
                  <div className="w-20">
                    <Sparkline 
                      data={index.sparklineData} 
                      isPositive={index.isPositive}
                      width={80}
                      height={24}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom row - Current value and mindshare */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-gray-900">{index.valueLabel}</div>
                  <div className="text-xs text-gray-500">Current Price</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">{index.mindshare}</div>
                  <div className="text-xs text-gray-500">Mindshare</div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="ml-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewIndex(index);
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredIndices.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No indices found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or category filter
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Attribution */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live data powered by Alpha Vantage</span>
        </div>
      </div>
    </div>
  );
}