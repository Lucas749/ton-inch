"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Plus,
  Search,
  Building2,
  Zap,
  Globe,
  DollarSign,
  Activity
} from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { blockchainService } from "@/lib/blockchain-service";
import { useRouter } from "next/navigation";

// Available indices inspired by Alpha Vantage
const availableIndices = [
  {
    id: "AAPL_STOCK",
    name: "Apple Inc. Stock",
    symbol: "AAPL",
    description: "Apple Inc. stock price in USD cents",
    category: "Stocks",
    provider: "Alpha Vantage",
    currentValue: 17550,
    valueLabel: "$175.50",
    change: "+2.34%",
    isPositive: true,
    icon: <Building2 className="w-5 h-5" />,
    color: "from-blue-500 to-blue-600"
  },
  {
    id: "BTC_PRICE",
    name: "Bitcoin Price",
    symbol: "BTC",
    description: "Bitcoin price in USD",
    category: "Crypto",
    provider: "Alpha Vantage",
    currentValue: 4350000,
    valueLabel: "$43,500",
    change: "+5.67%",
    isPositive: true,
    icon: <DollarSign className="w-5 h-5" />,
    color: "from-orange-500 to-orange-600"
  },
  {
    id: "ETH_PRICE",
    name: "Ethereum Price",
    symbol: "ETH",
    description: "Ethereum price in USD",
    category: "Crypto",
    provider: "Alpha Vantage",
    currentValue: 265000,
    valueLabel: "$2,650",
    change: "+3.21%",
    isPositive: true,
    icon: <Zap className="w-5 h-5" />,
    color: "from-purple-500 to-purple-600"
  },
  {
    id: "GOLD_PRICE",
    name: "Gold Price",
    symbol: "XAU",
    description: "Gold price per ounce in USD cents",
    category: "Commodities",
    provider: "Alpha Vantage",
    currentValue: 205000,
    valueLabel: "$2,050/oz",
    change: "+1.23%",
    isPositive: true,
    icon: <Activity className="w-5 h-5" />,
    color: "from-yellow-500 to-yellow-600"
  },
  {
    id: "EUR_USD",
    name: "EUR/USD Exchange Rate",
    symbol: "EURUSD",
    description: "EUR/USD exchange rate * 10000",
    category: "Forex",
    provider: "Alpha Vantage",
    currentValue: 10850,
    valueLabel: "1.0850",
    change: "-0.45%",
    isPositive: false,
    icon: <Globe className="w-5 h-5" />,
    color: "from-green-500 to-green-600"
  },
  {
    id: "TSLA_STOCK",
    name: "Tesla Inc. Stock",
    symbol: "TSLA",
    description: "Tesla Inc. stock price in USD cents",
    category: "Stocks",
    provider: "Alpha Vantage",
    currentValue: 24550,
    valueLabel: "$245.50",
    change: "+7.89%",
    isPositive: true,
    icon: <Building2 className="w-5 h-5" />,
    color: "from-red-500 to-red-600"
  },
  {
    id: "SPY_ETF",
    name: "S&P 500 ETF",
    symbol: "SPY",
    description: "SPDR S&P 500 ETF Trust price in USD cents",
    category: "ETFs",
    provider: "Alpha Vantage",
    currentValue: 45200,
    valueLabel: "$452.00",
    change: "+1.56%",
    isPositive: true,
    icon: <BarChart3 className="w-5 h-5" />,
    color: "from-indigo-500 to-indigo-600"
  },
  {
    id: "VIX_INDEX",
    name: "VIX Volatility Index",
    symbol: "VIX",
    description: "CBOE Volatility Index",
    category: "Indices",
    provider: "Alpha Vantage",
    currentValue: 1875,
    valueLabel: "18.75",
    change: "-3.21%",
    isPositive: false,
    icon: <Activity className="w-5 h-5" />,
    color: "from-gray-500 to-gray-600"
  }
];

const categories = ["All", "Stocks", "Crypto", "Commodities", "Forex", "ETFs", "Indices"];

export function IndicesExplorer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isCreating, setIsCreating] = useState<string | null>(null);
  
  const { isConnected } = useBlockchain();
  const router = useRouter();

  const filteredIndices = availableIndices.filter(index => {
    const matchesSearch = index.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         index.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         index.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || index.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleAddIndex = async (index: typeof availableIndices[0]) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setIsCreating(index.id);
      
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
      setIsCreating(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore Market Indices</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover and add market indices to your portfolio. Create conditional orders based on real-time data from Alpha Vantage.
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

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredIndices.length} of {availableIndices.length} indices
        </p>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live data from Alpha Vantage</span>
        </div>
      </div>

      {/* Indices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredIndices.map((index) => (
          <Card key={index.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${index.color} flex items-center justify-center text-white`}>
                  {index.icon}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {index.category}
                </Badge>
              </div>
              
              <div>
                <CardTitle className="text-lg font-semibold">{index.symbol}</CardTitle>
                <CardDescription className="text-sm">
                  {index.name}
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Current Value */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {index.valueLabel}
                </span>
                <div className={`flex items-center space-x-1 ${
                  index.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {index.isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="font-semibold text-sm">{index.change}</span>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-xs text-gray-600 line-clamp-2">
                {index.description}
              </p>
              
              {/* Provider */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Data by {index.provider}</span>
                <span>Real-time</span>
              </div>
              
              {/* Add Button */}
              <Button 
                onClick={() => handleAddIndex(index)}
                disabled={!isConnected || isCreating === index.id}
                className="w-full"
                size="sm"
              >
                {isCreating === index.id ? (
                  "Adding..."
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Portfolio
                  </>
                )}
              </Button>
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

      {/* Connection Warning */}
      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">Connect Wallet to Add Indices</h4>
                <p className="text-sm text-yellow-700">
                  Connect your wallet to add indices to your portfolio and start creating conditional orders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}