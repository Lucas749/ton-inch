/**
 * 🪙 Token Selector Component
 * 
 * This component provides a searchable interface for selecting tokens
 * using the 1inch Token API service.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
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
  label = 'Select Token',
  placeholder = 'Choose a token',
  disabled = false,
  className = '',
  showBalance = false,
  walletAddress,
  excludeTokens = []
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [popularTokens, setPopularTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenDetails, setTokenDetails] = useState<Record<string, TokenDetails>>({});

  // Load popular tokens on mount
  useEffect(() => {
    const loadPopularTokens = async () => {
      try {
        const popular = tokenService.getPopularTokens();
        const filtered = popular.filter(token => 
          !excludeTokens.includes(token.address.toLowerCase())
        );
        setPopularTokens(filtered);
        setSearchResults(filtered);
      } catch (err) {
        console.error('Error loading popular tokens:', err);
        setError('Failed to load popular tokens');
      }
    };

    loadPopularTokens();
  }, [excludeTokens]);

  // Search tokens with debouncing
  const searchTokens = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(popularTokens);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await tokenService.searchTokens(query, 50);
      const filtered = results.filter(token => 
        !excludeTokens.includes(token.address.toLowerCase())
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error('Error searching tokens:', err);
      setError('Failed to search tokens');
      // Fallback to local search in popular tokens
      const filtered = popularTokens.filter(token =>
        token.name.toLowerCase().includes(query.toLowerCase()) ||
        token.symbol.toLowerCase().includes(query.toLowerCase()) ||
        token.address.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setIsLoading(false);
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
    onTokenSelect(token);
    setIsOpen(false);
    setSearchQuery('');
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
                // Fallback to a generic token icon
                (e.target as HTMLImageElement).src = 
                  'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/generic.png';
              }}
            />
            {isStable && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{token.symbol}</span>
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
            <p className="text-sm text-gray-500 truncate">{token.name}</p>
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
                    (e.target as HTMLImageElement).src = 
                      'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/generic.png';
                  }}
                />
                <span className="font-medium">{selectedToken.symbol}</span>
                <span className="text-gray-500 text-sm">{selectedToken.name}</span>
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
                placeholder="Search by name, symbol, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>

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
                  searchResults.map((token) => (
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