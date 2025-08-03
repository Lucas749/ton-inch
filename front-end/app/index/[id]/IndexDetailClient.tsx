"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft, 
  Plus,
  Activity,
  BarChart3,
  Loader2,
  RefreshCw,
  ArrowUpDown
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useOrders, OPERATORS } from "@/hooks/useOrders";
import { blockchainService, CONTRACTS } from "@/lib/blockchain-service";
import AlphaVantageService, { TimeSeriesResponse } from "@/lib/alphavantage-service";
import { RealIndicesService, RealIndexData } from "@/lib/real-indices-service";
import { formatIndexValueForDisplay, getIndexTypeInfo, getYAxisConfig } from "@/lib/blockchain-utils";
import { SwapBox } from "@/components/SwapBox";
import { AdminBox } from "@/components/AdminBox";
import { TokenSelector } from "@/components/TokenSelector";
import { Token, tokenService } from "@/lib/token-service";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ethers } from "ethers";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IndexDetailClientProps {
  indexData: any;
}

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

// Helper function to determine the correct AlphaVantage function and parameters based on symbol
const getAlphaVantageConfig = (symbol: string, indexId: string): any => {
  // Economic Indicators - use specific economic functions
  const economicIndicators: Record<string, any> = {
    'UNEMPLOYMENT': { function: 'UNEMPLOYMENT', isEconomic: true },
    'CPI': { function: 'CPI', isEconomic: true },
    'INFLATION': { function: 'INFLATION', isEconomic: true },
    'REAL_GDP': { function: 'REAL_GDP', isEconomic: true },
    'GDP': { function: 'REAL_GDP', isEconomic: true },
    'FEDERAL_FUNDS_RATE': { function: 'FEDERAL_FUNDS_RATE', isEconomic: true },
    'FFR': { function: 'FEDERAL_FUNDS_RATE', isEconomic: true },
    'TREASURY_YIELD': { function: 'TREASURY_YIELD', isEconomic: true },
    'YIELD': { function: 'TREASURY_YIELD', isEconomic: true }
  };

  // Crypto currencies - use DIGITAL_CURRENCY_DAILY
  const cryptoSymbols: Record<string, any> = {
    'BTCUSD': { function: 'DIGITAL_CURRENCY_DAILY', symbol: 'BTC', market: 'USD', isCrypto: true },
    'BTC': { function: 'DIGITAL_CURRENCY_DAILY', symbol: 'BTC', market: 'USD', isCrypto: true },
    'ETHUSD': { function: 'DIGITAL_CURRENCY_DAILY', symbol: 'ETH', market: 'USD', isCrypto: true },
    'ETH': { function: 'DIGITAL_CURRENCY_DAILY', symbol: 'ETH', market: 'USD', isCrypto: true }
  };

  // Forex pairs - use CURRENCY_EXCHANGE_RATE
  const forexPairs: Record<string, any> = {
    'EURUSD': { function: 'CURRENCY_EXCHANGE_RATE', from_currency: 'EUR', to_currency: 'USD', isForex: true },
    'GBPUSD': { function: 'CURRENCY_EXCHANGE_RATE', from_currency: 'GBP', to_currency: 'USD', isForex: true },
    'USDJPY': { function: 'CURRENCY_EXCHANGE_RATE', from_currency: 'USD', to_currency: 'JPY', isForex: true }
  };

  // Commodities - use specific commodity functions
  const commodities: Record<string, any> = {
    'WTI': { function: 'WTI', isCommodity: true },
    'BRENT': { function: 'BRENT', isCommodity: true },
    'NATURAL_GAS': { function: 'NATURAL_GAS', isCommodity: true },
    'WHEAT': { function: 'WHEAT', isCommodity: true },
    'CORN': { function: 'CORN', isCommodity: true },
    'GOLD': { function: 'GOLD', isCommodity: true },
    'SILVER': { function: 'SILVER', isCommodity: true },
    'COPPER': { function: 'COPPER', isCommodity: true }
  };

  // Intelligence functions
  const intelligence: Record<string, any> = {
    'GAINERS': { function: 'TOP_GAINERS_LOSERS', isIntelligence: true },
    'TOP_GAINERS': { function: 'TOP_GAINERS_LOSERS', isIntelligence: true }
  };

  // Check each category
  if (economicIndicators[symbol]) {
    return economicIndicators[symbol];
  }
  if (cryptoSymbols[symbol]) {
    return cryptoSymbols[symbol];
  }
  if (forexPairs[symbol]) {
    return forexPairs[symbol];
  }
  if (commodities[symbol]) {
    return commodities[symbol];
  }
  if (intelligence[symbol]) {
    return intelligence[symbol];
  }

  // Default to stock data using GLOBAL_QUOTE for real-time price, then TIME_SERIES_DAILY for chart
  return { function: 'TIME_SERIES_DAILY', symbol: symbol, isStock: true };
};

// Map index IDs to Alpha Vantage symbols - Enhanced for all index types
const getAlphaVantageSymbol = (indexId: string): string => {
  const symbolMap: Record<string, string> = {
    // Stocks
    'aapl_stock': 'AAPL',
    'AAPL_STOCK': 'AAPL',
    'msft_stock': 'MSFT',
    'MSFT_STOCK': 'MSFT', 
    'googl_stock': 'GOOGL',
    'GOOGL_STOCK': 'GOOGL',
    'amzn_stock': 'AMZN',
    'AMZN_STOCK': 'AMZN',
    'tsla_stock': 'TSLA',
    'TSLA_STOCK': 'TSLA',
    'meta_stock': 'META',
    'META_STOCK': 'META',
    'nvda_stock': 'NVDA',
    'NVDA_STOCK': 'NVDA',
    'spy_etf': 'SPY',
    'SPY_ETF': 'SPY',
    'vix_index': 'VIX',
    'VIX_INDEX': 'VIX',
    
    // Crypto
    'btc_price': 'BTCUSD',
    'BTC_PRICE': 'BTCUSD',
    'eth_price': 'ETHUSD',
    'ETH_PRICE': 'ETHUSD',
    
    // Forex
    'eur_usd': 'EURUSD',
    'EUR_USD': 'EURUSD',
    'gbp_usd': 'GBPUSD',
    'GBP_USD': 'GBPUSD',
    'usd_jpy': 'USDJPY',
    'USD_JPY': 'USDJPY',
    
    // Economic Indicators
    'us_gdp': 'GDP',
    'US_GDP': 'GDP',
    'us_inflation': 'CPI',
    'US_INFLATION': 'CPI',
    'unemployment': 'UNEMPLOYMENT',
    'UNEMPLOYMENT': 'UNEMPLOYMENT',
    'us_unemployment': 'UNEMPLOYMENT',
    'US_UNEMPLOYMENT': 'UNEMPLOYMENT',
    'fed_funds_rate': 'FFR',
    'FED_FUNDS_RATE': 'FFR',
    'treasury_yield': 'YIELD',
    'TREASURY_YIELD': 'YIELD',
    
    // Intelligence
    'top_gainers': 'GAINERS',
    'TOP_GAINERS': 'GAINERS',
    
    // Commodities
    'gold_price': 'GOLD',
    'GOLD_PRICE': 'GOLD',
    'wti_oil': 'WTI',
    'WTI_OIL': 'WTI',
    'brent_oil': 'BRENT',
    'BRENT_OIL': 'BRENT'
  };
  console.log(`🔍 Looking up symbol for indexId: "${indexId}", found: "${symbolMap[indexId] || 'IBM (default)'}"`);
  return symbolMap[indexId] || 'IBM'; // Default to IBM if not found
};

// Map index IDs to blockchain index IDs (supports both predefined and custom)
const getBlockchainIndexId = (indexId: string): number | null => {
  const indexMap: Record<string, number> = {
    // Market index mappings to predefined blockchain indices (0-5)
    'inflation_rate': 0,      // Inflation Rate
    'elon_followers': 1,      // Elon Followers
    'btc_price': 2,           // BTC Price (predefined)
    'vix_index': 3,           // VIX Index (predefined)
    'unemployment': 4,        // Unemployment Rate
    'tsla_stock': 5,          // Tesla Stock (predefined)
    
    // Fallback mappings for common market indices to custom indices
    'aapl_stock': 6,          // Apple (likely custom index)
    
    // Direct blockchain index support
    'blockchain_0': 0, 'blockchain_1': 1, 'blockchain_2': 2, 'blockchain_3': 3, 
    'blockchain_4': 4, 'blockchain_5': 5, 'blockchain_6': 6, 'blockchain_7': 7,
    'blockchain_8': 8, 'blockchain_9': 9, 'blockchain_10': 10, 'blockchain_11': 11, 'blockchain_12': 12
  };
  return indexMap[indexId] ?? null;
};

// Check if token should be skipped (stablecoins are always ~$1)
const shouldSkipToken = (tokenSymbol: string): boolean => {
  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'FDUSD'];
  return stablecoins.includes(tokenSymbol.toUpperCase());
};

export function IndexDetailClient({ indexData: index }: IndexDetailClientProps) {
  const router = useRouter();
  const [isRequestingIndex, setIsRequestingIndex] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<Array<{
    date: string;
    price: number;
    fromTokenPrice?: number;
    toTokenPrice?: number;
    close: number;
    high: number;
    low: number;
    open: number;
    volume: number;
  }>>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [realIndexData, setRealIndexData] = useState(index);
  
  // Oracle status for conditional orders
  const [oracleStatus, setOracleStatus] = useState<{
    hasOracle: boolean;
    oracleType: number;
    oracleTypeName: string;
    isChainlink: boolean;
    isMock: boolean;
    isActive: boolean;
    requiresActivation: boolean;
    canConfigureOracle: boolean;
    loading: boolean;
    error: string | null;
  }>({
    hasOracle: false,
    oracleType: 0,
    oracleTypeName: 'MOCK',
    isChainlink: false,
    isMock: true,
    isActive: false,
    requiresActivation: false,
    canConfigureOracle: true,
    loading: true,
    error: null
  });
  
  // Order creation form
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [orderForm, setOrderForm] = useState({
    description: "",
    fromAmount: "",
    toAmount: "",
    operator: OPERATORS.GT,
    threshold: "",
    expiry: "24" // hours
  });
  
  const { isConnected, walletAddress, indices: blockchainIndices, ethBalance, getTokenBalance, connectWallet, refreshIndices } = useBlockchain();

  // Auto-populate order description with index name when component loads
  useEffect(() => {
    if (realIndexData?.name && !orderForm.description) {
      // Use just the index name (e.g., "Bitcoin" becomes "bitcoin")
      const indexName = realIndexData.name.toLowerCase().replace(/\s+/g, '');
      setOrderForm(prev => ({ ...prev, description: indexName }));
    }
  }, [realIndexData?.name, orderForm.description]);
  
  // Token balances state
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [isApprovingToken, setIsApprovingToken] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<{[tokenAddress: string]: boolean}>({});
  const { createOrder, isLoading: isCreatingOrder } = useOrders();

  // Check oracle status for conditional orders
  const checkOracleStatus = async (blockchainIndexId: number) => {
    setOracleStatus(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log(`🔍 Checking oracle status for blockchain index ${blockchainIndexId}`);
      
      const response = await fetch(`/api/orders?action=check-oracle&indexId=${blockchainIndexId}`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Oracle status retrieved:`, data);
        setOracleStatus({
          hasOracle: data.hasOracle,
          oracleType: data.oracleType || 0,
          oracleTypeName: data.oracleTypeName || 'MOCK',
          isChainlink: data.isChainlink || false,
          isMock: data.isMock !== false,
          isActive: data.isActive || false,
          requiresActivation: data.requiresActivation || false,
          canConfigureOracle: data.canConfigureOracle !== false,
          loading: false,
          error: null
        });
      } else {
        throw new Error(data.message || 'Failed to check oracle status');
      }
    } catch (error: any) {
      console.error('❌ Oracle status check failed:', error);
      setOracleStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to check oracle status'
      }));
    }
  };

  // Initialize with popular tokens (crash-safe)
  useEffect(() => {
    try {
      const popularTokens = tokenService.getPopularTokensSync() || [];
      if (popularTokens.length >= 2 && !fromToken && !toToken) {
        // Safety check - ensure tokens have required properties
        const validTokens = popularTokens.filter(token => 
          token && token.address && token.symbol
        );
        
        if (validTokens.length >= 2) {
          setFromToken(validTokens[0]); // ETH
          setToToken(validTokens[1]); // WETH
        }
      }
    } catch (error) {
      console.error('❌ Error initializing order form tokens:', error);
    }
  }, [fromToken, toToken]);

  // Load token balances when tokens or wallet changes
  useEffect(() => {
    const loadTokenBalances = async () => {
      if (!isConnected || !walletAddress) return;
      
      const tokens = [fromToken, toToken].filter(Boolean);
      const balances: Record<string, string> = {};
      
      for (const token of tokens) {
        if (token) {
          try {
            if (token.symbol === 'ETH') {
              balances[token.address] = ethBalance || '0';
            } else {
              const balance = await getTokenBalance(token.address);
              balances[token.address] = balance;
            }
          } catch (error) {
            console.error(`Failed to get balance for ${token.symbol}:`, error);
            balances[token.address] = '0';
          }
        }
      }
      
      setTokenBalances(balances);
    };
    
    loadTokenBalances();
  }, [fromToken, toToken, isConnected, walletAddress, ethBalance, getTokenBalance]);

  // One-time wallet connection check on component mount
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkWalletConnection = () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        (window as any).ethereum.request({ method: 'eth_accounts' })
          .then((accounts: string[]) => {
            console.log('🔍 One-time wallet check:', { accounts, currentIsConnected: isConnected });
            // If we have accounts but React thinks we're not connected, there's a sync issue
            if (accounts.length > 0 && !isConnected) {
              console.log('🔄 Wallet connection state out of sync, will attempt reconnection...');
              // Delay reconnection to avoid race conditions
              timeoutId = setTimeout(() => {
                connectWallet().catch((error) => {
                  console.log('Manual wallet reconnection failed:', error);
                });
              }, 1000);
            }
          })
          .catch((error: any) => {
            console.log('Wallet check failed:', error);
          });
      }
    };

    // Check only once after component mount, with a delay to let wagmi settle
    const mountTimeout = setTimeout(checkWalletConnection, 500);

    return () => {
      clearTimeout(mountTimeout);
      if (timeoutId) clearTimeout(timeoutId);
    };
  // Only run once on mount - intentionally excluding dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check token approval status
  const checkTokenApproval = async (tokenAddress: string, amount: string) => {
    if (!isConnected || !walletAddress) return false;
    
    try {
      // Get the token contract
      const provider = (window as any).ethereum;
      const web3 = new (await import('web3')).Web3(provider);
      
      const tokenContract = new web3.eth.Contract([
        {
          "constant": true,
          "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}],
          "name": "allowance",
          "outputs": [{"name": "", "type": "uint256"}],
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [],
          "name": "decimals",
          "outputs": [{"name": "", "type": "uint8"}],
          "type": "function"
        }
      ], tokenAddress);
      
      const allowance = await tokenContract.methods.allowance(
        walletAddress,
        '0x111111125421cA6dc452d289314280a0f8842A65' // 1inch Limit Order Protocol
      ).call();
      
      // Get token decimals
      const decimals = await tokenContract.methods.decimals().call();
      const requiredAmount = ethers.utils.parseUnits(amount, Number(decimals));
      
      return ethers.BigNumber.from(String(allowance)).gte(requiredAmount);
      
    } catch (error) {
      console.error('Error checking approval:', error);
      return false;
    }
  };

  // Approve token spending
  const approveToken = async (tokenAddress: string, amount: string) => {
    console.log('🔍 Approve Token Debug:', { isConnected, walletAddress, tokenAddress });
    
    if (!isConnected) {
      alert('Please connect your wallet first');
      return false;
    }
    
    if (!walletAddress) {
      alert('Wallet address not available. Please reconnect your wallet.');
      return false;
    }

    setIsApprovingToken(true);
    
    try {
      const provider = (window as any).ethereum;
      const web3 = new (await import('web3')).Web3(provider);
      
      const tokenContract = new web3.eth.Contract([
        {
          "constant": false,
          "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
          "name": "approve",
          "outputs": [{"name": "", "type": "bool"}],
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [],
          "name": "decimals",
          "outputs": [{"name": "", "type": "uint8"}],
          "type": "function"
        }
      ], tokenAddress);
      
      // Get token decimals and approve max amount to avoid future approvals
      const decimals = await tokenContract.methods.decimals().call();
      const maxApproval = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'; // Max uint256
      
      const tx = await tokenContract.methods.approve(
        '0x111111125421cA6dc452d289314280a0f8842A65', // 1inch Limit Order Protocol
        maxApproval
      ).send({
        from: walletAddress,
        gas: '25000' // MetaMask-aggressive gas limit for Base L2
      });
      
      console.log('✅ Token approval successful:', tx.transactionHash);
      setApprovalStatus(prev => ({ ...prev, [tokenAddress]: true }));
      return true;
      
    } catch (error) {
      console.error('❌ Token approval failed:', error);
      alert('Token approval failed: ' + (error as Error).message);
      return false;
    } finally {
      setIsApprovingToken(false);
    }
  };
  
  // Check if this index exists on blockchain
  const blockchainIndexId = index.isBlockchainIndex 
    ? index.blockchainIndexId 
    : getBlockchainIndexId(index.id);
  const isAvailableOnBlockchain = blockchainIndexId !== null || index.isBlockchainIndex;
  const blockchainIndex = blockchainIndices.find(idx => idx.id === blockchainIndexId);

  // Load real index data from oracle API using useCallback
  const loadRealIndexData = useCallback(async (indexId: number) => {
    try {
      console.log(`🔍 Loading real index data for blockchain index ${indexId} from oracle API...`);
      
      const response = await fetch(`/api/oracle?action=get-index-by-id&indexId=${indexId}`);
      const oracleData = await response.json();
      
      if (oracleData.success && oracleData.index) {
        const indexData = oracleData.index;
        console.log(`✅ Got real index data from oracle:`, indexData);
        
        // Determine avatar and color based on category or type
        let avatar = "🔗";
        let color = "bg-purple-600";
        
        if (indexData.category === 'Commodities') {
          avatar = indexData.name.toLowerCase().includes('corn') ? '🌽' : 
                   indexData.name.toLowerCase().includes('wheat') ? '🌾' :
                   indexData.name.toLowerCase().includes('oil') ? '🛢️' : 
                   indexData.name.toLowerCase().includes('gold') ? '🥇' : '📊';
          color = "bg-yellow-600";
        } else if (indexData.category === 'Stocks') {
          avatar = "📈";
          color = "bg-blue-500";
        } else if (indexData.category === 'Crypto') {
          avatar = "₿";
          color = "bg-orange-500";
        } else if (indexData.category === 'Forex') {
          avatar = "💱";
          color = "bg-green-500";
        } else if (indexData.category === 'Economics') {
          avatar = "📊";
          color = "bg-indigo-600";
        }
        
        // Update real index data with oracle data, detecting category from source URL if not provided
        let detectedCategory = indexData.category || 'Custom';
        if (!indexData.category && indexData.sourceUrl) {
          const url = indexData.sourceUrl.toLowerCase();
          if (url.includes('global_quote') || url.includes('time_series_daily')) {
            detectedCategory = 'Stocks';
          } else if (url.includes('digital_currency')) {
            detectedCategory = 'Crypto';
          } else if (url.includes('fx_daily')) {
            detectedCategory = 'Forex';
          } else if (url.includes('corn') || url.includes('wheat') || url.includes('wti') || url.includes('brent') || url.includes('gold') || url.includes('silver')) {
            detectedCategory = 'Commodities';
          } else if (url.includes('gdp') || url.includes('inflation') || url.includes('unemployment') || url.includes('cpi')) {
            detectedCategory = 'Economics';
          }
        }

        setRealIndexData((prev: any) => ({
          ...prev,
          name: indexData.name, // This will be "Corn" if parsed from sourceUrl, or "Custom Index 15" if not
          symbol: indexData.symbol,
          avatar: avatar,
          color: color,
          category: detectedCategory,
          description: `${indexData.name} • ${indexData.isActive ? 'Active' : 'Inactive'} • Oracle: ${indexData.oracleType === 0 ? 'Mock' : 'Chainlink'}`,
          sourceUrl: indexData.sourceUrl,
          isActive: indexData.isActive,
          creator: indexData.creator,
          oracleType: indexData.oracleType,
          blockchainValue: indexData.value,
          blockchainTimestamp: indexData.timestamp
        }));
        
        console.log(`🎯 Updated realIndexData with: ${indexData.name} (${indexData.isActive ? 'Active' : 'Inactive'})`);
      } else {
        console.warn(`⚠️  Failed to get oracle data for index ${indexId}:`, oracleData.error);
      }
    } catch (error) {
      console.error(`❌ Error loading real index data for index ${indexId}:`, error);
    }
  }, []);

  // Update realIndexData with blockchain parsed names when available
  useEffect(() => {
    if (blockchainIndex && blockchainIndex.name && !blockchainIndex.name.startsWith('Custom Index')) {
      console.log(`🔄 Using old blockchain index data: ${blockchainIndex.name}`);
      setRealIndexData((prev: any) => ({
        ...prev,
        name: blockchainIndex.name,
        symbol: (blockchainIndex as any).symbol || prev.symbol,
        avatar: (blockchainIndex as any).avatar || prev.avatar,
        color: (blockchainIndex as any).color || prev.color,  
        category: (blockchainIndex as any).category || prev.category,
        description: (blockchainIndex as any).description || prev.description,
        sourceUrl: (blockchainIndex as any).sourceUrl || prev.sourceUrl
      }));
    } else if (blockchainIndexId !== null) {
      // For custom indices or when blockchain index name starts with "Custom Index", 
      // use the oracle API to get the real data with proper name parsing
      console.log(`🔄 Loading real index data via oracle API for index ${blockchainIndexId}...`);
      loadRealIndexData(blockchainIndexId);
    }
  }, [blockchainIndex, blockchainIndexId, loadRealIndexData]);

  // Check oracle status when blockchain index is available
  useEffect(() => {
    if (blockchainIndexId !== null && isAvailableOnBlockchain) {
      console.log(`🔍 Index is available on blockchain with ID ${blockchainIndexId}, checking oracle status...`);
      checkOracleStatus(blockchainIndexId);
    }
  }, [blockchainIndexId, isAvailableOnBlockchain]);

  // Helper function to format values based on data type
  const getFormattedValue = (value: number, symbol: string, category: string, indexId: string): string => {
    // Economic indicators should show as percentages or rates
    if (category === 'Economics' || 
        symbol?.match(/UNEMPLOYMENT|INFLATION|CPI|FEDERAL_FUNDS_RATE|TREASURY_YIELD|GDP|RATE/i) ||
        indexId?.match(/unemployment|inflation|cpi|federal|treasury|gdp|rate/i)) {
      
      // Special formatting for different economic indicators
      if (symbol?.match(/GDP|REAL_GDP/i) || indexId?.match(/gdp/i)) {
        // GDP in trillions
        return value >= 1000 ? `$${(value / 1000).toFixed(1)}T` : `$${value.toFixed(0)}B`;
      } else if (symbol?.match(/UNEMPLOYMENT|INFLATION|FEDERAL_FUNDS_RATE|TREASURY_YIELD|CPI/i) ||
                 indexId?.match(/unemployment|inflation|federal|treasury|cpi/i)) {
        // Rates and percentages
        return `${value.toFixed(2)}%`;
      }
    }
    
    // Forex pairs should show with more decimal places
    if (category === 'Forex' || symbol?.match(/USD|EUR|GBP|JPY/i)) {
      return value.toFixed(4);
    }
    
    // Crypto should show with appropriate decimal places
    if (category === 'Crypto' || symbol?.match(/BTC|ETH|1INCH/i)) {
      return value >= 1000 ? 
        `$${(value / 1000).toFixed(1)}K` :
        value >= 1 ?
        `$${value.toFixed(2)}` :
        `$${value.toFixed(6)}`;
    }
    
    // Commodities - format based on typical ranges
    if (category === 'Commodities' || symbol?.match(/CORN|WHEAT|WTI|BRENT|GOLD|SILVER|COPPER|NATURAL_GAS/i)) {
      if (symbol?.match(/CORN|WHEAT/i)) {
        return `$${value.toFixed(2)}/bu`; // Per bushel
      } else if (symbol?.match(/WTI|BRENT/i)) {
        return `$${value.toFixed(2)}/bbl`; // Per barrel
      } else if (symbol?.match(/GOLD|SILVER|COPPER/i)) {
        return `$${value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toFixed(2)}/oz`;
      } else if (symbol?.match(/NATURAL_GAS/i)) {
        return `$${value.toFixed(2)}/MMBtu`;
      }
      return `$${value.toFixed(2)}`;
    }
    
    // Default stock/ETF formatting
    return value >= 1000 ? 
      `$${(value / 1000).toFixed(1)}K` :
      value >= 1 ?
      `$${value.toFixed(2)}` :
      `$${value.toFixed(4)}`;
  };

  // Load current price from Alpha Vantage (prioritized) or blockchain
  const loadCurrentPrice = async () => {
    try {
      let currentPrice: number | null = null;
      let priceChange: string | null = null;
      let isPositive = true;

      // PRIORITY 1: Handle predefined indices directly using smart routing 
      let symbol = index.symbol;
      const category = index.category;
      
      // Extract correct symbol from index data
      if (index.id.includes('_STOCK')) {
        // For stock indices like "amzn_stock", extract "AMZN"
        symbol = index.id.split('_')[0].toUpperCase();
      } else if (index.symbol && index.symbol.includes('STOCK')) {
        // For symbols like "AMZNSTOCK", extract "AMZN"
        symbol = index.symbol.replace(/STOCK$/i, '');
      }
      
      console.log(`🔍 Symbol extraction: ${index.id} -> ${index.symbol} -> ${symbol}`);
      
      if (symbol && (category || index.id.includes('_STOCK') || index.id.includes('_'))) {
        try {
          console.log(`🎯 SMART PRICE LOADING: ${symbol} (${category})`);
          
          // Use the same smart routing logic as elsewhere
          if (category === 'Stocks' || index.id.includes('_STOCK')) {
            // Stock data via TIME_SERIES_DAILY
            const apiResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact`);
            const stockData = await apiResponse.json();
            
            if (apiResponse.ok && stockData?.['Time Series (Daily)']) {
              const timeSeries = stockData['Time Series (Daily)'];
              const dates = Object.keys(timeSeries).sort().reverse();
              
              if (dates.length > 0) {
                const latestData = timeSeries[dates[0]];
                currentPrice = parseFloat(latestData['4. close']);
                console.log(`💰 STOCK PRICE: ${symbol} = $${currentPrice}`);
                
                if (dates.length > 1) {
                  const prevData = timeSeries[dates[1]];
                  const prevPrice = parseFloat(prevData['4. close']);
                  if (prevPrice) {
                    priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                    isPositive = currentPrice >= prevPrice;
                  }
                }
              }
            }
          } else if (category === 'Crypto' || symbol.match(/BTC|ETH|1INCH/i)) {
            // Crypto data via DIGITAL_CURRENCY_DAILY
            const apiResponse = await fetch(`/api/alphavantage?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD`);
            const cryptoData = await apiResponse.json();
            
            if (apiResponse.ok && cryptoData?.data && cryptoData.data.length > 0) {
              currentPrice = Number(cryptoData.data[0].close);
              console.log(`💰 CRYPTO PRICE: ${symbol} = $${currentPrice}`);
              
              if (cryptoData.data.length > 1) {
                const prevPrice = Number(cryptoData.data[1].close);
                if (prevPrice) {
                  priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                  isPositive = currentPrice >= prevPrice;
                }
              }
            }
          } else if (category === 'Forex' || symbol.match(/USD|EUR|GBP/i)) {
            // Forex data via FX_DAILY
            const apiResponse = await fetch(`/api/alphavantage?function=FX_DAILY&from_symbol=${symbol.slice(0,3)}&to_symbol=${symbol.slice(3,6) || 'USD'}`);
            const fxData = await apiResponse.json();
            
            if (apiResponse.ok && fxData?.data && fxData.data.length > 0) {
              currentPrice = Number(fxData.data[0].close);
              console.log(`💰 FOREX PRICE: ${symbol} = $${currentPrice}`);
              
              if (fxData.data.length > 1) {
                const prevPrice = Number(fxData.data[1].close);
                if (prevPrice) {
                  priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                  isPositive = currentPrice >= prevPrice;
                }
              }
            }
          } else if (category === 'Commodities' || symbol.match(/CORN|WHEAT|WTI|BRENT|GOLD|SILVER|COPPER|NATURAL_GAS/i)) {
            // Commodity data - map symbols to correct function names  
            let functionName = symbol.toUpperCase();
            if (symbol.match(/NATURAL_GAS/i)) functionName = 'NATURAL_GAS';
            else if (symbol.match(/WTI/i)) functionName = 'WTI';
            else if (symbol.match(/BRENT/i)) functionName = 'BRENT';
            
            const apiResponse = await fetch(`/api/alphavantage?function=${functionName}`);
            const commodityData = await apiResponse.json();
            
            if (apiResponse.ok && commodityData?.data && commodityData.data.length > 0) {
              currentPrice = Number(commodityData.data[0]?.value || commodityData.data[0]?.close);
              console.log(`💰 COMMODITY PRICE: ${symbol} = $${currentPrice}`);
              
              if (commodityData.data.length > 1) {
                const prevPrice = Number(commodityData.data[1]?.value || commodityData.data[1]?.close);
                if (prevPrice) {
                  priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                  isPositive = currentPrice >= prevPrice;
                }
              }
            }
          } else if (category === 'Economics' || symbol.match(/GDP|INFLATION|UNEMPLOYMENT|CPI|FEDERAL|TREASURY/i)) {
            // Economic indicators - map symbols to correct function names
            let functionName = symbol.toUpperCase();
            if (symbol.match(/UNEMPLOYMENT/i)) functionName = 'UNEMPLOYMENT';
            else if (symbol.match(/INFLATION|CPI/i)) functionName = 'CPI';
            else if (symbol.match(/GDP|REAL_GDP/i)) functionName = 'REAL_GDP';
            else if (symbol.match(/FEDERAL_FUNDS_RATE|FEDERAL/i)) functionName = 'FEDERAL_FUNDS_RATE';
            else if (symbol.match(/TREASURY_YIELD|TREASURY/i)) functionName = 'TREASURY_YIELD';
            
            const apiResponse = await fetch(`/api/alphavantage?function=${functionName}`);
            const economicData = await apiResponse.json();
            
            if (apiResponse.ok && economicData?.data && economicData.data.length > 0) {
              currentPrice = Number(economicData.data[0].value);
              console.log(`💰 ECONOMIC PRICE: ${symbol} = ${currentPrice}`);
              
              if (economicData.data.length > 1) {
                const prevPrice = Number(economicData.data[1].value);
                if (prevPrice) {
                  priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                  isPositive = currentPrice >= prevPrice;
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Smart price loading failed for ${symbol}:`, error);
        }
      }

      // PRIORITY 2: Try Alpha Vantage using blockchain sourceUrl (for custom indices)
      if (currentPrice === null && blockchainIndex && (blockchainIndex as any).sourceUrl && (blockchainIndex as any).sourceUrl.includes('alphavantage.co')) {
        try {
          const url = new URL((blockchainIndex as any).sourceUrl);
          const alphaVantageFunction = url.searchParams.get('function');
          const alphaVantageSymbol = url.searchParams.get('symbol');
          
          if (alphaVantageFunction && alphaVantageSymbol) {
            const alphaVantageService = new AlphaVantageService({ apiKey: process.env.NEXT_PUBLIC_ALPHAVANTAGE || "123" });
            
            // Handle different Alpha Vantage functions
            if (alphaVantageFunction === 'CORN' && alphaVantageSymbol === 'WTI') {
              const cornData = await alphaVantageService.getCorn();
              if (cornData && (cornData as any).data && (cornData as any).data.length > 0) {
                currentPrice = Number((cornData as any).data[0].value);
                if ((cornData as any).data.length > 1) {
                  const prevPrice = Number((cornData as any).data[1].value);
                  priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                  isPositive = currentPrice >= prevPrice;
                }
              }
            } else if (alphaVantageFunction === 'EARNINGS_ESTIMATES') {
              const earningsData = await (alphaVantageService as any).getEarningsEstimates(alphaVantageSymbol);
              if (earningsData && earningsData.quarterlyEarnings && earningsData.quarterlyEarnings.length > 0) {
                const latest = earningsData.quarterlyEarnings[0];
                currentPrice = latest.estimatedEarningsPerShare;
                // For earnings, show the revision as change
                priceChange = latest.numberOfEstimatesRevisions > 0 ? '+' + latest.numberOfEstimatesRevisions : latest.numberOfEstimatesRevisions;
              }
            } else if (alphaVantageFunction === 'GLOBAL_QUOTE') {
              const quoteData = await (alphaVantageService as any).getGlobalQuote(alphaVantageSymbol);
              if (quoteData && quoteData['Global Quote']) {
                const quote = quoteData['Global Quote'];
                currentPrice = parseFloat(quote['05. price']);
                priceChange = quote['10. change percent'].replace('%', '');
                isPositive = !quote['10. change percent'].startsWith('-');
              }
            } else if (alphaVantageFunction === 'DIGITAL_CURRENCY_DAILY') {
              const cryptoData = await alphaVantageService.getCryptoTimeSeries(alphaVantageSymbol);
              if (cryptoData && (cryptoData as any).data && (cryptoData as any).data.length > 0) {
                currentPrice = Number((cryptoData as any).data[0].close);
                if ((cryptoData as any).data.length > 1) {
                  const prevPrice = Number((cryptoData as any).data[1].close);
                  priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                  isPositive = currentPrice >= prevPrice;
                }
              }
            } else if (alphaVantageFunction === 'FX_DAILY') {
              const fxData = await alphaVantageService.getDailyTimeSeries(alphaVantageSymbol);
              if (fxData && (fxData as any).data && (fxData as any).data.length > 0) {
                currentPrice = Number((fxData as any).data[0].close);
                if ((fxData as any).data.length > 1) {
                  const prevPrice = Number((fxData as any).data[1].close);
                  priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                  isPositive = currentPrice >= prevPrice;
                }
              }
            } else if (['GDP', 'INFLATION', 'UNEMPLOYMENT', 'FEDERAL_FUNDS_RATE', 'TREASURY_YIELD', 'CPI', 'RETAIL_SALES', 'DURABLES', 'CONSUMER_SENTIMENT'].includes(alphaVantageFunction)) {
              // Economic indicator functions - use cached API route
              console.log(`📈 Fetching economic data for: ${alphaVantageFunction} via cached API`);
              let economicResponse: any;
              let parsedData: any;
              
              const apiResponse = await fetch(`/api/alphavantage?function=${alphaVantageFunction}`);
              economicResponse = await apiResponse.json();
              
              if (!apiResponse.ok) {
                console.warn(`Failed to fetch economic data for ${alphaVantageFunction}, falling back to SPY`);
                // For economic indicators, fallback to SPY data
                const fallbackResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact`);
                const fallbackData = await fallbackResponse.json();
                if (!fallbackResponse.ok) throw new Error((fallbackData as any)?.error || 'Failed to fetch fallback data');
                parsedData = AlphaVantageService.parseTimeSeriesData(fallbackData);
              } else {
                // Parse economic indicator data using the correct parser
                parsedData = AlphaVantageService.parseEconomicIndicatorData(economicResponse);
              }
              
              // Set price from parsed data
              if (parsedData && parsedData.length > 0) {
                currentPrice = Number(parsedData[0]?.close || parsedData[0]?.value);
                if (parsedData.length > 1 && currentPrice) {
                  const prevPrice = Number(parsedData[1]?.close || parsedData[1]?.value);
                  if (prevPrice) {
                    priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                    isPositive = currentPrice >= prevPrice;
                  }
                }
              }
            } else if (['CORN', 'WHEAT', 'WTI', 'BRENT', 'NATURAL_GAS', 'COPPER', 'ALUMINUM', 'ZINC', 'NICKEL', 'GOLD', 'SILVER'].includes(alphaVantageFunction)) {
              // Commodity functions - use cached API route
              console.log(`�� Fetching commodity data for: ${alphaVantageFunction} via cached API`);
              let commodityResponse: any;
              
              const apiResponse = await fetch(`/api/alphavantage?function=${alphaVantageFunction}`);
              commodityResponse = await apiResponse.json();
              
              if (!apiResponse.ok) {
                console.warn(`Failed to fetch commodity data for ${alphaVantageFunction}, falling back to SPY`);
                // For other commodities, fallback to SPY data
                const fallbackResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact`);
                response = await fallbackResponse.json();
                if (!fallbackResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch fallback data');
                parsedData = AlphaVantageService.parseTimeSeriesData(response!);
              } else {
                parsedData = AlphaVantageService.parseTimeSeriesData(commodityResponse);
              }
            } else {
              // Fallback to stock data - DIRECT FIX for stock prices
              console.log(`📈 DIRECT FIX: fetching stock data for: ${alphaVantageSymbol}`);
              const apiResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=${alphaVantageSymbol}&outputsize=compact`);
              const stockData = await apiResponse.json();
              
              if (apiResponse.ok && stockData && stockData['Time Series (Daily)']) {
                // Direct extraction - bypass parsing complexity
                const timeSeries = stockData['Time Series (Daily)'];
                const dates = Object.keys(timeSeries).sort().reverse(); // Most recent first
                
                if (dates.length > 0) {
                  const latestData = timeSeries[dates[0]];
                  currentPrice = parseFloat(latestData['4. close']);
                  console.log(`💰 DIRECT: Set currentPrice to ${currentPrice} from ${dates[0]}`);
                  
                  if (dates.length > 1) {
                    const prevData = timeSeries[dates[1]];
                    const prevPrice = parseFloat(prevData['4. close']);
                    if (prevPrice) {
                      priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                      isPositive = currentPrice >= prevPrice;
                    }
                  }
                } else {
                  console.warn(`⚠️ No time series data for ${alphaVantageSymbol}`);
                }
              } else {
                console.error(`❌ Failed to fetch stock data for ${alphaVantageSymbol}`, stockData);
              }
            }
          }
        } catch (alphaVantageError) {
          console.error("Error fetching Alpha Vantage data:", alphaVantageError);
        }
      }

      // Priority 2: Handle predefined stock indices directly 
      if (currentPrice === null && index.symbol && (index.category === 'Stocks' || index.id.includes('_STOCK'))) {
        try {
          console.log(`💪 DIRECT STOCK FETCH: ${index.symbol}`);
          const apiResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=${index.symbol}&outputsize=compact`);
          const stockData = await apiResponse.json();
          
          if (apiResponse.ok && stockData && stockData['Time Series (Daily)']) {
            const timeSeries = stockData['Time Series (Daily)'];
            const dates = Object.keys(timeSeries).sort().reverse(); // Most recent first
            
            if (dates.length > 0) {
              const latestData = timeSeries[dates[0]];
              currentPrice = parseFloat(latestData['4. close']);
              console.log(`💰 STOCK PRICE SET: ${index.symbol} = $${currentPrice}`);
              
              if (dates.length > 1) {
                const prevData = timeSeries[dates[1]];
                const prevPrice = parseFloat(prevData['4. close']);
                if (prevPrice) {
                  priceChange = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
                  isPositive = currentPrice >= prevPrice;
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Direct stock fetch failed for ${index.symbol}:`, error);
        }
      }

      // Priority 3: Fallback to blockchain value
      if (currentPrice === null && blockchainIndex && blockchainIndex.value) {
        currentPrice = Number(blockchainIndex.value);
        // For blockchain data, we don't have historical data for change calculation
        priceChange = null;
      }

      // Update the price display if we found current data
      if (currentPrice !== null) {
        setRealIndexData((prev: any) => ({
          ...prev,
          price: currentPrice,
          valueLabel: blockchainIndexId !== null 
            ? formatIndexValueForDisplay(blockchainIndexId, currentPrice!)
            : getFormattedValue(currentPrice!, symbol, category, index.id)
        }));
      } else {
        // Fallback to ensure we always show some price value
        const fallbackPrice = blockchainIndex?.value ? Number(blockchainIndex.value) : 100;
        setRealIndexData((prev: any) => ({
          ...prev,
          price: fallbackPrice,
          valueLabel: blockchainIndexId !== null 
            ? formatIndexValueForDisplay(blockchainIndexId, fallbackPrice)
            : getFormattedValue(fallbackPrice, symbol, category, index.id)
        }));
      }

    } catch (error) {
      console.error("Error loading current price:", error);
    }
  };

  // Load real Alpha Vantage data for this index (fallback for predefined indices)
  const loadAlphaVantageIndexData = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALPHAVANTAGE || "123";
      const realIndicesService = new RealIndicesService(apiKey);
      const realIndices = await realIndicesService.getAllRealIndices();
      
      // Find the real data for this index
      const realData = realIndices.find(idx => idx.id === index.id);
      if (realData) {
        setRealIndexData(realData);
      }
    } catch (error) {
      console.error("Error loading real index data:", error);
    }
  };

  // Load historical chart data
  const loadChartData = async () => {
    // Always start with smart routing for all indices
    let symbol = getAlphaVantageSymbol(index.id);
    let useRealAlphaVantageData = false;
    let alphaVantageFunction = null;
    let alphaVantageSymbol = null;
    
    // ALWAYS apply smart routing first - this ensures correct API calls for all data types
    const config = getAlphaVantageConfig(symbol, index.id);
    console.log(`🧠 Smart routing for ${index.id} - Symbol: ${symbol}, Config:`, config);

    if (config.isEconomic || config.isCrypto || config.isForex || config.isCommodity || config.isIntelligence) {
      // Use smart routing configuration for all non-stock data types
      alphaVantageFunction = config.function;
      alphaVantageSymbol = config.symbol || null;
      useRealAlphaVantageData = true;
      
      console.log(`✅ Smart routing applied: function=${alphaVantageFunction}, symbol=${alphaVantageSymbol}`);
      
      // Set symbol for API calls based on data type
      if (config.isEconomic || config.isCommodity || config.isIntelligence) {
        // For these types, the function name IS the symbol/identifier
        symbol = config.function;
      } else if (config.isCrypto) {
        symbol = config.symbol;
      } else if (config.isForex) {
        symbol = `${config.from_currency}${config.to_currency}`;
      }
    } else if (blockchainIndex && (blockchainIndex as any).sourceUrl && (blockchainIndex as any).sourceUrl.includes('alphavantage.co')) {
      // Only fallback to blockchain sourceUrl for stocks
      try {
        const url = new URL((blockchainIndex as any).sourceUrl);
        const originalFunction = url.searchParams.get('function');
        const originalSymbol = url.searchParams.get('symbol');
        
        console.log(`📋 Using blockchain sourceUrl for stock: ${originalFunction}/${originalSymbol}`);
        
        alphaVantageFunction = originalFunction;
        alphaVantageSymbol = originalSymbol;
        useRealAlphaVantageData = true;
        
        if (originalSymbol) {
          symbol = originalSymbol;
        } else if (originalFunction) {
          symbol = originalFunction;
        }
        
      } catch (error) {
        console.warn('Could not parse blockchain index sourceUrl:', error);
      }
    }
    
    // Check which tokens we can fetch data for
    const canFetchFromToken = fromToken && !shouldSkipToken(fromToken.symbol);
    const canFetchToToken = toToken && !shouldSkipToken(toToken.symbol);
    
    // Check if tokens are stablecoins (we'll show flat $1 lines for these)
    const fromTokenIsStablecoin = fromToken && shouldSkipToken(fromToken.symbol);
    const toTokenIsStablecoin = toToken && shouldSkipToken(toToken.symbol);
    
    try {
      setIsLoadingChart(true);
      setChartError(null);
      
      console.log(`🔍 Loading chart data for ${symbol} (${index.name}) via cached API route`);
      if (canFetchFromToken) {
        console.log(`🔗 Loading fromToken data: ${fromToken?.symbol}`);
      }
      if (canFetchToToken) {
        console.log(`🔗 Loading toToken data: ${toToken?.symbol}`);
      }
      if (!canFetchFromToken && !canFetchToToken && !fromTokenIsStablecoin && !toTokenIsStablecoin) {
        console.log(`🔗 No Alpha Vantage data available for selected tokens`);
      }
      if (fromTokenIsStablecoin || toTokenIsStablecoin) {
        console.log(`🔗 Stablecoin detected - will show flat $1 line for: ${fromTokenIsStablecoin ? fromToken?.symbol : ''}${fromTokenIsStablecoin && toTokenIsStablecoin ? ', ' : ''}${toTokenIsStablecoin ? toToken?.symbol : ''}`);
      }

      // Helper function to generate flat stablecoin data (always $1)
      const generateStablecoinData = (days: number = 90) => {
        return Array.from({ length: days }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (days - 1 - i));
          return {
            date: date.toISOString().split('T')[0],
            open: 1.00,
            high: 1.00,
            low: 1.00,
            close: 1.00,
            volume: 1000000 // Mock volume for stablecoins
          };
        });
      };

      // Helper function to fetch token price data using cached API route
      const fetchTokenData = async (tokenSymbol: string) => {
        try {
          // Map wrapped tokens to their base tokens for Alpha Vantage
          const alphaVantageSymbol = tokenSymbol === 'WETH' ? 'ETH' : 
                                   tokenSymbol === 'WBTC' ? 'BTC' : 
                                   tokenSymbol;
          
          console.log(`📈 Fetching crypto data for ${tokenSymbol} (using ${alphaVantageSymbol}) via cached API`);
          // Use cached API route for crypto data
          const response = await fetch(`/api/alphavantage?function=DIGITAL_CURRENCY_DAILY&symbol=${alphaVantageSymbol}&market=USD`);
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch crypto data');
          }
          
          return AlphaVantageService.parseTimeSeriesData(data);
        } catch (error) {
          console.warn(`⚠️ Could not load crypto data for ${tokenSymbol}:`, error);
          return [];
        }
      };
      
      // Determine the appropriate API call based on Alpha Vantage function or symbol type
      let response: TimeSeriesResponse | undefined;
      let parsedData: Array<{
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>;

      // Use real Alpha Vantage function if available
      if (useRealAlphaVantageData && alphaVantageFunction) {
        console.log(`📊 Making cached Alpha Vantage API call with function: ${alphaVantageFunction}`);
        
        if (alphaVantageFunction === 'EARNINGS_ESTIMATES' && alphaVantageSymbol) {
          // For earnings estimates, fallback to stock price data
          console.log(`📈 Fetching stock data for earnings symbol: ${alphaVantageSymbol} via cached API`);
          const apiResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=${alphaVantageSymbol}&outputsize=compact`);
          response = await apiResponse.json();
          if (!apiResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch stock data');
          parsedData = AlphaVantageService.parseTimeSeriesData(response!);
        } else if (alphaVantageFunction === 'GLOBAL_QUOTE' && alphaVantageSymbol) {
          // Stock quote - use daily time series
          console.log(`📈 Fetching stock data for: ${alphaVantageSymbol} via cached API`);
          const apiResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=${alphaVantageSymbol}&outputsize=compact`);
          response = await apiResponse.json();
          if (!apiResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch stock data');
          parsedData = AlphaVantageService.parseTimeSeriesData(response!);
        } else if (alphaVantageFunction === 'DIGITAL_CURRENCY_DAILY' && alphaVantageSymbol) {
          // Crypto currency
          console.log(`📈 Fetching crypto data for: ${alphaVantageSymbol} via cached API`);
          const apiResponse = await fetch(`/api/alphavantage?function=DIGITAL_CURRENCY_DAILY&symbol=${alphaVantageSymbol}&market=USD`);
          const cryptoResponse = await apiResponse.json();
          if (!apiResponse.ok) throw new Error(cryptoResponse.error || 'Failed to fetch crypto data');
          parsedData = AlphaVantageService.parseTimeSeriesData(cryptoResponse);
        } else if (['GDP', 'INFLATION', 'UNEMPLOYMENT', 'FEDERAL_FUNDS_RATE', 'TREASURY_YIELD', 'CPI', 'RETAIL_SALES', 'DURABLES', 'CONSUMER_SENTIMENT'].includes(alphaVantageFunction)) {
          // Economic indicator functions - use cached API route
          console.log(`📈 Fetching economic data for: ${alphaVantageFunction} via cached API`);
          const apiResponse = await fetch(`/api/alphavantage?function=${alphaVantageFunction}`);
          const economicResponse = await apiResponse.json();
          
          if (!apiResponse.ok) {
            console.warn(`Failed to fetch economic data for ${alphaVantageFunction}, falling back to SPY`);
            // For economic indicators, fallback to SPY data
            const fallbackResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact`);
            response = await fallbackResponse.json();
            if (!fallbackResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch fallback data');
            parsedData = AlphaVantageService.parseTimeSeriesData(response!);
          } else {
            // Parse economic indicator data using the correct parser
            parsedData = AlphaVantageService.parseEconomicIndicatorData(economicResponse);
          }
        } else if (['CORN', 'WHEAT', 'WTI', 'BRENT', 'NATURAL_GAS', 'COPPER', 'ALUMINUM', 'ZINC', 'NICKEL', 'GOLD', 'SILVER'].includes(alphaVantageFunction)) {
          // Commodity functions - use cached API route
          console.log(`📈 Fetching commodity data for: ${alphaVantageFunction} via cached API`);
          let commodityResponse: any;
          
          const apiResponse = await fetch(`/api/alphavantage?function=${alphaVantageFunction}`);
          commodityResponse = await apiResponse.json();
          
          if (!apiResponse.ok) {
            console.warn(`Failed to fetch commodity data for ${alphaVantageFunction}, falling back to SPY`);
            // For other commodities, fallback to SPY data
            const fallbackResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact`);
            response = await fallbackResponse.json();
            if (!fallbackResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch fallback data');
            parsedData = AlphaVantageService.parseTimeSeriesData(response!);
          } else {
            parsedData = AlphaVantageService.parseTimeSeriesData(commodityResponse);
          }
        } else {
          // Use intelligent routing based on symbol type
          const config = getAlphaVantageConfig(symbol, index.id);
          console.log(`📈 Smart routing for symbol: ${symbol}, config:`, config);
          
          if (config.isEconomic) {
            // Economic indicators
            console.log(`📈 Fetching economic data for: ${config.function} via cached API`);
            const apiResponse = await fetch(`/api/alphavantage?function=${config.function}`);
            const economicResponse = await apiResponse.json();
            
            if (!apiResponse.ok) {
              console.warn(`Failed to fetch economic data for ${config.function}, falling back to SPY`);
              const fallbackResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact`);
              response = await fallbackResponse.json();
              if (!fallbackResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch fallback data');
              parsedData = AlphaVantageService.parseTimeSeriesData(response!);
            } else {
              parsedData = AlphaVantageService.parseEconomicIndicatorData(economicResponse);
            }
          } else if (config.isCrypto) {
            // Crypto currencies
            console.log(`📈 Fetching crypto data for: ${config.symbol} via cached API`);
            const apiResponse = await fetch(`/api/alphavantage?function=${config.function}&symbol=${config.symbol}&market=${config.market}`);
            const cryptoResponse = await apiResponse.json();
            if (!apiResponse.ok) throw new Error(cryptoResponse.error || 'Failed to fetch crypto data');
            parsedData = AlphaVantageService.parseTimeSeriesData(cryptoResponse);
          } else if (config.isForex) {
            // Forex pairs
            console.log(`📈 Fetching forex data for: ${config.from_currency}/${config.to_currency} via cached API`);
            const apiResponse = await fetch(`/api/alphavantage?function=${config.function}&from_currency=${config.from_currency}&to_currency=${config.to_currency}`);
            const forexResponse = await apiResponse.json();
            if (!apiResponse.ok) throw new Error(forexResponse.error || 'Failed to fetch forex data');
            parsedData = AlphaVantageService.parseTimeSeriesData(forexResponse);
          } else if (config.isCommodity) {
            // Commodities
            console.log(`📈 Fetching commodity data for: ${config.function} via cached API`);
            const apiResponse = await fetch(`/api/alphavantage?function=${config.function}`);
            const commodityResponse = await apiResponse.json();
            
            if (!apiResponse.ok) {
              console.warn(`Failed to fetch commodity data for ${config.function}, falling back to SPY`);
              const fallbackResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact`);
              response = await fallbackResponse.json();
              if (!fallbackResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch fallback data');
              parsedData = AlphaVantageService.parseTimeSeriesData(response!);
            } else {
              parsedData = AlphaVantageService.parseCommodityData(commodityResponse);
            }
          } else if (config.isIntelligence) {
            // Intelligence functions like TOP_GAINERS_LOSERS
            console.log(`📈 Fetching intelligence data for: ${config.function} via cached API`);
            const apiResponse = await fetch(`/api/alphavantage?function=${config.function}`);
            const intelligenceResponse = await apiResponse.json();
            if (!apiResponse.ok) throw new Error(intelligenceResponse.error || 'Failed to fetch intelligence data');
            // For now, use a fallback since we don't have a specific parser for intelligence data
            const fallbackResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact`);
            response = await fallbackResponse.json();
            if (!fallbackResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch fallback data');
            parsedData = AlphaVantageService.parseTimeSeriesData(response!);
          } else {
            // Default: Stock data
            console.log(`📈 Fetching stock data for: ${symbol} via cached API`);
            const apiResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact`);
            response = await apiResponse.json();
            if (!apiResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch stock data');
            parsedData = AlphaVantageService.parseTimeSeriesData(response!);
          }
        }
      } else if (symbol.includes('USD') && !symbol.includes('/')) {
        // Crypto symbols like BTCUSD, ETHUSD
        console.log(`📈 Fetching crypto data for ${symbol} via cached API`);
        const cryptoSymbol = symbol.replace('USD', '');
        try {
          const apiResponse = await fetch(`/api/alphavantage?function=DIGITAL_CURRENCY_DAILY&symbol=${cryptoSymbol}&market=USD`);
          const cryptoResponse = await apiResponse.json();
          if (!apiResponse.ok) throw new Error(cryptoResponse.error || 'Failed to fetch crypto data');
          parsedData = AlphaVantageService.parseTimeSeriesData(cryptoResponse);
        } catch (error) {
          console.warn(`Failed to fetch crypto data for ${symbol}, falling back to SPY`);
          const apiResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact`);
          response = await apiResponse.json();
          if (!apiResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch fallback data');
          parsedData = AlphaVantageService.parseTimeSeriesData(response!);
        }
      } else if (symbol.includes('/')) {
        // Forex pairs like EUR/USD
        console.log(`📈 Fetching forex data for ${symbol} via cached API`);
        const [fromCurrency, toCurrency] = symbol.split('/');
        try {
          const apiResponse = await fetch(`/api/alphavantage?function=FX_DAILY&from_currency=${fromCurrency}&to_currency=${toCurrency}`);
          const forexResponse = await apiResponse.json();
          if (!apiResponse.ok) throw new Error(forexResponse.error || 'Failed to fetch forex data');
          parsedData = AlphaVantageService.parseTimeSeriesData(forexResponse);
        } catch (error) {
          console.warn(`Failed to fetch forex data for ${symbol}, falling back to SPY`);
          const apiResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact`);
          response = await apiResponse.json();
          if (!apiResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch fallback data');
          parsedData = AlphaVantageService.parseTimeSeriesData(response!);
        }
      } else if (['WTI', 'BRENT', 'WHEAT', 'CORN'].includes(symbol)) {
        // Commodity symbols - use cached API for proper commodity APIs
        console.log(`📈 Fetching commodity data for ${symbol} via cached API`);
        let commodityResponse: any;
        
        const apiResponse = await fetch(`/api/alphavantage?function=${symbol}`);
        commodityResponse = await apiResponse.json();
        
        if (!apiResponse.ok) {
          throw new Error(commodityResponse.error || `Failed to fetch commodity data for ${symbol}`);
        }
        
        console.log(`📊 Raw commodity API response for ${symbol}:`, commodityResponse);
        
        // Parse commodity data (different structure from stock data)
        if (commodityResponse && commodityResponse.data && Array.isArray(commodityResponse.data)) {
          const rawCommodityData = commodityResponse.data
            .slice(-90) // Get last 90 data points (3 months)
            .map((item: { date: string; value: string }) => ({
              date: item.date,
              open: parseFloat(item.value),
              high: parseFloat(item.value) * 1.02, // Mock slight variations since commodity data only has one value
              low: parseFloat(item.value) * 0.98,
              close: parseFloat(item.value),
              volume: 1000000 // Mock volume
            }))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          // Fetch token price data for commodities
          const fromTokenPriceData = canFetchFromToken ? await fetchTokenData(fromToken!.symbol) : 
                                   fromTokenIsStablecoin ? generateStablecoinData(90) : [];
          const toTokenPriceData = canFetchToToken ? await fetchTokenData(toToken!.symbol) : 
                                 toTokenIsStablecoin ? generateStablecoinData(90) : [];
          
          // Format commodity data for chart with token prices
          const chartDataFormatted = rawCommodityData.map((item: { date: string; open: number; high: number; low: number; close: number; volume: number; }, index: number) => {
            // Find matching token price data points by date
            const fromTokenPoint = fromTokenPriceData.find(fp => fp.date === item.date);
            const toTokenPoint = toTokenPriceData.find(tp => tp.date === item.date);
            
            return {
              date: item.date,
              price: item.close,
              fromTokenPrice: fromTokenPoint ? fromTokenPoint.close : undefined,
              toTokenPrice: toTokenPoint ? toTokenPoint.close : undefined,
              close: item.close,
              high: item.high,
              low: item.low,
              open: item.open,
              volume: item.volume
            };
          });
          
          console.log(`📋 Formatted commodity chart data with tokens (${chartDataFormatted.length} items):`, chartDataFormatted.slice(0, 3));
          setChartData(chartDataFormatted);
          return; // Early return for commodity data
        } else {
          throw new Error(`Invalid commodity data structure for ${symbol}`);
        }
      } else {
        // Regular stocks and ETFs
        console.log(`📈 Fetching stock data for ${symbol} via cached API`);
        const apiResponse = await fetch(`/api/alphavantage?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full`);
        response = await apiResponse.json();
        if (!apiResponse.ok) throw new Error((response as any)?.error || 'Failed to fetch stock data');
        parsedData = AlphaVantageService.parseTimeSeriesData(response!);
      }
      
      if (!(['WTI', 'BRENT', 'WHEAT', 'CORN'].includes(symbol))) {
        console.log(`📊 Raw API response for ${symbol}:`, response);
      }
      console.log(`📈 Parsed data (${parsedData.length} items):`, parsedData.slice(0, 3));
      
      // Fetch token price data
      const fromTokenPriceData = canFetchFromToken ? await fetchTokenData(fromToken!.symbol) : 
                               fromTokenIsStablecoin ? generateStablecoinData(90) : [];
      const toTokenPriceData = canFetchToToken ? await fetchTokenData(toToken!.symbol) : 
                             toTokenIsStablecoin ? generateStablecoinData(90) : [];
      
      // Format data for Recharts (last 90 days for 3 months)
      const chartDataFormatted = parsedData
        .slice(-90) // Get last 90 days (approximately 3 months)
        .map((item, index) => {
          // Find matching token price data points by date
          const fromTokenPoint = fromTokenPriceData.find(fp => fp.date === item.date);
          const toTokenPoint = toTokenPriceData.find(tp => tp.date === item.date);
          
          return {
            date: item.date,
            price: item.close,
            fromTokenPrice: fromTokenPoint ? fromTokenPoint.close : undefined,
            toTokenPrice: toTokenPoint ? toTokenPoint.close : undefined,
            close: item.close,
            high: item.high,
            low: item.low,
            open: item.open,
            volume: item.volume
          };
        });
      
      console.log(`📋 Formatted chart data with tokens (${chartDataFormatted.length} items):`, chartDataFormatted.slice(0, 3));
      setChartData(chartDataFormatted);
    } catch (error) {
      console.error("❌ Error loading chart data:", error);
      console.error("❌ Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack,
        symbol,
        indexId: index.id,
        apiKey: (process.env.NEXT_PUBLIC_ALPHAVANTAGE || "123").substring(0, 8) + '...'
      });
      setChartError(`Failed to load chart data for ${symbol}. Using demo visualization.`);
      
      // Generate fallback demo data with realistic values for different index types
      let basePrice;
      if (blockchainIndexId !== null) {
        // Use blockchain-specific realistic values based on index type
        switch (blockchainIndexId) {
          case 0: // Inflation Rate (basis points) - ~3.2%
            basePrice = 320; 
            break;
          case 1: // Elon Followers - ~150M followers
            basePrice = 150000000; 
            break;
          case 2: // BTC Price (scaled by 100) - ~$45,000
            basePrice = 4500000; 
            break;
          case 3: // VIX Index (basis points) - ~20
            basePrice = 2000; 
            break;
          case 4: // Unemployment Rate (basis points) - ~3.7%
            basePrice = 370; 
            break;
          case 5: // Tesla Stock (scaled by 100) - ~$250
            basePrice = 25000; 
            break;
          default:
            basePrice = 10000; // Custom index fallback
        }
      } else {
        // Alpha Vantage-based fallback for non-blockchain indices
        basePrice = 
          symbol === 'BTCUSD' ? 45000 : 
          symbol === 'ETHUSD' ? 2500 :
          symbol === 'CORN' ? 450 :  // Corn price in cents per bushel
          symbol === 'WHEAT' ? 650 :  // Wheat price in cents per bushel
          symbol === 'WTI' ? 75 :     // Oil price per barrel
          symbol === 'BRENT' ? 78 :   // Brent oil price per barrel
          symbol === 'GLD' ? 180 :    // Gold ETF price
          symbol === 'VIX' ? 20 :     // VIX volatility index
          index.price || 100;         // Default fallback
      }
      
      // Get demo base prices for selected tokens
      let fromTokenBasePrice = 0;
      let toTokenBasePrice = 0;
      
      if (canFetchFromToken) {
        const tokenSymbol = fromToken!.symbol.toUpperCase();
        fromTokenBasePrice = 
          tokenSymbol === 'BTC' || tokenSymbol === 'WBTC' ? 45000 : 
          tokenSymbol === 'ETH' || tokenSymbol === 'WETH' ? 2500 : 
          tokenSymbol === 'ADA' ? 0.5 :
          tokenSymbol === 'DOT' ? 15 :
          tokenSymbol === 'SOL' ? 100 :
          400; // Default for other tokens
      }
      
      if (canFetchToToken) {
        const tokenSymbol = toToken!.symbol.toUpperCase();
        toTokenBasePrice = 
          tokenSymbol === 'BTC' || tokenSymbol === 'WBTC' ? 45000 : 
          tokenSymbol === 'ETH' || tokenSymbol === 'WETH' ? 2500 : 
          tokenSymbol === 'ADA' ? 0.5 :
          tokenSymbol === 'DOT' ? 15 :
          tokenSymbol === 'SOL' ? 100 :
          400; // Default for other tokens
      }
      
      const demoData = Array.from({ length: 90 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (89 - i));
        
        // Adjust variation based on index type for more realistic movement
        let variationRange = 0.1; // Default ±5% variation
        if (blockchainIndexId !== null) {
          switch (blockchainIndexId) {
            case 0: // Inflation Rate - smaller variations
            case 4: // Unemployment Rate - smaller variations
              variationRange = 0.05; // ±2.5% variation
              break;
            case 1: // Elon Followers - very small variations (followers don't change much daily)
              variationRange = 0.02; // ±1% variation
              break;
            case 2: // BTC Price - larger variations
              variationRange = 0.15; // ±7.5% variation  
              break;
            case 3: // VIX Index - can be volatile
              variationRange = 0.2; // ±10% variation
              break;
            case 5: // Tesla Stock - can be volatile
              variationRange = 0.12; // ±6% variation
              break;
          }
        }
        
        const variation = (Math.random() - 0.5) * variationRange;
        const price = basePrice * (1 + variation);
        
        const dataPoint: any = {
          date: date.toISOString().split('T')[0],
          price: Number(price.toFixed(2)),
          close: Number(price.toFixed(2)),
          high: Number((price * 1.02).toFixed(2)),
          low: Number((price * 0.98).toFixed(2)),
          open: Number((price * (0.99 + Math.random() * 0.02)).toFixed(2)),
          volume: Math.floor(Math.random() * 1000000)
        };
        
        // Add fromToken price if available
        if (canFetchFromToken && fromTokenBasePrice > 0) {
          const fromTokenPrice = fromTokenBasePrice * (1 + variation + (Math.random() - 0.5) * 0.05);
          dataPoint.fromTokenPrice = Number(fromTokenPrice.toFixed(2));
        } else if (fromTokenIsStablecoin) {
          // Stablecoins always stay at $1
          dataPoint.fromTokenPrice = 1.00;
        }
        
        // Add toToken price if available  
        if (canFetchToToken && toTokenBasePrice > 0) {
          const toTokenPrice = toTokenBasePrice * (1 + variation + (Math.random() - 0.5) * 0.05);
          dataPoint.toTokenPrice = Number(toTokenPrice.toFixed(2));
        } else if (toTokenIsStablecoin) {
          // Stablecoins always stay at $1
          dataPoint.toTokenPrice = 1.00;
        }
        
        return dataPoint;
      });
      
      setChartData(demoData);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    // Only call loadRealIndexData if we have a blockchain index ID
    if (blockchainIndexId !== null) {
      loadRealIndexData(blockchainIndexId);
    }
    loadCurrentPrice();
    loadChartData();
  }, [index.id, blockchainIndex, blockchainIndexId, loadRealIndexData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload chart when tokens change (for correlation analysis)
  useEffect(() => {
    if (fromToken || toToken) {
      loadChartData();
    }
  }, [fromToken, toToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequestIndex = async () => {
    if (!isConnected || !walletAddress) {
      setRequestError("Please connect your wallet first");
      return;
    }

    if (!window.ethereum) {
      setRequestError("MetaMask or compatible wallet required");
      return;
    }

    setIsRequestingIndex(true);
    setRequestError(null);
    setRequestSuccess(null);

    try {
      // Use the current Alpha Vantage price as initial value, with proper validation
      const rawPrice = realIndexData.price;
      const validPrice = (typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice > 0) ? rawPrice : 100;
      const initialValue = Math.floor(validPrice);
      
      // Create proper Alpha Vantage URL based on index category
      const sourceUrl = createAlphaVantageUrl(realIndexData);

      // Use the blockchain service directly instead of API route
      const { ORACLE_TYPES } = await import('@/lib/blockchain-constants');
      const { blockchainService } = await import('@/lib/blockchain-service');
      
      const result = await blockchainService.createIndexWithOracleType(
        realIndexData.name,
        initialValue,
        sourceUrl,
        ORACLE_TYPES.CHAINLINK
      );

      if (result.success) {
        setRequestSuccess(`✅ Successfully created blockchain index "${realIndexData.name}" with ID ${result.indexId}! Transaction: ${result.transactionHash}`);
        
        // Refresh blockchain indices to show the new index
        if (refreshIndices) {
          await refreshIndices();
        }
        
        // Refresh the page to show updated state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to create index');
      }

    } catch (error) {
      console.error('❌ Error requesting index:', error);
      setRequestError(`Failed to create blockchain index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRequestingIndex(false);
    }
  };

  const handleCreateOrder = async () => {
    // Debug logging
    console.log('🔍 Create Order Debug:', {
      isConnected,
      walletAddress,
      blockchainIndexId,
      fromToken: fromToken?.symbol,
      toToken: toToken?.symbol
    });

    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!walletAddress) {
      alert("Wallet address not available. Please reconnect your wallet.");
      return;
    }

    if (blockchainIndexId === null || blockchainIndexId === undefined) {
      alert("This index is not available on the blockchain yet. Please request it to be added first.");
      return;
    }

    if (!fromToken || !toToken) {
      alert("Please select both from and to tokens");
      return;
    }

    try {
      // First, check if token approval is needed (skip for ETH)
      if (fromToken.symbol !== 'ETH') {
        console.log('🔍 Checking token approval...');
        const isApproved = await checkTokenApproval(fromToken.address, orderForm.fromAmount);
        
        if (!isApproved) {
          console.log('⏳ Requesting token approval...');
          const approvalSuccess = await approveToken(fromToken.address, orderForm.fromAmount);
          
          if (!approvalSuccess) {
            alert('❌ Token approval failed. Cannot create order without approval.');
            return;
          }
          
          console.log('✅ Token approval completed, proceeding with order creation...');
        } else {
          console.log('✅ Token already approved, proceeding with order creation...');
        }
      }

      // Now create the order
      await createOrder({
        indexId: blockchainIndexId,
        operator: orderForm.operator,
        threshold: parseInt(orderForm.threshold),
        description: orderForm.description,
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: orderForm.fromAmount,
        toAmount: orderForm.toAmount,
        expiry: parseInt(orderForm.expiry) * 3600 // Convert hours to seconds
      });

      // Reset form
      setOrderForm({
        description: "",
        fromAmount: "",
        toAmount: "",
        operator: OPERATORS.GT,
        threshold: "",
        expiry: "24"
      });

      alert(`🎉 Limit order signed and submitted to 1inch! It will execute when ${realIndexData.name} ${getOperatorSymbol(orderForm.operator)} ${orderForm.threshold}`);
      
    } catch (error) {
      console.error("❌ Error creating order:", error);
      alert("Failed to create order: " + (error as Error).message);
    }
  };

  const fillDemoOrderData = async () => {
    try {
      const popularTokens = tokenService.getPopularTokensSync() || [];
      const validTokens = popularTokens.filter(token => 
        token && token.address && token.symbol
      );
      
      if (validTokens.length >= 2) {
        // Set tokens: USDC -> WETH (matching backend test)
        const usdcToken = validTokens.find(t => t.symbol === 'USDC') || validTokens.find(t => t.symbol.includes('USD'));
        const wethToken = validTokens.find(t => t.symbol === 'WETH') || validTokens[1];
        
        // If USDC not found, fallback to a stablecoin or first token
        setFromToken(usdcToken || validTokens[0]);
        setToToken(wethToken);
      }

      const demoThreshold = "18000";
      const demoThresholdDollars = (parseInt(demoThreshold) / 100).toFixed(0); // Convert basis points to dollars
      
      setOrderForm({
        description: `Buy WETH when ${realIndexData.name} > $${demoThresholdDollars}`,
        fromAmount: "0.1", // 0.1 USDC - matching backend test exactly
        toAmount: "0.00003", // 0.00003 WETH - matching backend test exactly
        operator: OPERATORS.GT,
        threshold: demoThreshold,
        expiry: "2" // 2 hours - matching backend test
      });
      
      alert(`🚀 Demo order data loaded! 
📱 ${realIndexData.name} conditional order
💰 Sell 0.1 USDC → Buy 0.00003 WETH
🎯 When ${realIndexData.name} > $${demoThresholdDollars}
⏰ Expires in 2 hours

This matches the backend test-index-order-creator.js values exactly!`);
    } catch (error) {
      console.error('❌ Error setting demo data:', error);
      alert('Failed to load demo data');
    }
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    const tempAmount = orderForm.fromAmount;
    
    setFromToken(toToken);
    setToToken(tempToken);
    
    setOrderForm(prev => ({
      ...prev,
      fromAmount: prev.toAmount,
      toAmount: tempAmount
    }));
  };

  const getOperatorSymbol = (operator: number) => {
    switch (operator) {
      case OPERATORS.GT: return ">";
      case OPERATORS.LT: return "<";
      case OPERATORS.GTE: return "≥";
      case OPERATORS.LTE: return "≤";
      case OPERATORS.EQ: return "=";
      default: return "?";
    }
  };

  const handleRefreshChart = () => {
    loadChartData();
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
                <div className={`w-16 h-16 rounded-full ${realIndexData.color} flex items-center justify-center text-white text-2xl font-bold`}>
                  {realIndexData.avatar}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{realIndexData.name}</h1>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">${realIndexData.symbol}</span>
                    {realIndexData.sourceUrl && (
                      <a 
                        href={realIndexData.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 text-sm underline"
                      >
                        📊 Data Source
                      </a>
                    )}
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-500">{realIndexData.handle}</span>
                  </div>
                  {realIndexData.lastUpdated && (
                    <div className="text-xs text-gray-400 mt-1">
                      Last updated: {realIndexData.lastUpdated}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleRefreshChart}
                  disabled={isLoadingChart}
                  variant="outline"
                  className="px-4"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingChart ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                {isAvailableOnBlockchain ? (
                  <div className="flex items-center space-x-2">
                    <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ⛓️ Live On-Chain
                    </div>
                    {blockchainIndex && (
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        ID: {blockchainIndex.id}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={handleRequestIndex}
                    disabled={isRequestingIndex}
                    variant="outline"
                    className="px-6"
                  >
                    {isRequestingIndex ? (
                      "Requesting..."
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Request Index
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Request Index Success/Error Messages */}
            {requestSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  {requestSuccess}
                </AlertDescription>
              </Alert>
            )}
            
            {requestError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {requestError}
                </AlertDescription>
              </Alert>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Price</div>
                  <div className="text-2xl font-bold text-gray-900">{realIndexData.valueLabel}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Mindshare</div>
                  <div className="text-2xl font-bold text-gray-900">{realIndexData.mindshare}</div>
                  <div className="text-sm text-gray-500">{realIndexData.changeValue}</div>
                </CardContent>
              </Card>
              
              {realIndexData.category && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Category</div>
                    <div className="text-2xl font-bold text-blue-600">{realIndexData.category}</div>
                    <div className="text-sm text-gray-500">{realIndexData.provider}</div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">24h Volume</div>
                  <div className="text-2xl font-bold text-gray-900">{realIndexData.volume24h || 'N/A'}</div>
                  <div className="text-sm text-gray-500">Trading Volume</div>
                </CardContent>
              </Card>
            </div>

            {/* Price Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    {fromToken || toToken ? 'Price Trend Comparison (3 Months)' : 'Price Chart (3 Months)'}
                  </CardTitle>
                  <div className="text-sm text-gray-500">
                    {chartError ? (
                      <span className="text-orange-600">{chartError} - Showing fallback data</span>
                    ) : fromToken || toToken ? (
                      <div className="space-y-1">
                        <div>{`Compare ${realIndexData.symbol} trends with ${[fromToken?.symbol, toToken?.symbol].filter(Boolean).join(' & ')} (Last 90 days)`}</div>
                        <div className="flex items-center space-x-4 text-xs">
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-0.5 bg-blue-500"></div>
                            <span style={{color: '#3b82f6'}}>{realIndexData.symbol} (Left axis)</span>
                          </div>
                          {fromToken && !shouldSkipToken(fromToken.symbol) && (
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-0.5 bg-green-500 border-dashed border border-green-500"></div>
                              <span style={{color: '#10b981'}}>{fromToken.symbol} (Right axis)</span>
                            </div>
                          )}
                          {toToken && !shouldSkipToken(toToken.symbol) && (
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-0.5 bg-orange-500" style={{borderTop: '1px dashed #f59e0b'}}></div>
                              <span style={{color: '#f59e0b'}}>{toToken.symbol} (Right axis)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      `Historical ${realIndexData.symbol} data from Alpha Vantage (Last 90 days)`
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshChart}
                    disabled={isLoadingChart}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingChart ? 'animate-spin' : ''}`} />
                  </Button>
                  {isLoadingChart && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingChart ? (
                  <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                      <p className="text-gray-500">Loading chart data...</p>
                      <p className="text-sm text-gray-400">Fetching from Alpha Vantage</p>
                    </div>
                  </div>
                ) : chartData.length > 0 ? (
                  <div className="h-80">
                    {/* @ts-ignore */}
                    <ResponsiveContainer width="100%" height="100%">
                      {/* @ts-ignore */}
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        {/* @ts-ignore */}
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        />
                        {/* Left Y-axis for main asset price (primary focus) */}
                        {/* @ts-ignore */}
                        <YAxis 
                          yAxisId="left"
                          tick={{ 
                            fontSize: blockchainIndexId !== null ? getYAxisConfig(blockchainIndexId).fontSize : 11, 
                            fill: '#3b82f6' 
                          }}
                          width={blockchainIndexId !== null ? getYAxisConfig(blockchainIndexId).width : 60}
                          tickCount={blockchainIndexId !== null ? getYAxisConfig(blockchainIndexId).tickCount : 6}
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={(value) => {
                            if (blockchainIndexId !== null) {
                              return formatIndexValueForDisplay(blockchainIndexId, value);
                            }
                            return realIndexData.category === 'Forex' 
                              ? value.toFixed(4)
                              : value >= 1000 
                                ? `$${(value / 1000).toFixed(1)}K`
                                : `$${value.toFixed(2)}`;
                          }}
                        />
                        {/* Right Y-axis for token prices */}
                        {((fromToken && !shouldSkipToken(fromToken.symbol)) || (toToken && !shouldSkipToken(toToken.symbol))) && (
                          /* @ts-ignore */
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12, fill: '#10b981' }}
                            tickFormatter={(value) => 
                              value >= 1000000 
                                ? `$${(value / 1000000).toFixed(1)}M`
                                : value >= 1000 
                                  ? `$${(value / 1000).toFixed(1)}K`
                                  : `$${value.toFixed(0)}`
                            }
                          />
                        )}
                        <Tooltip
                          labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          formatter={(value: number, name: string) => [
                            name === 'price' ? 
                              (blockchainIndexId !== null 
                                ? formatIndexValueForDisplay(blockchainIndexId, value)
                                : realIndexData.category === 'Forex' 
                                  ? value.toFixed(4) 
                                  : `$${value.toFixed(2)}`) :
                            name === 'fromTokenPrice' ? `$${value.toFixed(2)}` :
                            name === 'toTokenPrice' ? `$${value.toFixed(2)}` :
                              `$${value.toFixed(2)}`,
                            name === 'price' ? realIndexData.symbol : 
                            name === 'fromTokenPrice' ? fromToken?.symbol :
                            name === 'toTokenPrice' ? toToken?.symbol :
                              name
                          ]}
                          labelStyle={{ color: '#374151' }}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                        />
                        {/* Main asset price line (primary focus, left axis) */}
                        {/* @ts-ignore */}
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          name="price"
                          dot={false}
                          activeDot={{ r: 5, fill: "#3b82f6" }}
                          yAxisId="left"
                        />
                        {/* Show fromToken line if available (right axis) */}
                        {fromToken && !shouldSkipToken(fromToken.symbol) && (
                          /* @ts-ignore */
                          <Line
                            type="monotone"
                            dataKey="fromTokenPrice"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="fromTokenPrice"
                            dot={false}
                            activeDot={{ r: 4, fill: "#10b981" }}
                            yAxisId="right"
                          />
                        )}
                        
                        {/* Show toToken line if available (right axis) */}
                        {toToken && !shouldSkipToken(toToken.symbol) && (
                          /* @ts-ignore */
                          <Line
                            type="monotone"
                            dataKey="toTokenPrice"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            name="toTokenPrice"
                            dot={false}
                            activeDot={{ r: 4, fill: "#f59e0b" }}
                            yAxisId="right"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No chart data available</p>
                      <p className="text-sm text-gray-400">Unable to load historical data</p>
                      <Button 
                        onClick={handleRefreshChart}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Box - Show for all indices when connected - moved below chart */}
            {blockchainIndexId !== null && isConnected && (
              <AdminBox 
                indexId={blockchainIndexId}
                indexName={realIndexData.name}
                className="mt-0"
              />
            )}

          </div>

          {/* Right Column - Trading & Social Feed */}
          <div className="space-y-6">
            {/* Conditional Order Creation Box - Available for all blockchain indices */}
            {blockchainIndexId !== null && (
              <Card>
                <CardHeader>
                  <CardTitle>Create Conditional Order</CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Set up an order that executes when {realIndexData.name} meets your conditions
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Conditional Order Form - Simplified */}
                  <>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        placeholder={`Buy when ${realIndexData.name} hits target`}
                        value={orderForm.description}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                  {/* From Token */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">From</label>
                      {fromToken && isConnected && (
                        <span className="text-xs text-gray-500">
                          Balance: {fromToken.symbol === 'ETH' 
                            ? (ethBalance ? parseFloat(ethBalance).toFixed(4) : '0.0000')
                            : (tokenBalances[fromToken.address] ? parseFloat(tokenBalances[fromToken.address]).toFixed(4) : '0.0000')
                          } {fromToken.symbol}
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-32">
                        <TokenSelector
                          selectedToken={fromToken}
                          onTokenSelect={setFromToken}
                          placeholder="From"
                          disabled={isCreatingOrder}
                          excludeTokens={toToken ? [toToken.address] : []}
                          className="w-full"
                        />
                      </div>
                      <div className="flex-1 relative">
                        <Input
                          type="number"
                          placeholder="0.0001"
                          value={orderForm.fromAmount}
                          onChange={(e) => setOrderForm(prev => ({ ...prev, fromAmount: e.target.value }))}
                          disabled={isCreatingOrder}
                          className="h-12 pr-12"
                        />
                        {fromToken?.symbol === 'ETH' && ethBalance && parseFloat(ethBalance) > 0 && isConnected && !isCreatingOrder && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const maxAmount = Math.max(0, parseFloat(ethBalance) - 0.001); // Reserve for gas
                              setOrderForm(prev => ({ ...prev, fromAmount: maxAmount.toString() }));
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                          >
                            MAX
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSwapTokens}
                      disabled={isCreatingOrder}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* To Token */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">To</label>
                      {toToken && isConnected && (
                        <span className="text-xs text-gray-500">
                          Balance: {toToken.symbol === 'ETH' 
                            ? (ethBalance ? parseFloat(ethBalance).toFixed(4) : '0.0000')
                            : (tokenBalances[toToken.address] ? parseFloat(tokenBalances[toToken.address]).toFixed(4) : '0.0000')
                          } {toToken.symbol}
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-32">
                        <TokenSelector
                          selectedToken={toToken}
                          onTokenSelect={setToToken}
                          placeholder="To"
                          disabled={isCreatingOrder}
                          excludeTokens={fromToken ? [fromToken.address] : []}
                          className="w-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="0.25"
                          value={orderForm.toAmount}
                          onChange={(e) => setOrderForm(prev => ({ ...prev, toAmount: e.target.value }))}
                          disabled={isCreatingOrder}
                          className="h-12"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Condition</label>
                      <Select value={orderForm.operator.toString()} onValueChange={(value: string) => setOrderForm(prev => ({ ...prev, operator: parseInt(value) }))}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={OPERATORS.GT.toString()}>Greater than (&gt;)</SelectItem>
                          <SelectItem value={OPERATORS.LT.toString()}>Less than (&lt;)</SelectItem>
                          <SelectItem value={OPERATORS.GTE.toString()}>Greater or equal (≥)</SelectItem>
                          <SelectItem value={OPERATORS.LTE.toString()}>Less or equal (≤)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Threshold</label>
                      <Input
                        placeholder="18000"
                        value={orderForm.threshold}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, threshold: e.target.value }))}
                        className="h-12"
                      />
                    </div>
                  </div>

                  {/* Expiration Time */}
                  <div>
                    <label className="text-sm font-medium">Expiry Time</label>
                    <Select value={orderForm.expiry} onValueChange={(value: string) => setOrderForm(prev => ({ ...prev, expiry: value }))}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours (1 day)</SelectItem>
                        <SelectItem value="72">72 hours (3 days)</SelectItem>
                        <SelectItem value="168">1 week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={handleCreateOrder}
                      disabled={!isConnected || isCreatingOrder || isApprovingToken || !orderForm.threshold || !orderForm.fromAmount || !fromToken || !toToken}
                      className="flex-1"
                    >
                      {isApprovingToken ? "Approving Token..." : isCreatingOrder ? "Creating Order..." : "Create Order"}
                    </Button>
                    <Button
                      onClick={fillDemoOrderData}
                      variant="outline"
                      disabled={!isConnected}
                    >
                      Fill Demo
                    </Button>
                    {!isConnected && (
                      <Button
                        onClick={connectWallet}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Refresh Connection
                      </Button>
                    )}
                  </div>

                  </>
                </CardContent>
              </Card>
            )}

            {/* Quick Swap Box - Available for all indices */}
            <SwapBox 
              walletAddress={walletAddress || undefined}
              apiKey={process.env.NEXT_PUBLIC_ONEINCH_API_KEY}
              rpcUrl={process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
                ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
                : "https://mainnet.base.org"
              }
              indexName={realIndexData.name}
            />



            {/* Request Index Card - Only when NOT available on blockchain */}
            {!isAvailableOnBlockchain && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Limited Functionality</h3>
                  <p className="text-orange-700 mb-4">
                    This index is not yet available for conditional orders. Request it to be added for full trading functionality.
                  </p>
                  <Button 
                    onClick={handleRequestIndex}
                    disabled={isRequestingIndex}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isRequestingIndex ? "Requesting..." : "Request Index"}
                  </Button>
                </CardContent>
              </Card>
            )}

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