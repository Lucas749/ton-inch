/**
 * 🪙 1inch Token API Service
 * 
 * This service integrates with the 1inch Token API to fetch token lists,
 * token details, and search for tokens by name, address, or symbol.
 * 
 * API Documentation: https://portal.1inch.dev/documentation/apis/tokens/introduction
 */

import { base } from 'viem/chains';

// 1inch Token API base URL
const TOKEN_API_BASE_URL = 'https://api.1inch.dev/token/v1.2';

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

// Popular tokens for Base Sepolia (testnet)
export const POPULAR_BASE_SEPOLIA_TOKENS: Token[] = [
  {
    address: '0x4200000000000000000000000000000000000006',
    chainId: 84532,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
    tags: ['tokens']
  },
  {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    chainId: 84532,
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86a33e6f8c2b9c9c2b4d0e0b4e4b4e4b4e4b4.png',
    tags: ['tokens', 'stablecoin']
  },
  {
    address: '0x2026c63430A1B526638bEF55Fea7174220cD3965',
    chainId: 84532,
    name: 'Test USDC',
    symbol: 'TestUSDC',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86a33e6f8c2b9c9c2b4d0e0b4e4b4e4b4e4b4.png',
    tags: ['tokens', 'test']
  }
];

class TokenService {
  private apiKey: string;
  private chainId: number;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_ONEINCH_API_KEY || '';
    this.chainId = base.id; // Base Sepolia
  }

  /**
   * Build query URL for Token API
   */
  private buildTokenQueryURL(path: string, params: Record<string, string> = {}): string {
    const url = new URL(`${TOKEN_API_BASE_URL}${path}`);
    
    // Add chainId to all requests
    params.chainId = this.chainId.toString();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
    
    return url.toString();
  }

  /**
   * Make API call to 1inch Token API
   */
  private async callTokenAPI<T>(
    path: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = this.buildTokenQueryURL(path, params);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`1inch Token API error (${response.status}): ${errorText}`);
    }

    return await response.json() as T;
  }

  /**
   * Get supported tokens for the current chain
   * Endpoint: GET /token/v1.2/{chainId}
   */
  async getSupportedTokens(): Promise<TokenList> {
    try {
      if (!this.apiKey) {
        console.warn('No 1inch API key provided, using fallback tokens');
        return {
          name: 'Base Sepolia Fallback Token List',
          logoURI: 'https://1inch.io/img/logo.svg',
          keywords: ['base', 'sepolia', 'testnet'],
          version: { major: 1, minor: 0, patch: 0 },
          timestamp: new Date().toISOString(),
          tokens: POPULAR_BASE_SEPOLIA_TOKENS
        };
      }

      const tokenList = await this.callTokenAPI<TokenList>(`/${this.chainId}`);
      return tokenList;
    } catch (error) {
      console.error('❌ Error fetching supported tokens:', error);
      // Fallback to popular tokens
      return {
        name: 'Base Sepolia Fallback Token List',
        logoURI: 'https://1inch.io/img/logo.svg',
        keywords: ['base', 'sepolia', 'testnet'],
        version: { major: 1, minor: 0, patch: 0 },
        timestamp: new Date().toISOString(),
        tokens: POPULAR_BASE_SEPOLIA_TOKENS
      };
    }
  }

  /**
   * Search for tokens by query (name, symbol, or address)
   * Endpoint: GET /token/v1.2/{chainId}/search
   */
  async searchTokens(query: string, limit: number = 20): Promise<TokenSearchResult[]> {
    try {
      if (!this.apiKey || !query.trim()) {
        // Fallback search in popular tokens
        const filtered = POPULAR_BASE_SEPOLIA_TOKENS.filter(token =>
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
      const filtered = POPULAR_BASE_SEPOLIA_TOKENS.filter(token =>
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
        const token = POPULAR_BASE_SEPOLIA_TOKENS.find(
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
      const token = POPULAR_BASE_SEPOLIA_TOKENS.find(
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
   * Get popular tokens for quick selection
   */
  getPopularTokens(): Token[] {
    return POPULAR_BASE_SEPOLIA_TOKENS;
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
   * Get token logo URL with fallback
   */
  getTokenLogoUrl(token: Token): string {
    if (token.logoURI) {
      return token.logoURI;
    }
    
    // Fallback to a generic token icon
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token.address}/logo.png`;
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