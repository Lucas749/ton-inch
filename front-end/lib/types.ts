export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
}

export interface TokenPair {
  baseToken: Token;
  quoteToken: Token;
}

export interface TriggerConfig {
  type: 'twitter' | 'transfer' | 'price' | 'webhook';
  parameters: {
    keywords?: string[];
    amount?: string;
    threshold?: string;
    webhookUrl?: string;
  };
}

export interface LimitOrder {
  id: string;
  maker: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  expiry: number;
  salt: string;
  signature?: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  tokenPair: TokenPair;
  trigger: TriggerConfig;
  orders: LimitOrder[];
  status: 'active' | 'paused' | 'cancelled';
  totalValue: string;
  pnl: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketEvent {
  id: string;
  type: 'twitter' | 'transfer' | 'price' | 'news';
  title: string;
  description: string;
  timestamp: string;
  impact: 'high' | 'medium' | 'low';
  tokens: string[];
  change?: string;
  metadata?: Record<string, any>;
}