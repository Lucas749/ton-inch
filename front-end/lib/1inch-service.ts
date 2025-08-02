import { Hex } from "viem";

// Type definitions for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: any[];
      }) => Promise<any>;
    };
  }
}

// Base mainnet configuration (1inch doesn't support testnets)
const BASE_MAINNET_CHAIN_ID = 8453;
const INCH_API_BASE_URL = `https://api.1inch.dev/swap/v6.1/${BASE_MAINNET_CHAIN_ID}`;
// Fusion API now handled through proxy endpoints

// Common token addresses on Base mainnet
export const TOKENS = {
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Native USDC on Base mainnet (Circle)
  USDBC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // Bridged USDC on Base mainnet
  WETH: "0x4200000000000000000000000000000000000006", // WETH on Base mainnet
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native ETH placeholder
};

export interface SwapConfig {
  apiKey: string;
  rpcUrl: string;
  walletAddress: string;
}

export interface SwapParams {
  src: string;
  dst: string;
  amount: string;
  from: string;
  slippage: number;
  disableEstimate?: boolean;
  allowPartialFill?: boolean;
}

export interface AllowanceResponse {
  allowance: string;
}

export interface ApproveTransactionResponse {
  to: Hex;
  data: Hex;
  value: bigint;
  gas?: string;
}

export interface TransactionPayload {
  to: Hex;
  data: Hex;
  value: bigint;
}

export interface SwapResponse {
  tx: TransactionPayload;
}

export interface SwapQuoteResponse {
  dstAmount: string;
  srcToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
  };
  dstToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
  };
  protocols: any[];
  gas: string;
}

// Intent swap (Fusion) interfaces
export interface IntentSwapParams {
  srcToken: string;
  dstToken: string;
  amount: string;
  walletAddress: string;
  preset?: "fast" | "fair" | "auction";
  takingSurplusRecipient?: string;
  permits?: string;
  receiver?: string;
  nonce?: string;
}

export interface IntentSwapQuoteResponse {
  dstAmount: string;
  srcToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
  };
  dstToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
  };
  preset: string;
  auctionStartAmount: string;
  auctionEndAmount: string;
  auctionDuration: number;
  startAuctionIn: number;
  initialRateBump: number;
  volume: string[];
  prices: string[];
  whitelist: string[];
  blacklist: string[];
  fee: {
    takingSurplusRecipient: string;
    ratio: number;
  };
}

export interface IntentSwapOrderRequest {
  srcToken: string;
  dstToken: string;
  amount: string;
  walletAddress: string;
  preset?: string;
  takingSurplusRecipient?: string;
  permits?: string;
  receiver?: string;
  nonce?: string;
}

export interface IntentSwapOrderResponse {
  order: {
    salt?: string;
    maker?: string;
    receiver?: string;
    makerAsset?: string;
    takerAsset?: string;
    makingAmount?: string;
    takingAmount?: string;
    makerTraits?: string;
    // New Fusion order properties
    fromToken?: string;
    toToken?: string;
    fromAmount?: string;
    toAmount?: string;
    validUntil?: number;
    nonce?: string;
  };
  signature: string;
  orderHash: string;
  quoteId: string;
  // New properties for signing flow
  requiresSignature?: boolean;
  domain?: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types?: {
    Order: Array<{
      name: string;
      type: string;
    }>;
  };
  message?: string;
  estimatedOutput?: string;
  minOutput?: string;
}

export interface OrderStatus {
  orderHash: string;
  status: "pending" | "filled" | "cancelled" | "expired" | "partially-filled";
  createdAt: number;
  fills: Array<{
    txHash: string;
    filledMakingAmount: string;
    filledTakingAmount: string;
  }>;
  cancelTx?: string;
}

export type SwapMode = "classic" | "intent";

export class OneInchService {
  private config: SwapConfig;

  constructor(config: SwapConfig) {
    this.config = config;
  }

  /**
   * Check if browser wallet is available and connected
   */
  private isWalletAvailable(): boolean {
    return typeof window !== "undefined" && 
           !!window.ethereum && 
           !!window.ethereum.selectedAddress;
  }

  /**
   * Send transaction using browser wallet
   */
  private async sendTransaction(transaction: TransactionPayload): Promise<string> {
    if (!this.isWalletAvailable()) {
      throw new Error("Browser wallet not available or not connected");
    }

    try {
      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.config.walletAddress,
          to: transaction.to,
          data: transaction.data,
          value: `0x${transaction.value.toString(16)}`,
        }],
      });

      console.log("✅ Transaction sent:", txHash);
      return txHash;
    } catch (error) {
      console.error("❌ Failed to send transaction:", error);
      throw error;
    }
  }

  private buildQueryURL(path: string, params: Record<string, string>): string {
    // Use proxy endpoints to avoid CORS issues
    let proxyPath = '/api/oneinch';
    if (path.includes('/quote')) {
      proxyPath += '/quote';
    } else if (path.includes('/swap')) {
      proxyPath += '/swap';  
    } else if (path.includes('/fusion')) {
      proxyPath += '/fusion';
    } else {
      // Default to swap endpoint for other paths
      proxyPath += '/swap';
    }
    
    const url = new URL(proxyPath, window.location.origin);
    
    // Add chainId and other params
    params.chainId = BASE_MAINNET_CHAIN_ID.toString();
    url.search = new URLSearchParams(params).toString();
    return url.toString();
  }

  // Fusion queries now handled through proxy endpoints

  private async call1inchAPI<T>(
    endpointPath: string,
    queryParams: Record<string, string>
  ): Promise<T> {
    const url = this.buildQueryURL(endpointPath, queryParams);

    console.log("🌐 OneInchService API call:", {
      endpoint: endpointPath,
      url,
      params: queryParams,
      walletAddress: this.config.walletAddress
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // API key is handled by the proxy endpoint
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("❌ API Error Details:", {
        status: response.status,
        body,
        url,
        params: queryParams
      });
      throw new Error(`1inch API proxy returned status ${response.status}: ${body}`);
    }

    return (await response.json()) as T;
  }

  // Fusion API calls now handled through proxy endpoints

  /**
   * Get a quote for a token swap (no transaction)
   */
  async getSwapQuote(params: SwapParams): Promise<SwapQuoteResponse> {
    const queryParams = {
      src: params.src,
      dst: params.dst,
      amount: params.amount,
      from: params.from,
      slippage: params.slippage.toString(),
    };

    return this.call1inchAPI<SwapQuoteResponse>("/quote", queryParams);
  }

  /**
   * Check token allowance for 1inch router
   */
  async checkAllowance(
    tokenAddress: string,
    walletAddress: string
  ): Promise<bigint> {
    const allowanceRes = await this.call1inchAPI<AllowanceResponse>(
      "/approve/allowance",
      {
        tokenAddress,
        walletAddress: walletAddress.toLowerCase(),
      }
    );

    return BigInt(allowanceRes.allowance);
  }

  /**
   * Get approval transaction data
   */
  async getApprovalTransaction(
    tokenAddress: string,
    amount: string
  ): Promise<ApproveTransactionResponse> {
    return this.call1inchAPI<ApproveTransactionResponse>(
      "/approve/transaction",
      {
        tokenAddress,
        amount,
      }
    );
  }

  /**
   * Get swap transaction data
   */
  async getSwapTransaction(params: SwapParams): Promise<SwapResponse> {
    console.log("🔍 getSwapTransaction called with params:", params);
    console.log("🔍 Config wallet address:", this.config.walletAddress);

    const queryParams = {
      src: params.src,
      dst: params.dst,
      amount: params.amount,
      from: params.from,
      slippage: params.slippage.toString(),
      disableEstimate: (params.disableEstimate || false).toString(),
      allowPartialFill: (params.allowPartialFill || false).toString(),
    };

    console.log("🔍 Final query params for swap:", queryParams);

    return this.call1inchAPI<SwapResponse>("/swap", queryParams);
  }



  /**
   * Complete swap flow: check allowance, approve if needed, then swap
   */
  async performSwap(
    params: SwapParams
  ): Promise<{ approvalTxHash?: string; swapTxHash: string }> {
    if (!this.isWalletAvailable()) {
      throw new Error("Browser wallet not available. Please connect your wallet.");
    }

    const result: { approvalTxHash?: string; swapTxHash: string } = {
      swapTxHash: "",
    };

    // Skip allowance check for native ETH
    if (params.src !== TOKENS.ETH) {
      console.log("Checking token allowance...");
      const allowance = await this.checkAllowance(params.src, params.from);
      const requiredAmount = BigInt(params.amount);

      if (allowance < requiredAmount) {
        console.log("Insufficient allowance. Creating approval transaction...");
        const approveTx = await this.getApprovalTransaction(
          params.src,
          params.amount
        );

        const approvalTxHash = await this.sendTransaction({
          to: approveTx.to,
          data: approveTx.data,
          value: approveTx.value,
        });

        result.approvalTxHash = approvalTxHash;
        console.log("Approval transaction sent. Hash:", approvalTxHash);

        // Wait for confirmation
        console.log("Waiting 10 seconds for approval confirmation...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    // Perform the swap
    console.log("Fetching swap transaction...");
    const swapTx = await this.getSwapTransaction(params);

    const swapTxHash = await this.sendTransaction(swapTx.tx);
    result.swapTxHash = swapTxHash;
    console.log("Swap transaction sent. Hash:", swapTxHash);

    return result;
  }

  /**
   * Format token amount with proper decimals
   */
  static formatTokenAmount(amount: string, decimals: number): string {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const remainder = value % divisor;

    if (remainder === BigInt(0)) {
      return whole.toString();
    }

    const fractional = remainder
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "");
    return `${whole}.${fractional}`;
  }

  /**
   * Parse token amount to wei/smallest unit
   */
  static parseTokenAmount(amount: string, decimals: number): string {
    const [whole, fractional = ""] = amount.split(".");
    const paddedFractional = fractional
      .padEnd(decimals, "0")
      .slice(0, decimals);
    
    // Helper function for BigInt exponentiation
    const pow10 = (exp: number): bigint => {
      let result = BigInt(1);
      for (let i = 0; i < exp; i++) {
        result *= BigInt(10);
      }
      return result;
    };
    
    return (
      BigInt(whole) * pow10(decimals) +
      BigInt(paddedFractional)
    ).toString();
  }

  // ===== INTENT SWAP (FUSION) METHODS =====

  /**
   * Get a quote for an Intent swap (Fusion mode)
   * Gasless swaps with Dutch auction mechanism
   */
  async getIntentSwapQuote(
    params: IntentSwapParams
  ): Promise<IntentSwapQuoteResponse> {
    const queryParams = {
      srcToken: params.srcToken,
      dstToken: params.dstToken,
      amount: params.amount,
      walletAddress: params.walletAddress,
      ...(params.preset && { preset: params.preset }),
      ...(params.takingSurplusRecipient && {
        takingSurplusRecipient: params.takingSurplusRecipient,
      }),
      ...(params.permits && { permits: params.permits }),
      ...(params.receiver && { receiver: params.receiver }),
      ...(params.nonce && { nonce: params.nonce }),
    };

    // Use proxy endpoint instead of direct fusion API call
    const url = this.buildQueryURL("/fusion", queryParams);
    
    console.log("🌐 Intent swap quote using proxy:", url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Fusion API proxy returned status ${response.status}: ${body}`);
    }

    return (await response.json()) as IntentSwapQuoteResponse;
  }

  /**
   * Create an Intent swap order (Fusion mode) - Step 1: Create order for signing
   * This creates order data that the user needs to sign with their wallet
   */
  async createIntentSwapOrder(
    params: IntentSwapOrderRequest
  ): Promise<IntentSwapOrderResponse> {
    const body = {
      action: 'create-order',
      fromTokenAddress: params.srcToken,
      toTokenAddress: params.dstToken,
      amount: params.amount,
      walletAddress: params.walletAddress,
      preset: params.preset || "fast",
      chainId: BASE_MAINNET_CHAIN_ID.toString(),
    };

    // Use our corrected proxy endpoint instead of direct Fusion API
    const url = new URL('/api/oneinch/fusion', window.location.origin);
    
    console.log("🚀 Creating intent swap order for signing via proxy:", { url: url.toString(), body });
    
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Intent swap proxy returned status ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    
    // Map the response to match the expected interface
    return {
      order: responseData.orderToSign || {},
      signature: "",
      orderHash: "",
      quoteId: "",
      requiresSignature: responseData.requiresSignature,
      domain: responseData.domain,
      types: responseData.types,
      message: responseData.message,
      estimatedOutput: responseData.estimatedOutput,
      minOutput: responseData.minOutput
    } as IntentSwapOrderResponse;
  }

  /**
   * Submit signed Intent swap order (Fusion mode) - Step 2: Submit signed order
   * This submits the signed order to the Fusion system for execution
   */
  async submitSignedIntentOrder(
    order: any,
    signature: string,
    chainId?: string
  ): Promise<{
    success: boolean;
    orderHash: string;
    status: string;
    message: string;
    estimatedFillTime?: string;
  }> {
    const body = {
      action: 'submit-order',
      chainId: chainId || BASE_MAINNET_CHAIN_ID.toString(),
      order,
      signature
    };

    const url = new URL('/api/oneinch/fusion', window.location.origin);

    console.log('🚀 Submitting signed Intent swap order via proxy:', { url: url.toString(), orderNonce: order.nonce });

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Intent swap order submission failed: ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    
    return {
      success: responseData.success,
      orderHash: responseData.orderHash,
      status: responseData.status,
      message: responseData.message,
      estimatedFillTime: responseData.estimatedFillTime
    };
  }

  /**
   * Get the status of an Intent swap order
   */
  async getOrderStatus(orderHash: string): Promise<OrderStatus> {
    // Note: Order status would need a separate endpoint implementation
    // For now, return a placeholder since the direct API calls are not working
    console.warn("Order status checking not yet implemented in proxy");
    return {
      orderHash,
      status: "pending",
      createdAt: Date.now(),
      fills: [],
    } as OrderStatus;
  }

  /**
   * Get all active orders for a wallet address
   */
  async getActiveOrders(
    walletAddress: string,
    limit: number = 100
  ): Promise<OrderStatus[]> {
    // Note: Active orders would need a separate endpoint implementation
    // For now, return empty array since the direct API calls are not working
    console.warn("Active orders fetching not yet implemented in proxy");
    return [];
  }

  /**
   * Cancel an Intent swap order
   */
  async cancelOrder(
    orderHash: string
  ): Promise<{ success: boolean; txHash?: string }> {
    // Note: Order cancellation would need a separate endpoint implementation
    // For now, return failure since the direct API calls are not working
    console.warn("Order cancellation not yet implemented in proxy");
    return { success: false };
  }

  /**
   * Complete Intent swap flow: create order, get user signature, and submit
   */
  async performIntentSwap(
    params: IntentSwapParams
  ): Promise<{ orderHash: string; message: string; requiresSignature?: boolean; orderToSign?: any; domain?: any; types?: any }> {
    console.log("🚀 Starting Fusion intent swap flow...");

    const orderRequest: IntentSwapOrderRequest = {
      srcToken: params.srcToken,
      dstToken: params.dstToken,
      amount: params.amount,
      walletAddress: params.walletAddress,
      preset: params.preset || "fast",
    };

    // Step 1: Create order for signing
    const orderResponse = await this.createIntentSwapOrder(orderRequest);

    if (orderResponse.requiresSignature) {
      console.log("📝 Order created - requires wallet signature");
      
      // Check if we have access to window and provider
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error("No wallet provider found. Please connect your wallet.");
      }

      try {
        // Request wallet signature using EIP-712
        console.log("🔐 Requesting wallet signature...");
        
        const signature = await window.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [
            params.walletAddress,
            JSON.stringify({
              domain: orderResponse.domain,
              types: orderResponse.types,
              primaryType: 'Order',
              message: orderResponse.order
            })
          ]
        });

        console.log("✅ Order signed successfully");

        // Step 2: Submit signed order
        const submitResponse = await this.submitSignedIntentOrder(
          orderResponse.order,
          signature,
          params.chainId
        );

        console.log("🎯 Intent swap order submitted:", {
          orderHash: submitResponse.orderHash,
          status: submitResponse.status
        });

        return {
          orderHash: submitResponse.orderHash,
          message: submitResponse.message
        };

      } catch (signError) {
        console.error("❌ Wallet signing failed:", signError);
        
        if (signError.code === 4001) {
          throw new Error("User rejected the signing request. Fusion orders require wallet signature.");
        }
        
        throw new Error(`Wallet signing failed: ${signError.message || 'Unknown error'}`);
      }

    } else {
      // Fallback for older implementation
      console.log("⚠️ Using fallback flow (no signature required)");
      return {
        orderHash: orderResponse.orderHash || "fallback",
        message: "Order processed via fallback method"
      };
    }
  }
}

export default OneInchService;
