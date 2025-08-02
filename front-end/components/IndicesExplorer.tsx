"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  Search,
  Eye,
  RefreshCw,
  AlertCircle,
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useBlockchain } from "@/hooks/useBlockchain";
import { Sparkline } from "./Sparkline";
import { RealIndicesService, RealIndexData } from "@/lib/real-indices-service";

// Extended interface for blockchain-integrated indices
interface ExtendedRealIndexData extends RealIndexData {
  blockchainId?: number;
  blockchainValue?: number;
  onChain?: boolean;
}

const categories = ["All", "Stocks", "Crypto", "Commodities", "Forex", "ETFs", "Indices", "Economics", "Intelligence"];

export function IndicesExplorer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [indices, setIndices] = useState<RealIndexData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { isConnected, indices: blockchainIndices } = useBlockchain();

  // Load real data from Alpha Vantage
  const loadIndicesData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY || "123";
      const realIndicesService = new RealIndicesService(apiKey);
      
      const realIndices = await realIndicesService.getAllRealIndices();
      setIndices(realIndices);
    } catch (err) {
      console.error("Error loading indices data:", err);
      setError("Failed to load real-time market data. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadIndicesData();
  }, []);

  // Create integrated contract indices by combining blockchain indices with Alpha Vantage data
  const createIntegratedContractIndices = () => {
    const integratedIndices: ExtendedRealIndexData[] = [];
    
    // For each blockchain index with an Alpha Vantage symbol, create an integrated index
    blockchainIndices.forEach(blockchainIndex => {
      if (blockchainIndex.alphaVantageSymbol) {
        // Find matching Alpha Vantage data
        const alphaVantageData = indices.find(index => 
          index.symbol === blockchainIndex.alphaVantageSymbol
        );
        
        if (alphaVantageData) {
          // Create integrated index with blockchain data and Alpha Vantage UI data
          integratedIndices.push({
            ...alphaVantageData,
            id: `blockchain_${blockchainIndex.id}`, // Unique ID for blockchain indices
            name: blockchainIndex.name || alphaVantageData.name,
            description: `${blockchainIndex.description} (On-Chain)`,
            // Keep Alpha Vantage display data but indicate blockchain availability
            blockchainId: blockchainIndex.id,
            blockchainValue: blockchainIndex.value,
            onChain: true
          });
        }
      }
    });
    
    // Also include blockchain indices without Alpha Vantage mapping
    blockchainIndices.forEach(blockchainIndex => {
      if (!blockchainIndex.alphaVantageSymbol) {
        integratedIndices.push({
          id: `blockchain_${blockchainIndex.id}`,
          name: blockchainIndex.name || `Index ${blockchainIndex.id}`,
          symbol: blockchainIndex.symbol || `IDX${blockchainIndex.id}`,
          handle: `@index${blockchainIndex.id}`,
          description: blockchainIndex.description || `Custom blockchain index #${blockchainIndex.id}`,
          category: blockchainIndex.category || "Custom",
          provider: "Blockchain",
          avatar: "🔗",
          color: "bg-blue-500",
          currentValue: blockchainIndex.value,
          valueLabel: `${(blockchainIndex.value / 100).toFixed(2)}`,
          price: blockchainIndex.value / 100,
          change: "0.00%",
          changeValue: "0.00",
          isPositive: true,
          mindshare: "N/A",
          sparklineData: [0, 0, 0, 0, 0, 0, 0, 0],
          lastUpdated: new Date(blockchainIndex.timestamp * 1000).toISOString().split('T')[0],
          blockchainId: blockchainIndex.id,
          blockchainValue: blockchainIndex.value,
          onChain: true
        });
      }
    });
    
    return integratedIndices;
  };

  const availableContractIndices = createIntegratedContractIndices();
  
  // Filter out Alpha Vantage indices that are available as contract indices from market indices
  const availableContractSymbols = availableContractIndices.map(index => index.symbol);
  const filteredIndices = indices.filter(index => {
    const matchesSearch = index.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         index.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         index.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || index.category === selectedCategory;
    
    // Exclude indices that are available as contract indices
    const isNotAvailableContract = !availableContractSymbols.includes(index.symbol);
    
    return matchesSearch && matchesCategory && isNotAvailableContract;
  });

  const handleViewIndex = (index: RealIndexData) => {
    router.push(`/index/${index.id.toLowerCase()}`);
  };

  const handleRefresh = () => {
    loadIndicesData(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Indices Explorer</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover market indices and blockchain indices. Request market data or add on-chain indices for conditional trading.
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
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Updating...' : 'Refresh'}
          </Button>
          
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
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-800">Error Loading Data</h4>
                <p className="text-sm text-red-700">{error}</p>
                <Button 
                  onClick={handleRefresh} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-red-200 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                    <div>
                      <div className="h-4 w-20 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 rounded"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  <div className="h-4 w-12 bg-gray-200 rounded"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Available Contract Indices Section */}
      {!isLoading && availableContractIndices.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Available Contract Indices</h3>
            <p className="text-md text-gray-600 max-w-2xl mx-auto">
              These indices are live on the blockchain with oracle data. Click anywhere on a card to start trading with these indices.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Show market data indices that are available */}
          {availableContractIndices.map((index) => (
            <Card 
              key={index.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 rounded-xl"
              onClick={() => {
                // For blockchain indices, route to create-index with the blockchain index ID
                const extendedIndex = index as ExtendedRealIndexData;
                if (extendedIndex.onChain && extendedIndex.blockchainId !== undefined) {
                  router.push(`/create-index?selectedIndex=${extendedIndex.blockchainId}`);
                } else {
                  handleViewIndex(index);
                }
              }}
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
                      // For blockchain indices, route to create-index with the blockchain index ID
                      const extendedIndex = index as ExtendedRealIndexData;
                      if (extendedIndex.onChain && extendedIndex.blockchainId !== undefined) {
                        router.push(`/create-index?selectedIndex=${extendedIndex.blockchainId}`);
                      } else {
                        // Route to the index detail page for regular indices
                        router.push(`/index/${index.id}`);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}

      {/* Market Indices Section */}
      {!isLoading && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Market Indices (Request Data)</h3>
            <p className="text-md text-gray-600 max-w-2xl mx-auto">
              Real-time market data from Alpha Vantage. Click &ldquo;Request&rdquo; to request adding these indices to the system.
            </p>
          </div>
          
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
                    <Plus className="w-4 h-4 mr-1" />
                    Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}



      {/* No Results */}
      {!isLoading && filteredIndices.length === 0 && availableContractIndices.length === 0 && (
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
      {!isLoading && (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'} ${!error ? 'animate-pulse' : ''}`}></div>
            <span>
              {error 
                ? 'Using fallback data - Alpha Vantage connection failed' 
                : `Live data powered by Alpha Vantage • Last updated: ${indices.length > 0 ? indices[0].lastUpdated : 'N/A'}`
              }
            </span>
            {!error && (
              <Button 
                onClick={handleRefresh} 
                variant="ghost" 
                size="sm" 
                className="text-xs px-2 py-1 h-auto"
              >
                Refresh Now
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}