/**
 * 🪙 1inch Token API Service
 * 
 * This service integrates with the 1inch Token API to fetch token lists,
 * token details, and search for tokens by name, address, or symbol.
 * 
 * API Documentation: https://portal.1inch.dev/documentation/apis/tokens/introduction
 */

// 1inch Token API base URL
const TOKEN_API_BASE_URL = 'https://api.1inch.dev/token/v1.2';

// Base mainnet chain ID (1inch supports mainnet, not testnet)
const BASE_MAINNET_CHAIN_ID = 8453;

// Token interfaces
export interface Token {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  eip2612?: boolean;
  isFoT?: boolean; // Fee on Transfer
  synth?: boolean;
}

export interface TokenList {
  name: string;
  logoURI: string;
  keywords: string[];
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  timestamp: string;
  tokens: Token[];
}

export interface TokenSearchResult {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

export interface TokenDetails extends Token {
  rating: number;
  domainVersion?: string;
  eip2612?: boolean;
  isFoT?: boolean;
  synth?: boolean;
}

// Popular tokens for Base mainnet (updated for ETH/WETH defaults)
export const POPULAR_BASE_MAINNET_TOKENS: Token[] = [
  {
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    chainId: BASE_MAINNET_CHAIN_ID,
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
    tags: ['tokens', 'native']
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    chainId: BASE_MAINNET_CHAIN_ID,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
    tags: ['tokens']
  },
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: BASE_MAINNET_CHAIN_ID,
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86a33e6f8c2b9c9c2b4d0e0b4e4b4e4b4e4b4.png',
    tags: ['tokens', 'stablecoin']
  }
];

class TokenService {
  private apiKey: string;
  private chainId: number;
  
  // Caching and rate limiting
  private cache = new Map<string, { data: any; timestamp: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly CACHE_DURATION = 300000; // 5 minutes
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds (slightly more than 1 RPS)

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_ONEINCH_API_KEY || '';
    this.chainId = BASE_MAINNET_CHAIN_ID; // Base mainnet - 1inch doesn't support testnets
  }

  /**
   * Build query URL for Token API (using proxy endpoint)
   */
  private buildTokenQueryURL(path: string, params: Record<string, string> = {}): string {
    // Use our proxy endpoint to avoid CORS issues
    const url = new URL('/api/oneinch/tokens', window.location.origin);
    
    // Add chainId to all requests
    params.chainId = this.chainId.toString();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
    
    return url.toString();
  }

  /**
   * Call Token API with caching and rate limiting (using proxy endpoint)
   */
  private async callTokenAPI<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const cacheKey = `${path}_${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`🎯 Using cached token data for: ${path}`);
      return cached.data;
    }
    
    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Waiting for pending token request: ${path}`);
      return this.pendingRequests.get(cacheKey)!;
    }
    
    // Rate limiting: ensure we don't exceed 1 RPS
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`🕒 Rate limiting: waiting ${delay}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const requestPromise = this.makeTokenRequest<T>(path, params);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Cache the successful result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      this.lastRequestTime = Date.now();
      return result;
    } catch (error) {
      console.error(`❌ Token API error for ${path}:`, error);
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Make the actual HTTP request
   */
  private async makeTokenRequest<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = this.buildTokenQueryURL(path, params);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // API key is handled by the proxy endpoint
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`1inch Token API proxy error (${response.status}): ${errorText}`);
    }

    return await response.json() as T;
  }

  /**
   * Get ALL supported tokens for current chain - SINGLE API REQUEST
   * Endpoint: GET /token/v1.3/{chainId} (1inch multi-chain endpoint)
   * Note: 1inch API returns tokens as object with addresses as keys, not array
   */
  async getSupportedTokens(): Promise<TokenList> {
    try {
      if (!this.apiKey) {
        console.warn('No 1inch API key provided, using fallback tokens');
        return {
          name: 'Base Mainnet Fallback Token List',
          logoURI: 'https://1inch.io/img/logo.svg',
          keywords: ['base', 'mainnet'],
          version: { major: 1, minor: 0, patch: 0 },
          timestamp: new Date().toISOString(),
          tokens: POPULAR_BASE_MAINNET_TOKENS
        };
      }

      // 1inch API returns tokens as object: {"0xaddress": {tokenData}, ...}
      const tokensObject = await this.callTokenAPI<Record<string, Token>>(`/${this.chainId}`);
      
      // Convert object to array of tokens
      const tokensArray = Object.values(tokensObject || {});
      
      console.log(`🎯 Converted ${tokensArray.length} tokens from object to array`);
      
      return {
        name: 'Base Mainnet Token List (1inch API)',
        logoURI: 'https://1inch.io/img/logo.svg', 
        keywords: ['base', 'mainnet', '1inch'],
        version: { major: 1, minor: 3, patch: 0 },
        timestamp: new Date().toISOString(),
        tokens: tokensArray
      };
    } catch (error) {
      console.error('❌ Error fetching supported tokens:', error);
      // Fallback to popular tokens
      return {
        name: 'Base Mainnet Fallback Token List',
        logoURI: 'https://1inch.io/img/logo.svg',
        keywords: ['base', 'mainnet'],
        version: { major: 1, minor: 0, patch: 0 },
        timestamp: new Date().toISOString(),
        tokens: POPULAR_BASE_MAINNET_TOKENS
      };
    }
  }

  /**
   * Search for tokens by query (name, symbol, or address)
   * Endpoint: GET /token/v1.3/{chainId}/search
   */
  async searchTokens(query: string, limit: number = 20): Promise<TokenSearchResult[]> {
    try {
      if (!this.apiKey || !query.trim()) {
        // Fallback search in popular tokens
        const filtered = POPULAR_BASE_MAINNET_TOKENS.filter(token =>
          token.name.toLowerCase().includes(query.toLowerCase()) ||
          token.symbol.toLowerCase().includes(query.toLowerCase()) ||
          token.address.toLowerCase().includes(query.toLowerCase())
        );
        return filtered.slice(0, limit);
      }

      const results = await this.callTokenAPI<TokenSearchResult[]>(
        `/${this.chainId}/search`,
        { 
          query: query.trim(),
          limit: limit.toString()
        }
      );
      
      return results;
    } catch (error) {
      console.error('❌ Error searching tokens:', error);
      // Fallback search
      const filtered = POPULAR_BASE_MAINNET_TOKENS.filter(token =>
        token.name.toLowerCase().includes(query.toLowerCase()) ||
        token.symbol.toLowerCase().includes(query.toLowerCase()) ||
        token.address.toLowerCase().includes(query.toLowerCase())
      );
      return filtered.slice(0, limit);
    }
  }

  /**
   * Get detailed information about a specific token
   * Endpoint: GET /token/v1.2/{chainId}/{tokenAddress}
   */
  async getTokenDetails(tokenAddress: string): Promise<TokenDetails | null> {
    try {
      if (!this.apiKey) {
        // Fallback to popular tokens
        const token = POPULAR_BASE_MAINNET_TOKENS.find(
          t => t.address.toLowerCase() === tokenAddress.toLowerCase()
        );
        if (token) {
          return {
            ...token,
            rating: 100, // Default high rating for known tokens
            eip2612: false,
            isFoT: false,
            synth: false
          };
        }
        return null;
      }

      const tokenDetails = await this.callTokenAPI<TokenDetails>(
        `/${this.chainId}/${tokenAddress}`
      );
      
      return tokenDetails;
    } catch (error) {
      console.error(`❌ Error fetching token details for ${tokenAddress}:`, error);
      
      // Fallback to popular tokens
      const token = POPULAR_BASE_MAINNET_TOKENS.find(
        t => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      if (token) {
        return {
          ...token,
          rating: 100,
          eip2612: false,
          isFoT: false,
          synth: false
        };
      }
      
      return null;
    }
  }

  /**
   * Get multiple token details by addresses
   */
  async getMultipleTokenDetails(tokenAddresses: string[]): Promise<TokenDetails[]> {
    const promises = tokenAddresses.map(address => this.getTokenDetails(address));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<TokenDetails> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  /**
   * Get top 25 popular tokens from single API request (performance optimized)
   * Uses 1inch Token API v1.3 multi-chain endpoint: GET /token/v1.3/{chainId}
   */
  async getTop25PopularTokens(): Promise<Token[]> {
    try {
      console.log('🔥 Fetching top 25 popular tokens from 1inch API...');
      
      // Single API call to get supported tokens for Base mainnet
      const tokenList = await this.getSupportedTokens();
      
      if (tokenList?.tokens && Array.isArray(tokenList.tokens) && tokenList.tokens.length > 0) {
        const top25 = tokenList.tokens.slice(0, 25);
        console.log(`✅ Loaded ${top25.length} popular tokens from ${tokenList.tokens.length} total`);
        return top25;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch tokens from 1inch API, using fallback:', error);
    }
    
    // Fallback to hardcoded popular tokens (limited to prevent crashes)
    return POPULAR_BASE_MAINNET_TOKENS.slice(0, Math.min(25, POPULAR_BASE_MAINNET_TOKENS.length));
  }

  /**
   * Get popular tokens synchronously (immediate fallback)
   */
  getPopularTokensSync(): Token[] {
    return POPULAR_BASE_MAINNET_TOKENS;
  }

  /**
   * Validate token address format
   */
  isValidTokenAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Format token amount with proper decimals
   */
  formatTokenAmount(amount: string | number, decimals: number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0';
    
    // For very small amounts, show more precision
    if (num < 0.001) {
      return num.toFixed(Math.min(decimals, 8));
    }
    
    // For normal amounts, show reasonable precision
    return num.toFixed(Math.min(4, decimals));
  }

  /**
   * Get token logo URL with safe proxy fallback
   */
  getTokenLogoUrl(token: Token): string {
    if (token.logoURI && token.logoURI.startsWith('http')) {
      // Use image proxy to avoid CORB issues
      return `/api/proxy-image?url=${encodeURIComponent(token.logoURI)}`;
    }
    
    // Use a safe base64 encoded SVG fallback for tokens without logoURI
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMiAxdjJtMCAxOHYybTExLTEyaC0ybS0xOCAwaDIiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K';
  }

  /**
   * Check if token is a stablecoin
   */
  isStablecoin(token: Token): boolean {
    const stablecoinSymbols = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'LUSD'];
    return stablecoinSymbols.includes(token.symbol.toUpperCase()) || 
           token.tags?.includes('stablecoin') || false;
  }

  /**
   * Get current chain ID
   */
  getChainId(): number {
    return this.chainId;
  }

  /**
   * Set chain ID (for multi-chain support in the future)
   */
  setChainId(chainId: number): void {
    this.chainId = chainId;
  }
}

// Export singleton instance
export const tokenService = new TokenService();

// Export utility functions
export const formatTokenAmount = (amount: string | number, decimals: number): string => {
  return tokenService.formatTokenAmount(amount, decimals);
};

export const isValidTokenAddress = (address: string): boolean => {
  return tokenService.isValidTokenAddress(address);
};

export const getTokenLogoUrl = (token: Token): string => {
  return tokenService.getTokenLogoUrl(token);
};

export const isStablecoin = (token: Token): boolean => {
  return tokenService.isStablecoin(token);
};