import * as dotenv from 'dotenv';
import { TokenInfo, LIMIT_ORDER_PROTOCOL_ADDRESSES } from './types';

// Load environment variables
dotenv.config();

// Base Mainnet Configuration
export interface BaseConfig {
  chainId: number;
  rpcUrl: string;
  privateKey: string;
  walletAddress: string;
  oneInchApiKey: string;
}

export const BASE_CONFIG: BaseConfig = {
  chainId: parseInt(process.env.CHAIN_ID || '8453'), // Base mainnet
  rpcUrl: process.env.RPC_URL || 'https://base.llamarpc.com',
  privateKey: process.env.PRIVATE_KEY || '',
  walletAddress: process.env.WALLET_ADDRESS || '',
  oneInchApiKey: process.env.ONEINCH_API_KEY || ''
};

// Base Mainnet Real Tokens
export const BASE_TOKENS: Record<string, TokenInfo> = {
  'USDC': {
    address: process.env.DEFAULT_FROM_TOKEN || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Real USDC on Base
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin'
  },
  'WETH': {
    address: '0x4200000000000000000000000000000000000006', // Real WETH on Base
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether'
  },
  '1INCH': {
    address: '0xc5fecC3a29Fb57B5024eEc8a2239d4621e111CBE', // Real 1INCH on Base
    symbol: '1INCH',
    decimals: 18,
    name: '1inch Token'
  },
  'cbETH': {
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', // Real cbETH on Base
    symbol: 'cbETH',
    decimals: 18,
    name: 'Coinbase Wrapped Staked ETH'
  },
  'DAI': {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // Real DAI on Base
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin'
  }
};

// Test Configuration - TINY VALUES for mainnet testing
export const TEST_CONFIG = {
  // Very small amounts for safe mainnet testing
  MAX_USDC_AMOUNT: '0.5', // Maximum 0.5 USDC per test
  MAX_WETH_AMOUNT: '0.002', // Maximum 0.002 WETH per test
  DEFAULT_TEST_AMOUNT: '0.1', // Default 0.1 USDC test
  MAX_ORDERS_PER_STRATEGY: 2, // Maximum 2 orders per strategy
  
  // Standard test trading pair - always USDC → WETH
  DEFAULT_FROM_TOKEN: 'USDC', // Always trade from USDC
  DEFAULT_TO_TOKEN: 'WETH',   // Always trade to WETH
  
  // Mock oracle values for testing (in cents/basis points)
  MOCK_INDICES: {
    APPLE_STOCK: 17500, // $175.00
    TESLA_STOCK: 25000, // $250.00
    VIX_INDEX: 2000,    // VIX 20.00
    BTC_PRICE: 4500000  // $45,000
  }
};

// Contract addresses - Simplified architecture using direct 1inch SDK
export const CONTRACTS = {
  // REMOVED: Real1inchOrderManager - Not needed! Using direct 1inch SDK
  
  // ONLY contract we need - for on-chain index validation during execution
  IndexPreInteraction: process.env.INDEX_PREINTERACTION_ADDRESS || '0x0000000000000000000000000000000000000000',
  
  // Real 1inch Protocol on Base mainnet (used directly via SDK)
  REAL_1INCH_PROTOCOL: LIMIT_ORDER_PROTOCOL_ADDRESSES[BASE_CONFIG.chainId] || '0x111111125421cA6dc452d289314280a0f8842A65'
};

// Validation
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!BASE_CONFIG.privateKey) {
    errors.push('PRIVATE_KEY environment variable is required');
  }
  
  if (!BASE_CONFIG.oneInchApiKey) {
    errors.push('ONEINCH_API_KEY environment variable is required');
  }
  
  if (BASE_CONFIG.chainId !== 8453) {
    errors.push('CHAIN_ID must be 8453 for Base mainnet');
  }
  
  // Check if Oracle is deployed (required for predicates)
  const oracleAddress = process.env.INDEX_ORACLE_ADDRESS || '0x0000000000000000000000000000000000000000';
  if (oracleAddress === '0x0000000000000000000000000000000000000000') {
    errors.push('INDEX_ORACLE_ADDRESS environment variable is required for predicates');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}