import { createPublicClient, createWalletClient, Hex, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Base Sepolia configuration
const BASE_SEPOLIA_CHAIN_ID = 84532;
const INCH_API_BASE_URL = `https://api.1inch.dev/swap/v6.1/${BASE_SEPOLIA_CHAIN_ID}`;
const INCH_FUSION_API_BASE_URL = `https://api.1inch.dev/fusion/v1.0/${BASE_SEPOLIA_CHAIN_ID}`;

// Common token addresses on Base Sepolia
export const TOKENS = {
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
  WETH: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native ETH
};

export interface SwapConfig {
  apiKey: string;
  rpcUrl: string;
  privateKey?: Hex;
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
  private publicClient: any;
  private walletClient: any;
  private account: any;

  constructor(config: SwapConfig) {
    this.config = config;

    // Initialize viem clients
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(config.rpcUrl),
    });

    if (config.privateKey) {
      this.account = privateKeyToAccount(config.privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: baseSepolia,
        transport: http(config.rpcUrl),
      });
    }
  }

  private buildQueryURL(path: string, params: Record<string, string>): string {
    const url = new URL(INCH_API_BASE_URL + path);
    url.search = new URLSearchParams(params).toString();
    return url.toString();
  }

  private buildFusionQueryURL(path: string, params: Record<string, string>): string {
    const url = new URL(INCH_FUSION_API_BASE_URL + path);
    url.search = new URLSearchParams(params).toString();
    return url.toString();
  }

  private async call1inchAPI<T>(
    endpointPath: string,
    queryParams: Record<string, string>
  ): Promise<T> {
    const url = this.buildQueryURL(endpointPath, queryParams);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`1inch API returned status ${response.status}: ${body}`);
    }

    return (await response.json()) as T;
  }

  private async callFusionAPI<T>(
    endpointPath: string,
    queryParams: Record<string, string> = {},
    method: "GET" | "POST" = "GET",
    body?: any
  ): Promise<T> {
    const url = method === "GET" 
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
      throw new Error(`1inch Fusion API returned status ${response.status}: ${body}`);
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
    const queryParams = {
      src: params.src,
      dst: params.dst,
      amount: params.amount,
      from: params.from,
      slippage: params.slippage.toString(),
      disableEstimate: (params.disableEstimate || false).toString(),
      allowPartialFill: (params.allowPartialFill || false).toString(),
    };

    return this.call1inchAPI<SwapResponse>("/swap", queryParams);
  }

  /**
   * Sign and send a transaction (requires private key)
   */
  async signAndSendTransaction(tx: TransactionPayload): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error(
        "Wallet client not initialized. Private key required for transactions."
      );
    }

    console.log("Estimating gas for transaction...");
    const gas = await this.publicClient.estimateGas({
      account: this.config.walletAddress as Hex,
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.value),
    });

    const latestBlock = await this.publicClient.getBlock();
    const baseFeePerGas = latestBlock.baseFeePerGas;

    const nonce = await this.publicClient.getTransactionCount({
      address: this.account.address,
      blockTag: "pending",
    });

    try {
      if (baseFeePerGas !== null && baseFeePerGas !== undefined) {
        console.log("Using EIP-1559 transaction format");
        const fee = await this.publicClient.estimateFeesPerGas();

        return await this.walletClient.sendTransaction({
          account: this.account,
          to: tx.to,
          data: tx.data,
          value: BigInt(tx.value),
          gas,
          maxFeePerGas: fee.maxFeePerGas,
          maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
          chain: baseSepolia,
          nonce,
        });
      } else {
        console.log("Using legacy transaction format");
        const gasPrice = await this.publicClient.getGasPrice();

        return await this.walletClient.sendTransaction({
          account: this.account,
          to: tx.to,
          data: tx.data,
          value: BigInt(tx.value),
          gas,
          gasPrice,
          chain: baseSepolia,
          nonce,
        });
      }
    } catch (err) {
      console.error("Transaction signing or broadcasting failed");
      console.error("Transaction data:", tx);
      console.error("Gas:", gas.toString());
      console.error("Nonce:", nonce.toString());
      throw err;
    }
  }

  /**
   * Complete swap flow: check allowance, approve if needed, then swap
   */
  async performSwap(
    params: SwapParams
  ): Promise<{ approvalTxHash?: string; swapTxHash: string }> {
    if (!this.walletClient) {
      throw new Error("Wallet client required for performing swaps");
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

        const approvalTxHash = await this.signAndSendTransaction({
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

    const swapTxHash = await this.signAndSendTransaction(swapTx.tx);
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

    if (remainder === 0n) {
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
    return (
      BigInt(whole) * BigInt(10 ** decimals) +
      BigInt(paddedFractional)
    ).toString();
  }

  // ===== INTENT SWAP (FUSION) METHODS =====

  /**
   * Get a quote for an Intent swap (Fusion mode)
   * Gasless swaps with Dutch auction mechanism
   */
  async getIntentSwapQuote(params: IntentSwapParams): Promise<IntentSwapQuoteResponse> {
    const queryParams = {
      srcToken: params.srcToken,
      dstToken: params.dstToken,
      amount: params.amount,
      walletAddress: params.walletAddress,
      ...(params.preset && { preset: params.preset }),
      ...(params.takingSurplusRecipient && { takingSurplusRecipient: params.takingSurplusRecipient }),
      ...(params.permits && { permits: params.permits }),
      ...(params.receiver && { receiver: params.receiver }),
      ...(params.nonce && { nonce: params.nonce }),
    };

    return this.callFusionAPI<IntentSwapQuoteResponse>("/quote/receive", queryParams);
  }

  /**
   * Create an Intent swap order (Fusion mode)
   * This creates a gasless order that will be filled by resolvers
   */
  async createIntentSwapOrder(params: IntentSwapOrderRequest): Promise<IntentSwapOrderResponse> {
    const body = {
      srcToken: params.srcToken,
      dstToken: params.dstToken,
      amount: params.amount,
      walletAddress: params.walletAddress,
      ...(params.preset && { preset: params.preset }),
      ...(params.takingSurplusRecipient && { takingSurplusRecipient: params.takingSurplusRecipient }),
      ...(params.permits && { permits: params.permits }),
      ...(params.receiver && { receiver: params.receiver }),
      ...(params.nonce && { nonce: params.nonce }),
    };

    return this.callFusionAPI<IntentSwapOrderResponse>("/order/submit", {}, "POST", body);
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
  async getActiveOrders(walletAddress: string, limit: number = 100): Promise<OrderStatus[]> {
    const queryParams = {
      address: walletAddress,
      limit: limit.toString(),
    };

    const response = await this.callFusionAPI<{ orders: OrderStatus[] }>("/orders", queryParams);
    return response.orders || [];
  }

  /**
   * Cancel an Intent swap order
   */
  async cancelOrder(orderHash: string): Promise<{ success: boolean; txHash?: string }> {
    try {
      const response = await this.callFusionAPI<{ txHash: string }>(`/orders/${orderHash}/cancel`, {}, "POST");
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
      ...(params.takingSurplusRecipient && { takingSurplusRecipient: params.takingSurplusRecipient }),
      ...(params.permits && { permits: params.permits }),
      ...(params.receiver && { receiver: params.receiver }),
      ...(params.nonce && { nonce: params.nonce }),
    };

    const orderResponse = await this.createIntentSwapOrder(orderRequest);
    
    console.log("Intent swap order created:", {
      orderHash: orderResponse.orderHash,
      quoteId: orderResponse.quoteId
    });

    return {
      orderHash: orderResponse.orderHash,
      quoteId: orderResponse.quoteId,
    };
  }
}

export default OneInchService;
