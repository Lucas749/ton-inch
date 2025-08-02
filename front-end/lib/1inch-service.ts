import { Hex } from "viem";

// Base mainnet configuration (1inch doesn't support testnets)
const BASE_MAINNET_CHAIN_ID = 8453;
const INCH_API_BASE_URL = `https://api.1inch.dev/swap/v6.1/${BASE_MAINNET_CHAIN_ID}`;
const INCH_FUSION_API_BASE_URL = `https://api.1inch.dev/fusion/v1.0/${BASE_MAINNET_CHAIN_ID}`;

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
    salt: string;
    maker: string;
    receiver: string;
    makerAsset: string;
    takerAsset: string;
    makingAmount: string;
    takingAmount: string;
    makerTraits: string;
  };
  signature: string;
  orderHash: string;
  quoteId: string;
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

  private buildFusionQueryURL(
    path: string,
    params: Record<string, string>
  ): string {
    const url = new URL(INCH_FUSION_API_BASE_URL + path);
    url.search = new URLSearchParams(params).toString();
    return url.toString();
  }

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

  private async callFusionAPI<T>(
    endpointPath: string,
    queryParams: Record<string, string> = {},
    method: "GET" | "POST" = "GET",
    body?: any
  ): Promise<T> {
    const url =
      method === "GET"
        ? this.buildFusionQueryURL(endpointPath, queryParams)
        : INCH_FUSION_API_BASE_URL + endpointPath;

    const requestInit: RequestInit = {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (method === "POST" && body) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `1inch Fusion API returned status ${response.status}: ${body}`
      );
    }

    return (await response.json()) as T;
  }

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
   * Create an Intent swap order (Fusion mode)
   * This creates a gasless order that will be filled by resolvers
   */
  async createIntentSwapOrder(
    params: IntentSwapOrderRequest
  ): Promise<IntentSwapOrderResponse> {
    const body = {
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

    return this.callFusionAPI<IntentSwapOrderResponse>(
      "/order/submit",
      {},
      "POST",
      body
    );
  }

  /**
   * Get the status of an Intent swap order
   */
  async getOrderStatus(orderHash: string): Promise<OrderStatus> {
    return this.callFusionAPI<OrderStatus>(`/orders/${orderHash}`, {});
  }

  /**
   * Get all active orders for a wallet address
   */
  async getActiveOrders(
    walletAddress: string,
    limit: number = 100
  ): Promise<OrderStatus[]> {
    const queryParams = {
      address: walletAddress,
      limit: limit.toString(),
    };

    const response = await this.callFusionAPI<{ orders: OrderStatus[] }>(
      "/orders",
      queryParams
    );
    return response.orders || [];
  }

  /**
   * Cancel an Intent swap order
   */
  async cancelOrder(
    orderHash: string
  ): Promise<{ success: boolean; txHash?: string }> {
    try {
      const response = await this.callFusionAPI<{ txHash: string }>(
        `/orders/${orderHash}/cancel`,
        {},
        "POST"
      );
      return { success: true, txHash: response.txHash };
    } catch (error) {
      console.error("Failed to cancel order:", error);
      return { success: false };
    }
  }

  /**
   * Complete Intent swap flow: create order and monitor status
   */
  async performIntentSwap(
    params: IntentSwapParams
  ): Promise<{ orderHash: string; quoteId: string }> {
    console.log("Creating Intent swap order...");

    const orderRequest: IntentSwapOrderRequest = {
      srcToken: params.srcToken,
      dstToken: params.dstToken,
      amount: params.amount,
      walletAddress: params.walletAddress,
      preset: params.preset || "fast",
      ...(params.takingSurplusRecipient && {
        takingSurplusRecipient: params.takingSurplusRecipient,
      }),
      ...(params.permits && { permits: params.permits }),
      ...(params.receiver && { receiver: params.receiver }),
      ...(params.nonce && { nonce: params.nonce }),
    };

    const orderResponse = await this.createIntentSwapOrder(orderRequest);

    console.log("Intent swap order created:", {
      orderHash: orderResponse.orderHash,
      quoteId: orderResponse.quoteId,
    });

    return {
      orderHash: orderResponse.orderHash,
      quoteId: orderResponse.quoteId,
    };
  }
}

export default OneInchService;
