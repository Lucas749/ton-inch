import { BigNumber } from 'ethers';

export interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  limitOrderProtocolAddress: string;
  oneInchApiKey: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
}

export interface IndexInfo {
  id: number;
  name: string;
  description: string;
  oracleAddress: string;
  currentValue: number;
  isActive: boolean;
}

export interface IndexCondition {
  indexId: number;
  operator: ComparisonOperator;
  threshold: number;
  description: string;
}

export enum ComparisonOperator {
  GREATER_THAN = 1,
  LESS_THAN = 2,
  GREATER_EQUAL = 3,
  LESS_EQUAL = 4,
  EQUAL = 5,
  NOT_EQUAL = 6
}

export interface IndexStrategyConfig {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  totalAmount: string;
  numberOfOrders: number;
  indexConditions: IndexCondition[];
  slippageTolerance: number;
  gasPrice?: string;
  expirationHours?: number;
}

export enum OrderStatus {
  ACTIVE = 'ACTIVE',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  UNKNOWN = 'UNKNOWN'
}

// 1inch Limit Order Protocol v4 Types
export interface LimitOrderStruct {
  salt: bigint;
  maker: string;
  receiver: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: bigint;
  takingAmount: bigint;
  makerTraits: bigint;
}

export interface IndexOrderData {
  order: LimitOrderStruct;
  orderHash: string;
  signature: string;
  indexCondition: IndexCondition;
  targetPrice: number;
  orderIndex: number;
  status: OrderStatus;
  createdAt: Date;
  expiresAt: Date;
  remainingMakingAmount?: bigint;
  limitOrderInstance?: any;
}

export interface PriceInfo {
  price: number;
  timestamp: Date;
  source: 'oneInch' | 'fallback';
}

// 1inch API Response Types
export interface OneInchQuoteResponse {
  dstAmount: string;
  srcAmount: string;
  protocols: any[];
  gas: string;
}

export interface OneInchOrderResponse {
  success: boolean;
  orderHash: string;
  quoteId?: string;
}

export interface OneInchOrderInfo {
  orderHash: string;
  signature: string;
  data: LimitOrderStruct;
  createDateTime: string;
  fillableBalance: string;
  orderInvalidReason?: number;
  auctionStartDate?: number;
  auctionEndDate?: number;
  remainingMakerAmount?: string;
  makerBalance?: string;
  makerAllowance?: string;
}

export interface OneInchOrdersResponse {
  orders: OneInchOrderInfo[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  makingAmount?: string;
  takingAmount?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IndexTradingStats {
  totalInvested: string;
  totalReceived: string;
  averagePrice: number;
  totalOrders: number;
  filledOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  profitLoss: string;
  profitLossPercent: number;
  conditionsFulfilled: number;
}

export class IndexTradingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'IndexTradingError';
  }
}

// 1inch Protocol Addresses for different chains
export const LIMIT_ORDER_PROTOCOL_ADDRESSES: Record<number, string> = {
  1: '0x111111125421cA6dc452d289314280a0f8842A65', // Ethereum
  8453: '0x111111125421cA6dc452d289314280a0f8842A65', // Base
  84532: '0x111111125421cA6dc452d289314280a0f8842A65', // Base Sepolia
  42161: '0x111111125421cA6dc452d289314280a0f8842A65', // Arbitrum
  10: '0x111111125421cA6dc452d289314280a0f8842A65', // Optimism
};

// API Base URLs
export const ONEINCH_API_BASE = 'https://api.1inch.dev';
export const LIMIT_ORDER_API_BASE = (chainId: number) => `${ONEINCH_API_BASE}/orderbook/v4.0/${chainId}`;
export const SWAP_API_BASE = (chainId: number) => `${ONEINCH_API_BASE}/swap/v6.0/${chainId}`;

// Address class for 1inch SDK compatibility
export class Address {
  constructor(public value: string) {
    if (!value || !this.isValidAddress(value)) {
      throw new Error(`Invalid address: ${value}`);
    }
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  toString(): string {
    return this.value;
  }
}