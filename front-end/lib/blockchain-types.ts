/**
 * 🔷 Blockchain Types
 * Interfaces and type definitions for blockchain operations
 */

// Order interfaces
export interface OrderCondition {
  indexId: number;
  operator: number;
  threshold: number;
}

export interface Order {
  hash: string;
  indexId: number;
  operator: number;
  threshold: number;
  description: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  // Aliases for UI compatibility
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  maker: string;
  receiver: string;
  expiry: number;
  status: "active" | "filled" | "cancelled" | "expired";
  createdAt: number;
  transactionHash: string;
}

export interface OrderParams {
  indexId: number;
  operator: number;
  threshold: number;
  description: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  expiry?: number;
}

export interface CustomIndex {
  id: number;
  name?: string;
  description?: string;
  value: number;
  timestamp: number;
  active: boolean;
  creator?: string;
  createdAt?: number;
  symbol?: string;
  alphaVantageSymbol?: string;
  category?: string;
  currentValue?: string;
  exampleCondition?: string;
}

export interface SwapOrder {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  condition: OrderCondition;
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (
        event: string,
        callback: (...args: any[]) => void
      ) => void;
      selectedAddress?: string;
    };
  }
}