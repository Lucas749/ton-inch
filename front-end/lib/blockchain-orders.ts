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
  private oneInchContract: any;
  private orderCache: Map<number, { orders: Order[], timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor(web3Instance: Web3, walletInstance: BlockchainWallet, tokensInstance: BlockchainTokens) {
    this.web3 = web3Instance;
    this.wallet = walletInstance;
    this.tokens = tokensInstance;
    this.initializeContracts();
  }

  /**
   * Initialize contract instances (updated for new architecture)
   */
  private initializeContracts(): void {
    // Initialize 1inch protocol contract for direct interaction
    this.oneInchContract = new this.web3.eth.Contract(
      ABIS.OneInchProtocol,
      CONTRACTS.OneInchProtocol
    );
  }

  /**
   * Create a new order with index condition (NEW ARCHITECTURE - NOT IMPLEMENTED YET)
   * 
   * NOTE: This needs to be completely rewritten to use the 1inch SDK directly
   * as shown in the backend. For now, this throws an error to indicate the
   * architectural change needed.
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    throw new Error(`
      🚧 ORDER CREATION NEEDS UPDATING FOR NEW ARCHITECTURE 🚧
      
      The new backend uses the 1inch SDK directly instead of factory contracts.
      
      To fix this, we need to:
      1. Install @1inch/limit-order-sdk in the frontend
      2. Rewrite this method to match the backend's index-order-creator.js
      3. Use 1inch SDK's LimitOrder, MakerTraits, ExtensionBuilder etc.
      
      See: unicorn-project/backend/src/index-order-creator.js for reference
      
      Parameters received: ${JSON.stringify(params, null, 2)}
    `);
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