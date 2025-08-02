"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  Search,
  Eye,
  RefreshCw,
  AlertCircle,
  Plus,
  CheckCircle,
  Loader2
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
  oracleStatus?: {
    hasOracle: boolean;
    oracleType: number;
    oracleTypeName: string;
    isChainlink: boolean;
    isMock: boolean;
    loading: boolean;
  };
}

const categories = ["All", "Stocks", "Crypto", "Commodities", "Forex", "ETFs", "Indices", "Economics", "Intelligence", "Custom"];

/**
 * Create proper Alpha Vantage URL based on index type
 */
function createAlphaVantageUrl(index: RealIndexData): string {
  const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE || '123';
  const baseUrl = 'https://www.alphavantage.co/query';
  
  // Generic Alpha Vantage URL builder - works with any symbol/category combination
  const buildUrl = (symbol: string, category: string) => {
    const params = new URLSearchParams();
    params.set('apikey', apiKey);
    
    // Smart function detection based on symbol patterns
    
    // 1. Check if symbol contains slash (forex pairs like EUR/USD)
    if (symbol.includes('/')) {
      const [from, to] = symbol.split('/');
      params.set('function', 'FX_DAILY');
      params.set('from_symbol', from);
      params.set('to_symbol', to);
      return `${baseUrl}?${params.toString()}`;
    }
    
    // 2. Check for 6-character currency pairs (EURUSD, GBPJPY)
    if (symbol.length === 6 && symbol.match(/^[A-Z]{6}$/)) {
      params.set('function', 'FX_DAILY');
      params.set('from_symbol', symbol.slice(0, 3));
      params.set('to_symbol', symbol.slice(3));
      return `${baseUrl}?${params.toString()}`;
    }
    
    // 3. Known cryptocurrency patterns
    const cryptoPatterns = /^(BTC|ETH|LTC|XRP|ADA|DOT|LINK|UNI|MATIC|SOL|DOGE|SHIB|AVAX|ATOM|ALGO|XLM)$/i;
    if (category === 'Crypto' || cryptoPatterns.test(symbol)) {
      params.set('function', 'DIGITAL_CURRENCY_DAILY');
      params.set('symbol', symbol);
      params.set('market', 'USD');
      return `${baseUrl}?${params.toString()}`;
    }
    
    // 4. Commodity function names (symbol IS the function)
    const commodityFunctions = [
      'CORN', 'WHEAT', 'WTI', 'BRENT', 'NATURAL_GAS', 'COPPER', 'ALUMINUM', 
      'ZINC', 'NICKEL', 'GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM'
    ];
    if (category === 'Commodities' || commodityFunctions.includes(symbol.toUpperCase())) {
      params.set('function', symbol.toUpperCase());
      return `${baseUrl}?${params.toString()}`;
    }
    
    // 5. Economic indicators (function names)
    const economicFunctions = [
      'GDP', 'INFLATION', 'UNEMPLOYMENT', 'FEDERAL_FUNDS_RATE', 'TREASURY_YIELD',
      'CPI', 'RETAIL_SALES', 'DURABLES', 'CONSUMER_SENTIMENT'
    ];
    if (category === 'Economics' || economicFunctions.includes(symbol.toUpperCase())) {
      params.set('function', symbol.toUpperCase());
      return `${baseUrl}?${params.toString()}`;
    }
    
    // 6. Special functions that need specific handling
    if (symbol.toLowerCase().includes('earnings')) {
      params.set('function', 'EARNINGS_ESTIMATES');
      // Extract actual symbol from earnings notation (e.g., "MSTR EPS" -> "MSTR")
      const actualSymbol = symbol.replace(/\s*(EPS|EARNINGS).*$/i, '');
      params.set('symbol', actualSymbol);
      return `${baseUrl}?${params.toString()}`;
    }
    
    if (category === 'Intelligence' || symbol.toLowerCase().includes('gainers') || symbol.toLowerCase().includes('losers')) {
      params.set('function', 'TOP_GAINERS_LOSERS');
      return `${baseUrl}?${params.toString()}`;
    }
    
    // 7. Default to GLOBAL_QUOTE for stocks, ETFs, indices, and unknown types
    params.set('function', 'GLOBAL_QUOTE');
    params.set('symbol', symbol);
    return `${baseUrl}?${params.toString()}`;
  };
  
  return buildUrl(index.symbol, index.category);
}

export function IndicesExplorer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [indices, setIndices] = useState<RealIndexData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingIndexId, setRequestingIndexId] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  
  const router = useRouter();
  const { isConnected, indices: blockchainIndices, isOwner, walletAddress, getPrivateKeyForDemo } = useBlockchain();
  
  // Helper functions for tracking owned indices
  const getOwnedIndicesKey = (address: string) => `ownedIndices_${address.toLowerCase()}`;
  
  const getOwnedIndices = (): number[] => {
    if (!walletAddress) return [];
    try {
      const stored = localStorage.getItem(getOwnedIndicesKey(walletAddress));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };
  
  const addOwnedIndex = (indexId: number) => {
    if (!walletAddress) return;
    const current = getOwnedIndices();
    if (!current.includes(indexId)) {
      const updated = [...current, indexId];
      localStorage.setItem(getOwnedIndicesKey(walletAddress), JSON.stringify(updated));
    }
  };
  
  const isIndexOwned = (indexId: number): boolean => {
    return getOwnedIndices().includes(indexId);
  };

  // Simple cache for oracle status (5 minute TTL)
  const oracleCache = new Map<number, { data: any; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Check oracle status for a blockchain index with caching
  const checkOracleStatus = async (blockchainId: number) => {
    // Check cache first
    const cached = oracleCache.get(blockchainId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`🎯 Cache hit for index ${blockchainId}`);
      return cached.data;
    }

    try {
      console.log(`🔍 Checking oracle status for index ${blockchainId}`);
      const response = await fetch(`/api/orders?action=check-oracle&indexId=${blockchainId}`);
      const data = await response.json();
      
      if (data.success) {
        const result = {
          hasOracle: data.hasOracle,
          oracleType: data.oracleType || 0,
          oracleTypeName: data.oracleTypeName || 'MOCK',
          isChainlink: data.isChainlink || false,
          isMock: data.isMock !== false,
          loading: false
        };
        
        // Cache the result
        oracleCache.set(blockchainId, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (error) {
      console.error(`Failed to check oracle status for index ${blockchainId}:`, error);
    }
    
    const fallback = {
      hasOracle: false,
      oracleType: 0,
      oracleTypeName: 'UNKNOWN',
      isChainlink: false,
      isMock: true,
      loading: false
    };
    
    // Cache the fallback too (shorter TTL)
    oracleCache.set(blockchainId, { data: fallback, timestamp: Date.now() - CACHE_TTL + 30000 }); // 30s cache for errors
    return fallback;
  };

  // Load real data from Alpha Vantage
  const loadIndicesData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE || "123";
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
            name: blockchainIndex.name, // Use the extracted Alpha Vantage name from blockchain
            displayName: blockchainIndex.name || alphaVantageData.name, // Fallback for display
            description: `${blockchainIndex.description} (On-Chain)`,
            // Keep Alpha Vantage display data but indicate blockchain availability
            blockchainId: blockchainIndex.id,
            blockchainValue: blockchainIndex.value,
            onChain: true,
            oracleStatus: {
              hasOracle: true, // Will be populated asynchronously
              oracleType: 0,
              oracleTypeName: 'UNKNOWN',
              isChainlink: false,
              isMock: true,
              loading: true
            }
          });
        }
      }
    });
    
    // Include all blockchain indices with enhanced market data
    // For indices without Alpha Vantage matches, create standalone entries
    blockchainIndices.forEach(blockchainIndex => {
      if (!blockchainIndex.alphaVantageSymbol) {
        // No Alpha Vantage symbol, create standalone entry
        integratedIndices.push({
          id: `blockchain_${blockchainIndex.id}`,
          name: blockchainIndex.name || `Index ${blockchainIndex.id}`,
          symbol: blockchainIndex.symbol || `IDX${blockchainIndex.id}`,
          handle: `@${(blockchainIndex.symbol || `index${blockchainIndex.id}`).toLowerCase()}`,
          description: blockchainIndex.description || `Custom blockchain index #${blockchainIndex.id}`,
          category: blockchainIndex.category || "Custom",
          provider: "Blockchain",
          avatar: blockchainIndex.avatar || "🔗",
          color: blockchainIndex.color || "bg-blue-500",
          currentValue: blockchainIndex.value,
          valueLabel: `${(blockchainIndex.value / 100).toFixed(2)}`,
          price: blockchainIndex.value / 100,
          change: "0.00%",
          changeValue: "0.00",
          isPositive: true,
          mindshare: "Available",
          sparklineData: [0, 0, 0, 0, 0, 0, 0, 0],
          lastUpdated: new Date(blockchainIndex.timestamp * 1000).toISOString().split('T')[0],
          blockchainId: blockchainIndex.id,
          blockchainValue: blockchainIndex.value,
          onChain: true,
          oracleStatus: {
            hasOracle: true, // Will be populated asynchronously
            oracleType: 0,
            oracleTypeName: 'UNKNOWN',
            isChainlink: false,
            isMock: true,
            loading: true
          }
        });
      } else {
        // Has Alpha Vantage symbol but no market data match, create enhanced entry
        const existingMarketData = indices.find(index => 
          index.symbol === blockchainIndex.alphaVantageSymbol
        );
        
        if (!existingMarketData) {
          // Create market-style entry for blockchain index with Alpha Vantage data
          integratedIndices.push({
            id: `blockchain_${blockchainIndex.id}`,
            name: blockchainIndex.name || blockchainIndex.alphaVantageSymbol,
            symbol: blockchainIndex.alphaVantageSymbol,
            handle: `@${blockchainIndex.alphaVantageSymbol.toLowerCase()}`,
            description: blockchainIndex.description || `${blockchainIndex.alphaVantageSymbol} tracked on blockchain`,
            category: blockchainIndex.category || "Custom",
            provider: "Alpha Vantage + Blockchain",
            avatar: blockchainIndex.avatar || "🔗",
            color: blockchainIndex.color || "bg-blue-500",
            currentValue: blockchainIndex.value,
            valueLabel: `${(blockchainIndex.value / 100).toFixed(2)}`,
            price: blockchainIndex.value / 100,
            change: "0.00%",
            changeValue: "0.00",
            isPositive: true,
            mindshare: "On-Chain",
            sparklineData: [0, 0, 0, 0, 0, 0, 0, 0],
            lastUpdated: new Date(blockchainIndex.timestamp * 1000).toISOString().split('T')[0],
            blockchainId: blockchainIndex.id,
            blockchainValue: blockchainIndex.value,
            onChain: true,
            oracleStatus: {
              hasOracle: true, // Will be populated asynchronously
              oracleType: 0,
              oracleTypeName: 'UNKNOWN',
              isChainlink: false,
              isMock: true,
              loading: true
            }
          });
        }
      }
    });
    
    return integratedIndices;
  };

  const [contractIndicesWithOracles, setContractIndicesWithOracles] = useState<ExtendedRealIndexData[]>([]);
  
  const availableContractIndices = createIntegratedContractIndices();

  // Load oracle status for all blockchain indices (parallel for speed)
  useEffect(() => {
    const loadOracleStatuses = async () => {
      if (availableContractIndices.length === 0) {
        setContractIndicesWithOracles([]);
        return;
      }
      
      console.log(`🚀 Loading oracle status for ${availableContractIndices.length} indices...`);
      
      // Show indices immediately with loading state
      const initialIndices = availableContractIndices.map(index => ({
        ...index,
        oracleStatus: {
          hasOracle: false,
          oracleType: 0,
          oracleTypeName: 'UNKNOWN',
          isChainlink: false,
          isMock: true,
          loading: true
        }
      }));
      setContractIndicesWithOracles(initialIndices);
      
      // Check oracle status in parallel for all indices (much faster!)
      const oraclePromises = availableContractIndices.map(async (index) => {
        if (index.blockchainId !== undefined) {
          const oracleStatus = await checkOracleStatus(index.blockchainId);
          return { ...index, oracleStatus };
        }
        return index;
      });
      
      try {
        console.log(`⚡ Checking oracle status for all indices in parallel...`);
        const startTime = Date.now();
        const updatedIndices = await Promise.all(oraclePromises);
        const endTime = Date.now();
        console.log(`✅ Oracle status check completed in ${endTime - startTime}ms`);
        setContractIndicesWithOracles(updatedIndices);
      } catch (error) {
        console.error('Failed to load oracle statuses:', error);
        // Keep the loading state indices if there's an error
      }
    };
    
    loadOracleStatuses();
  }, [blockchainIndices.length, indices.length]); // Re-run when blockchain indices or regular indices change
  
  // Split contract indices into groups based on oracle status
  const indicesWithOracles = contractIndicesWithOracles.filter(index => 
    index.oracleStatus?.hasOracle && !index.oracleStatus?.loading
  );
  const indicesNeedingSetup = contractIndicesWithOracles.filter(index => 
    !index.oracleStatus?.hasOracle && !index.oracleStatus?.loading
  );
  const indicesLoading = contractIndicesWithOracles.filter(index => 
    index.oracleStatus?.loading
  );
  
  // Show loading indices in a temporary section while checking
  const allIndicesForDisplay = [...indicesWithOracles, ...indicesNeedingSetup, ...indicesLoading];

  // Apply filters to oracle-ready indices
  const filteredOracleIndices = indicesWithOracles.filter(index => {
    const matchesSearch = index.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      index.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      index.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || index.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Apply filters to setup-required indices  
  const filteredSetupIndices = indicesNeedingSetup.filter(index => {
    const matchesSearch = index.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      index.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      index.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || index.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
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

  // Filter blockchain indices by category as well
  const filteredContractIndices = availableContractIndices.filter(index => {
    const matchesSearch = index.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         index.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         index.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || index.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleViewIndex = (index: RealIndexData) => {
    router.push(`/index/${index.id.toLowerCase()}`);
  };

  const handleRequestIndex = async (index: RealIndexData) => {
    if (!isConnected || !walletAddress) {
      setRequestError("Please connect your wallet first");
      return;
    }

    if (!window.ethereum) {
      setRequestError("MetaMask or compatible wallet required");
      return;
    }

    setRequestingIndexId(index.id);
    setRequestError(null);
    setRequestSuccess(null);

    try {
      // Use the current Alpha Vantage price as initial value
      const initialValue = Math.floor(index.price || 0);
      
      // Create proper Alpha Vantage URL based on index category
      const sourceUrl = createAlphaVantageUrl(index);

      // Use the blockchain service directly instead of API route
      const { ORACLE_TYPES } = await import('@/lib/blockchain-constants');
      const { blockchainService } = await import('@/lib/blockchain-service');
      
      const result = await blockchainService.createIndexWithOracleType(
        index.name,
        initialValue,
        sourceUrl,
        ORACLE_TYPES.CHAINLINK
      );

      if (result.success) {
        setRequestSuccess(`✅ Successfully created blockchain index "${index.name}" with ID ${result.indexId}! Transaction: ${result.transactionHash}`);
        
        // Track ownership of the newly created index
        if (result.indexId) {
          addOwnedIndex(result.indexId);
        }
        
        // Refresh blockchain indices
        setTimeout(() => {
          window.location.reload(); // Simple refresh to show new index
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to create index');
      }

    } catch (error) {
      console.error('❌ Error requesting index:', error);
      setRequestError(`Failed to create blockchain index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRequestingIndexId(null);
    }
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

      {/* Request Success/Error Messages */}
      {requestSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {requestSuccess}
          </AlertDescription>
        </Alert>
      )}

      {requestError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {requestError}
          </AlertDescription>
        </Alert>
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

      {/* Ready for Trading - Indices with Oracles */}
      {!isLoading && filteredOracleIndices.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-green-900 mb-2">✅ Ready for Trading</h3>
            <p className="text-md text-gray-600 max-w-2xl mx-auto">
              These indices have oracles configured and are ready for conditional orders. Click any card to start trading.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOracleIndices.map((index) => (
            <Card 
              key={index.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-green-200 bg-green-50 rounded-xl"
              onClick={() => {
                const extendedIndex = index as ExtendedRealIndexData;
                if (extendedIndex.onChain && extendedIndex.blockchainId !== undefined) {
                  router.push(`/index/blockchain_${extendedIndex.blockchainId}`);
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
                      <div className="flex items-center space-x-2">
                        <div className="font-semibold text-gray-900">{index.name}</div>
                        {/* Oracle type badge */}
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          index.oracleStatus?.isChainlink 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {index.oracleStatus?.oracleTypeName}
                        </div>
                        {/* Owner badge */}
                        {(index as ExtendedRealIndexData).blockchainId && isConnected && isIndexOwned((index as ExtendedRealIndexData).blockchainId!) && (
                          <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">
                            👑 Owner
                          </Badge>
                        )}
                      </div>
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
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}

      {/* Setup Required - Indices without Oracles */}
      {!isLoading && filteredSetupIndices.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-orange-900 mb-2">🔧 Setup Required</h3>
            <p className="text-md text-gray-600 max-w-2xl mx-auto">
              These indices need oracle configuration before conditional orders can be created. Click to view details and setup instructions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSetupIndices.map((index) => (
            <Card 
              key={index.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-orange-200 bg-orange-50 rounded-xl"
              onClick={() => {
                const extendedIndex = index as ExtendedRealIndexData;
                if (extendedIndex.onChain && extendedIndex.blockchainId !== undefined) {
                  router.push(`/index/blockchain_${extendedIndex.blockchainId}`);
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
                      <div className="flex items-center space-x-2">
                        <div className="font-semibold text-gray-900">{index.name}</div>
                        {/* Setup required badge */}
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Setup Required
                        </div>
                        {/* Owner badge */}
                        {(index as ExtendedRealIndexData).blockchainId && isConnected && isIndexOwned((index as ExtendedRealIndexData).blockchainId!) && (
                          <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">
                            👑 Owner
                          </Badge>
                        )}
                      </div>
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
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}

      {/* Loading indices - shown while checking oracle status */}
      {!isLoading && indicesLoading.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">🔄 Checking Oracle Status</h3>
            <p className="text-md text-gray-600 max-w-2xl mx-auto">
              Verifying oracle configurations for these indices...
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indicesLoading.map((index) => (
            <Card 
              key={index.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-300 bg-gray-50 rounded-xl opacity-75"
              onClick={() => {
                const extendedIndex = index as ExtendedRealIndexData;
                if (extendedIndex.onChain && extendedIndex.blockchainId !== undefined) {
                  router.push(`/index/blockchain_${extendedIndex.blockchainId}`);
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
                      <div className="flex items-center space-x-2">
                        <div className="font-semibold text-gray-900">{index.name}</div>
                        {/* Loading badge */}
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                          Checking...
                        </div>
                        {/* Owner badge */}
                        {(index as ExtendedRealIndexData).blockchainId && isConnected && isIndexOwned((index as ExtendedRealIndexData).blockchainId!) && (
                          <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">
                            👑 Owner
                          </Badge>
                        )}
                      </div>
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
                    disabled={requestingIndexId === index.id || !isConnected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestIndex(index);
                    }}
                  >
                    {requestingIndexId === index.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Request
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}



      {/* No Results */}
      {!isLoading && filteredIndices.length === 0 && filteredContractIndices.length === 0 && (
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