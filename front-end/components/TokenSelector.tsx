/**
 * 🪙 Token Selector Component
 * 
 * This component provides a searchable interface for selecting tokens
 * using the 1inch Token API service.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  ChevronDown, 
  Star, 
  AlertCircle, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import { tokenService, Token, TokenDetails, getTokenLogoUrl, isStablecoin } from '@/lib/token-service';

interface TokenSelectorProps {
  selectedToken?: Token | null;
  onTokenSelect: (token: Token) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showBalance?: boolean;
  walletAddress?: string;
  excludeTokens?: string[]; // Token addresses to exclude
}

export function TokenSelector({
  selectedToken,
  onTokenSelect,
  label = '',
  placeholder = 'Choose a token',
  disabled = false,
  className = '',
  showBalance = false,
  walletAddress,
  excludeTokens = []
}: TokenSelectorProps) {
  // Memoize excludeTokens to prevent unnecessary re-renders
  const memoizedExcludeTokens = useMemo(() => excludeTokens, [excludeTokens]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [popularTokens, setPopularTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenDetails, setTokenDetails] = useState<Record<string, TokenDetails>>({});
  const [apiTokensLoaded, setApiTokensLoaded] = useState(false);

  // Load top 25 popular tokens from API on mount ONCE
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    const loadPopularTokens = async () => {
      // Prevent multiple simultaneous calls
      if (apiTokensLoaded || isLoading) {
        console.log('🔒 Tokens already loaded or loading, skipping...');
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        console.log('🚀 Loading top 25 popular tokens (once)...');
        
        const popularTokens = await tokenService.getTop25PopularTokens();
        
        // Check if component is still mounted
        if (!isMounted) return;
        
        // Safety check - ensure we have valid tokens array
        if (!Array.isArray(popularTokens)) {
          throw new Error('Invalid tokens response');
        }
        
        const filtered = popularTokens.filter(token => 
          token && 
          typeof token === 'object' && 
          token.address && 
          token.symbol && 
          !memoizedExcludeTokens.includes(token.address.toLowerCase())
        );
        
        setPopularTokens(filtered);
        setSearchResults(filtered);
        setApiTokensLoaded(true);
        console.log(`✅ Loaded ${filtered.length} popular tokens (done)`);
      } catch (error) {
        if (!isMounted) return;
        
        console.error('❌ Failed to load popular tokens:', error);
        
        // Safe fallback to hardcoded tokens
        try {
          const fallbackTokens = tokenService.getPopularTokensSync() || [];
          const safeTokens = fallbackTokens.slice(0, 25).filter(token => 
            token && 
            typeof token === 'object' && 
            token.address && 
            token.symbol &&
            !memoizedExcludeTokens.includes(token.address.toLowerCase())
          );
          
          setPopularTokens(safeTokens);
          setSearchResults(safeTokens);
          setApiTokensLoaded(true);
          setError(safeTokens.length > 0 ? 'Using fallback tokens' : 'No tokens available');
        } catch (fallbackError) {
          console.error('❌ Fallback failed:', fallbackError);
          setPopularTokens([]);
          setSearchResults([]);
          setError('Failed to load tokens');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Only load if not already loaded
    if (!apiTokensLoaded) {
      loadPopularTokens();
    }

    return () => {
      isMounted = false; // Cleanup flag
    };
  }, []); // Empty dependency array - load only once on mount

  // Search tokens - only call API when user searches by address
  const searchTokens = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(popularTokens);
      return;
    }

    // First check if it looks like a token address (0x...)
    const isAddress = query.startsWith('0x') && query.length >= 10;
    
    if (isAddress) {
      // It's an address - search via API
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`🔍 Searching API for token address: ${query}`);
        const results = await tokenService.searchTokens(query, 10);
        const filtered = results.filter(token => 
          !memoizedExcludeTokens.includes(token.address.toLowerCase())
        );
        setSearchResults(filtered);
        
        if (filtered.length === 0) {
          setError('Token not found');
        }
      } catch (err: any) {
        console.error('API search error:', err);
        setError(err.message || 'Search failed');
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      // It's a symbol/name - search locally in popular tokens only
      console.log(`🔍 Local search for: ${query}`);
      const filtered = popularTokens.filter(token => {
        if (!token || !token.symbol || !token.name) return false;
        return token.symbol.toLowerCase().includes(query.toLowerCase()) ||
               token.name.toLowerCase().includes(query.toLowerCase());
      });
      setSearchResults(filtered);
      setError(filtered.length === 0 ? 'No tokens found. Try entering a token address (0x...)' : null);
    }
  }, [popularTokens, excludeTokens]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchTokens(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchTokens]);

  // Load token details for enhanced display
  const loadTokenDetails = async (token: Token) => {
    if (tokenDetails[token.address]) return;

    try {
      const details = await tokenService.getTokenDetails(token.address);
      if (details) {
        setTokenDetails(prev => ({
          ...prev,
          [token.address]: details
        }));
      }
    } catch (err) {
      console.error(`Error loading details for ${token.symbol}:`, err);
    }
  };

  const handleTokenSelect = (token: Token) => {
    try {
      // Safety check - ensure token has required properties
      if (!token || !token.address || !token.symbol) {
        console.error('❌ Invalid token selected:', token);
        setError('Invalid token selected');
        return;
      }
      
      console.log('✅ Token selected:', token.symbol, token.address);
      onTokenSelect(token);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('❌ Error selecting token:', error);
      setError('Failed to select token');
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
      setError(null);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const TokenItem = ({ token }: { token: Token }) => {
    // Safety checks to prevent crashes
    if (!token || !token.address || !token.symbol) {
      console.warn('⚠️ Invalid token props:', token);
      return null;
    }

    const details = tokenDetails[token.address];
    const logoUrl = getTokenLogoUrl(token);
    const isStable = isStablecoin(token);

    return (
      <div
        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
        onClick={() => handleTokenSelect(token)}
        onMouseEnter={() => loadTokenDetails(token)}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={logoUrl}
              alt={token.symbol}
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                // Prevent infinite loops by checking if we already set the fallback
                if (!img.dataset.fallbackSet) {
                  img.dataset.fallbackSet = 'true';
                  // Use a base64 encoded generic token icon
                  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMiAxdjJtMCAxOHYybTExLTEyaC0ybS0xOCAwaDIiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K';
                }
              }}
            />
            {isStable && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{token.symbol || 'Unknown'}</span>
              {details?.rating && details.rating > 90 && (
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              )}
              {isStable && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  Stable
                </Badge>
              )}
              {token.tags?.includes('test') && (
                <Badge variant="outline" className="text-xs">
                  Test
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">{token.name || 'Unknown Token'}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400">{formatAddress(token.address)}</p>
          {details?.rating && (
            <p className="text-xs text-gray-500">Rating: {details.rating}%</p>
          )}
          {showBalance && walletAddress && (
            <p className="text-xs text-gray-600">Balance: 0.00</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-between h-12"
          >
            {selectedToken ? (
              <div className="flex items-center space-x-2">
                <img
                  src={getTokenLogoUrl(selectedToken)}
                  alt={selectedToken.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    // Prevent infinite loops by checking if we already set the fallback
                    if (!img.dataset.fallbackSet) {
                      img.dataset.fallbackSet = 'true';
                      // Use a base64 encoded generic token icon
                      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMiAxdjJtMCAxOHYybTExLTEyaC0ybS0xOCAwaDIiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K';
                    }
                  }}
                />
                <span className="font-medium">{selectedToken.symbol}</span>
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Token</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                                    placeholder="Search popular tokens or enter address (0x...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Helper Text */}
            {!error && searchQuery && !searchQuery.startsWith('0x') && (
              <div className="text-xs text-gray-500 px-1">
                💡 Searching popular tokens only. Enter token address (0x...) to search all tokens.
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Popular/Search Results */}
            <ScrollArea className="h-96">
              <div className="space-y-1">
                {!searchQuery && (
                  <div className="px-3 py-2 text-sm font-medium text-gray-500 border-b">
                    Popular Tokens
                  </div>
                )}
                
                {searchResults.length > 0 ? (
                  searchResults
                    .filter(token => token && token.address && token.symbol) // Safety filter
                    .map((token) => (
                      <TokenItem key={token.address} token={token} />
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No tokens found' : 'No tokens available'}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
              <span>Powered by 1inch Token API</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => window.open('https://portal.1inch.dev/documentation/apis/tokens/introduction', '_blank')}
              >
                API Docs <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TokenSelector;