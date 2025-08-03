"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Search, TrendingUp, BarChart3, Settings, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useBlockchain } from "@/hooks/useBlockchain";

// Define predefined indices from the app router
const PREDEFINED_INDICES = [
  // Major Stocks
  { id: 'aapl_stock', name: 'Apple Inc.', symbol: 'AAPL', type: 'Stock' },
  { id: 'tsla_stock', name: 'Tesla Inc.', symbol: 'TSLA', type: 'Stock' },
  { id: 'msft_stock', name: 'Microsoft Corp.', symbol: 'MSFT', type: 'Stock' },
  { id: 'googl_stock', name: 'Alphabet Inc.', symbol: 'GOOGL', type: 'Stock' },
  { id: 'amzn_stock', name: 'Amazon.com Inc.', symbol: 'AMZN', type: 'Stock' },
  { id: 'meta_stock', name: 'Meta Platforms Inc.', symbol: 'META', type: 'Stock' },
  { id: 'nvda_stock', name: 'NVIDIA Corp.', symbol: 'NVDA', type: 'Stock' },
  
  // ETFs and Indices
  { id: 'spy_etf', name: 'SPDR S&P 500 ETF', symbol: 'SPY', type: 'ETF' },
  { id: 'qqq_etf', name: 'Invesco QQQ Trust', symbol: 'QQQ', type: 'ETF' },
  { id: 'vix_index', name: 'CBOE Volatility Index', symbol: 'VIX', type: 'Index' },
  
  // Cryptocurrencies
  { id: 'btc_price', name: 'Bitcoin', symbol: 'BTC', type: 'Crypto' },
  { id: 'eth_price', name: 'Ethereum', symbol: 'ETH', type: 'Crypto' },
  
  // Commodities
  { id: 'wti_oil', name: 'WTI Crude Oil', symbol: 'WTI', type: 'Commodity' },
  { id: 'brent_oil', name: 'Brent Crude Oil', symbol: 'BRENT', type: 'Commodity' },
  { id: 'natural_gas', name: 'Natural Gas', symbol: 'NG', type: 'Commodity' },
  { id: 'copper_price', name: 'Copper', symbol: 'COPPER', type: 'Commodity' },
  { id: 'gold_price', name: 'Gold', symbol: 'GOLD', type: 'Commodity' },
  { id: 'wheat_price', name: 'Wheat', symbol: 'WHEAT', type: 'Commodity' },
  { id: 'corn_price', name: 'Corn', symbol: 'CORN', type: 'Commodity' },
  
  // Forex
  { id: 'eur_usd', name: 'EUR/USD', symbol: 'EURUSD', type: 'Forex' },
  { id: 'gbp_usd', name: 'GBP/USD', symbol: 'GBPUSD', type: 'Forex' },
  { id: 'usd_jpy', name: 'USD/JPY', symbol: 'USDJPY', type: 'Forex' },
  
  // Economics
  { id: 'us_gdp', name: 'US GDP', symbol: 'GDP', type: 'Economic' },
  { id: 'us_inflation', name: 'US Inflation', symbol: 'CPI', type: 'Economic' },
  { id: 'us_unemployment', name: 'US Unemployment', symbol: 'UNEMP', type: 'Economic' },
  { id: 'fed_funds_rate', name: 'Fed Funds Rate', symbol: 'FFR', type: 'Economic' },
  { id: 'treasury_yield', name: 'Treasury Yield', symbol: 'YIELD', type: 'Economic' },
  
  // Intelligence
  { id: 'top_gainers', name: 'Top Gainers', symbol: 'GAINERS', type: 'Intelligence' },
];

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  type: string;
}

export function Navbar() {
  const router = useRouter();
  const { indices: blockchainIndices } = useBlockchain();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    setIsLoading(true);
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Search predefined indices
    PREDEFINED_INDICES.forEach(index => {
      if (
        index.name.toLowerCase().includes(queryLower) ||
        index.symbol.toLowerCase().includes(queryLower) ||
        index.type.toLowerCase().includes(queryLower)
      ) {
        results.push(index);
      }
    });

    // Search blockchain indices
    blockchainIndices.forEach(index => {
      const blockchainResult = {
        id: `blockchain_${index.id}`,
        name: index.name || `Blockchain Index ${index.id}`,
        symbol: `IDX${index.id}`,
        type: 'Blockchain'
      };
      
      if (
        blockchainResult.name.toLowerCase().includes(queryLower) ||
        blockchainResult.symbol.toLowerCase().includes(queryLower) ||
        blockchainResult.type.toLowerCase().includes(queryLower)
      ) {
        results.push(blockchainResult);
      }
    });

    // Sort results by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aExactMatch = a.name.toLowerCase() === queryLower || a.symbol.toLowerCase() === queryLower;
      const bExactMatch = b.name.toLowerCase() === queryLower || b.symbol.toLowerCase() === queryLower;
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      return a.name.localeCompare(b.name);
    });

    setSearchResults(results.slice(0, 8)); // Limit to 8 results
    setIsSearchOpen(results.length > 0);
    setIsLoading(false);
  };

  // Handle search input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, blockchainIndices]);

  // Handle search result click
  const handleResultClick = (result: SearchResult) => {
    router.push(`/index/${result.id}`);
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo - Cookie.fun style minimal */}
          <div className="flex items-center space-x-6">
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                c1nch
              </span>
            </div>
            
            {/* Simple navigation links */}
            <div className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => router.push("/")}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Markets
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Portfolio
              </button>
            </div>
          </div>

          {/* Right side - Search and Wallet */}
          <div className="flex items-center space-x-4">
            {/* Compact search */}
            <div className="relative hidden sm:block" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                className="pl-10 pr-10 py-1.5 w-64 text-sm border-gray-300 rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setIsSearchOpen(true)}
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              
              {/* Search Results Dropdown */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {result.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {result.symbol} • {result.type}
                            </div>
                          </div>
                          <div className="text-gray-400 group-hover:text-blue-600 transition-colors">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="p-4 text-center text-gray-500">
                      No indices found for &quot;{searchQuery}&quot;
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
