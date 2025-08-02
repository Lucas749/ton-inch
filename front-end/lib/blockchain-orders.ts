/**
 * 📋 Blockchain Orders Service
 * Handles order operations like creating, canceling, and tracking orders
 */

import { Web3 } from "web3";
import { CONTRACTS, ABIS } from "./blockchain-constants";
import { retryWithBackoff, parseTokenAmount } from "./blockchain-utils";
import type { Order, OrderParams } from "./blockchain-types";
import type { BlockchainWallet } from "./blockchain-wallet";
import type { BlockchainTokens } from "./blockchain-tokens";

export class BlockchainOrders {
  private web3: Web3;
  private wallet: BlockchainWallet;
  private tokens: BlockchainTokens;
  private factory: any;
  private orderCache: Map<number, { orders: Order[], timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor(web3Instance: Web3, walletInstance: BlockchainWallet, tokensInstance: BlockchainTokens) {
    this.web3 = web3Instance;
    this.wallet = walletInstance;
    this.tokens = tokensInstance;
    this.initializeContracts();
  }

  /**
   * Initialize contract instances
   */
  private initializeContracts(): void {
    this.factory = new this.web3.eth.Contract(
      ABIS.IndexLimitOrderFactory,
      CONTRACTS.IndexLimitOrderFactory
    );
  }

  /**
   * Create a new order with index condition
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    try {
      console.log("🔄 Creating order with params:", params);
      
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      if (!this.factory) {
        throw new Error("Factory contract not initialized");
      }

      // Generate a random salt for order uniqueness
      const salt = Math.floor(Math.random() * 1000000);
      const maker = this.wallet.currentAccount;
      const receiver = this.wallet.currentAccount; // Same as maker for now
      const makerAsset = params.fromToken;
      const takerAsset = params.toToken;
      
      // Convert amounts to wei/smallest unit
      const makingAmount = parseTokenAmount(params.fromAmount, 6); // Assuming USDC (6 decimals)
      const takingAmount = parseTokenAmount(params.toAmount, 18); // Assuming WETH (18 decimals)
      
      const indexId = params.indexId;
      const operator = params.operator;
      const threshold = params.threshold;
      const expiry = Math.floor(Date.now() / 1000) + (params.expiry || 3600); // Default 1 hour

      console.log("🔄 Order parameters:", {
        salt, maker, receiver, makerAsset, takerAsset,
        makingAmount, takingAmount, indexId, operator, threshold, expiry
      });

      // First, approve the factory to spend the maker asset
      console.log("🔄 Approving factory to spend tokens...");
      await this.tokens.approveToken(params.fromToken, CONTRACTS.IndexLimitOrderFactory, makingAmount);
      console.log("✅ Token approval successful");

      // Now create the order using the new createIndexOrder function
      console.log("🔄 Creating index order...");
      const result = await this.factory.methods
        .createIndexOrder(
          salt, maker, receiver, makerAsset, takerAsset,
          makingAmount, takingAmount, indexId, operator, threshold, expiry
        )
        .send({
          from: this.wallet.currentAccount,
          gas: "500000",
        });

      console.log("✅ Order created!", result.transactionHash);

      // Extract the order hash from the IndexOrderCreated event
      let orderHash = result.transactionHash; // fallback
      if (result.events && result.events.IndexOrderCreated) {
        orderHash = result.events.IndexOrderCreated.returnValues.orderHash;
        console.log("📋 Order hash from event:", orderHash);
      }

      // Clear cache for this index so new order appears immediately
      this.clearOrderCache(params.indexId);

      // Return order object
      return {
        hash: orderHash,
        indexId: params.indexId,
        operator: params.operator,
        threshold: params.threshold,
        description: params.description,
        makerAsset: params.fromToken,
        takerAsset: params.toToken,
        makingAmount: makingAmount,
        takingAmount: takingAmount,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount: params.toAmount,
        maker: this.wallet.currentAccount,
        receiver: this.wallet.currentAccount,
        expiry,
        status: "active",
        createdAt: Date.now(),
        transactionHash: result.transactionHash,
      };

    } catch (error) {
      console.error("❌ Error creating order:", error);
      throw error;
    }
  }

  /**
   * Cancel an existing order using 1inch protocol
   */
  async cancelOrder(orderHash: string): Promise<boolean> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      // Use 1inch protocol directly for canceling orders
      const oneInchContract = new this.web3.eth.Contract(
        ABIS.OneInchProtocol,
        CONTRACTS.OneInchProtocol
      );

      console.log(`🔄 Canceling order ${orderHash} via 1inch protocol...`);
      
      const tx = await oneInchContract.methods.cancelOrder(orderHash).send({
        from: this.wallet.currentAccount,
        gas: "150000",
      });

      console.log("✅ Order cancelled:", tx.transactionHash);
      
      // Clear all cache since order status changed
      this.clearOrderCache();
      
      return true;
    } catch (error) {
      console.error("❌ Error cancelling order:", error);
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderHash: string): Promise<number> {
    try {
      const status = await this.factory.methods
        .getOrderStatus(orderHash)
        .call();
      return Number(status);
    } catch (error) {
      console.error("❌ Error getting order status:", error);
      throw error;
    }
  }

  /**
   * Get all orders for a specific index with retry logic and rate limiting
   */
  async getOrdersByIndex(indexId: number): Promise<any[]> {
    try {
      // Check cache first
      const cached = this.orderCache.get(indexId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`📋 Using cached orders for index ${indexId}`);
        return cached.orders;
      }

      if (!this.factory) {
        throw new Error("Factory contract not initialized");
      }

      console.log(`🔍 Loading orders for index ${indexId} with retry logic...`);

      // Use retry with backoff for robustness
      const events = await retryWithBackoff(async () => {
        return await this.factory.getPastEvents("IndexOrderCreated", {
          filter: { indexId },
          fromBlock: "earliest",
          toBlock: "latest",
        });
      });

      const orders = events.map((event: any) => ({
        hash: event.returnValues.orderHash,
        indexId: event.returnValues.indexId,
        operator: parseInt(event.returnValues.operator),
        threshold: event.returnValues.threshold,
        fromToken: event.returnValues.fromToken,
        toToken: event.returnValues.toToken,
        fromAmount: event.returnValues.fromAmount,
        toAmount: event.returnValues.toAmount,
        expiry: event.returnValues.expiry,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      }));

      // Cache the results
      this.orderCache.set(indexId, { orders, timestamp: Date.now() });
      console.log(`✅ Loaded ${orders.length} orders for index ${indexId}`);

      return orders;
    } catch (error) {
      console.error(`❌ Error fetching orders for index ${indexId}:`, error);

      // Return cached data if available, even if stale
      const cached = this.orderCache.get(indexId);
      if (cached) {
        console.log(`⚠️ Using stale cached orders for index ${indexId} due to error`);
        return cached.orders;
      }

      return [];
    }
  }

  /**
   * Clear order cache for a specific index (call after creating new orders)
   */
  clearOrderCache(indexId?: number): void {
    if (indexId !== undefined) {
      this.orderCache.delete(indexId);
      console.log(`🗑️ Cleared cache for index ${indexId}`);
    } else {
      this.orderCache.clear();
      console.log(`🗑️ Cleared all order cache`);
    }
  }

  /**
   * Reinitialize contracts (called when network changes)
   */
  reinitialize(): void {
    this.initializeContracts();
  }
}