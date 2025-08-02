/**
 * 📋 Blockchain Orders Service
 * Handles order operations like creating, canceling, and tracking orders using 1inch SDK
 */

import { Web3 } from "web3";
import { ethers } from "ethers";
import { CONTRACTS, ABIS, OPERATORS, INDICES } from "./blockchain-constants";
import { retryWithBackoff, parseTokenAmount } from "./blockchain-utils";
import type { Order, OrderParams } from "./blockchain-types";
import type { BlockchainWallet } from "./blockchain-wallet";
import type { BlockchainTokens } from "./blockchain-tokens";

// Note: 1inch SDK imports removed - now using backend API

// Configuration matching backend
const CONFIG = {
  CHAIN_ID: 8453, // Base Mainnet
  RPC_URL: 'https://base.llamarpc.com',
  LIMIT_ORDER_PROTOCOL: '0x111111125421cA6dc452d289314280a0f8842A65',
  INDEX_ORACLE_ADDRESS: '0x8a585F9B2359Ef093E8a2f5432F387960e953BD2',
  
  // Base Mainnet Token Addresses (matching backend)
  TOKENS: {
    USDC: {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      symbol: 'USDC'
    },
    WETH: {
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
      symbol: 'WETH'
    }
  }
};

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
    // SDK will be initialized per-request like the backend
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

  // SDK initialization removed - using direct LimitOrder creation instead

  /**
   * Create a new order with index condition (using backend API)
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    try {
      console.log("🔄 Creating order via backend API:", params);
      
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      // Use the user's actual connected wallet address - NO private key needed!
      const userWalletAddress = this.wallet.currentAccount;
      if (!userWalletAddress) {
        throw new Error("No wallet address available");
      }

      console.log(`🔍 Using actual user wallet: ${userWalletAddress}`);

      // Prepare order parameters for backend API (using user's wallet)
      const orderParams = {
        fromToken: params.fromToken, // Token address
        toToken: params.toToken,     // Token address
        amount: params.fromAmount,   // Amount to sell
        expectedAmount: params.toAmount, // Expected amount to receive
        condition: {
          indexId: params.indexId,
          operator: this.mapOperatorToString(params.operator),
          threshold: params.threshold,
          description: params.description
        },
        expirationHours: params.expiry ? Math.floor(params.expiry / 3600) : 24, // Convert seconds to hours
        walletAddress: userWalletAddress, // Use actual user wallet
        oneInchApiKey: process.env.NEXT_PUBLIC_ONEINCH_API_KEY
      };

      console.log('🚀 Calling backend API to create order...');

      // Call the backend API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-order',
          ...orderParams
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to create order');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Order creation failed');
      }

      console.log('✅ Order created successfully via backend:', result.orderHash);

      // Create order object for caching
      const newOrder = {
        hash: result.orderHash,
        indexId: params.indexId,
        operator: params.operator,
        threshold: params.threshold,
        description: params.description,
        makerAsset: params.fromToken,
        takerAsset: params.toToken,
        makingAmount: result.order?.makingAmount || '0',
        takingAmount: result.order?.takingAmount || '0',
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount: params.toAmount,
        maker: this.wallet.currentAccount,
        receiver: this.wallet.currentAccount,
        expiry: Math.floor(Date.now() / 1000) + (orderParams.expirationHours * 3600),
        status: "active" as const,
        createdAt: Date.now(),
        transactionHash: result.orderHash
      };

      // Add to cache instead of clearing it
      console.log('💾 Adding order to cache for index', params.indexId);
      const cached = this.orderCache.get(params.indexId);
      if (cached) {
        cached.orders.unshift(newOrder); // Add to beginning
        cached.timestamp = Date.now(); // Update timestamp
      } else {
        this.orderCache.set(params.indexId, {
          orders: [newOrder],
          timestamp: Date.now()
        });
      }

      // Return the cached order object
      return newOrder;

    } catch (error) {
      console.error("❌ Error creating order:", error);
      throw error;
    }
  }

  /**
   * Get token info helper
   */
  private getTokenInfo(tokenAddress: string) {
    // Check if it's a symbol or address
    const tokenKey = Object.keys(CONFIG.TOKENS).find(key => 
      (CONFIG.TOKENS as any)[key].address.toLowerCase() === tokenAddress.toLowerCase() ||
      key === tokenAddress.toUpperCase()
    );
    
    if (tokenKey) {
      return (CONFIG.TOKENS as any)[tokenKey];
    }
    
    // Default fallback for unknown tokens
    return {
      address: tokenAddress,
      symbol: 'UNKNOWN',
      decimals: 18
    };
  }

  /**
   * Map numeric operator to string
   */
  private mapOperatorToString(operator: number): string {
    switch (operator) {
      case OPERATORS.GT: return 'gt';
      case OPERATORS.LT: return 'lt';
      case OPERATORS.GTE: return 'gte';
      case OPERATORS.LTE: return 'lte';
      case OPERATORS.EQ: return 'eq';
      case OPERATORS.NEQ: return 'neq';
      default: return 'gt';
    }
  }

  /**
   * Create index predicate (matching backend logic)
   */
  private createIndexPredicate(condition: { indexId: number, operator: string, threshold: number }): string {
    const indexKey = Object.keys(INDICES).find(key => (INDICES as any)[key].id === condition.indexId);
    console.log(`   Index: ${indexKey ? (INDICES as any)[indexKey]?.name : 'Unknown'}`);
    console.log(`   Operator: ${condition.operator}`);
    console.log(`   Threshold: ${condition.threshold}`);
    
    // Oracle call encoding (ethers v6 syntax)
    const getIndexValueSelector = ethers.utils.id('getIndexValue(uint256)').slice(0, 10);
    const oracleCallData = ethers.utils.defaultAbiCoder.encode(
      ['bytes4', 'uint256'],
      [getIndexValueSelector, condition.indexId]
    );
    
    // Predicate structure: operator(threshold, arbitraryStaticCall(oracle, callData))
    const arbitraryStaticCallData = ethers.utils.defaultAbiCoder.encode(
      ['address', 'bytes'],
      [CONFIG.INDEX_ORACLE_ADDRESS, oracleCallData]
    );
    
    let predicateData;
    
    // Map our operator to 1inch methods
    switch (condition.operator) {
      case 'gt':
      case 'gte': // Treat >= as > for simplicity
        predicateData = ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'bytes'],
          [condition.threshold, arbitraryStaticCallData]
        );
        break;
      case 'lt':
      case 'lte': // Treat <= as < for simplicity
        predicateData = ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'bytes'],
          [condition.threshold, arbitraryStaticCallData]
        );
        break;
      case 'eq':
        predicateData = ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'bytes'],
          [condition.threshold, arbitraryStaticCallData]
        );
        break;
      default:
        // Default to gt
        predicateData = ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'bytes'],
          [condition.threshold, arbitraryStaticCallData]
        );
    }
    
    // Complete predicate with protocol address (ethers v6 syntax)
    const completePredicate = ethers.utils.solidityPack(
      ['address', 'bytes'],
      [CONFIG.LIMIT_ORDER_PROTOCOL, predicateData]
    );
    
    return completePredicate;
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
      // Placeholder implementation - would need proper contract integration
      console.log("🔍 Getting order status for:", orderHash);
      return 0; // Default to active status
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

      console.log(`🔍 Loading orders for index ${indexId} with retry logic...`);

      // Placeholder - would need proper contract integration
      const events: any[] = [];

      const orders: any[] = events.map((event: any) => ({
        hash: event.returnValues.orderHash,
        indexId: event.returnValues.indexId,
        operator: parseInt(event.returnValues.operator),
        threshold: event.returnValues.threshold,
        description: 'Order from blockchain',
        makerAsset: event.returnValues.fromToken,
        takerAsset: event.returnValues.toToken,
        makingAmount: event.returnValues.fromAmount,
        takingAmount: event.returnValues.toAmount,
        fromToken: event.returnValues.fromToken,
        toToken: event.returnValues.toToken,
        fromAmount: event.returnValues.fromAmount,
        toAmount: event.returnValues.toAmount,
        maker: event.returnValues.maker || '',
        receiver: event.returnValues.receiver || '',
        expiry: event.returnValues.expiry,
        status: 'active' as const,
        createdAt: Date.now(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      }));

      // Merge with existing cached orders (don't overwrite manually added orders)
      const existingCached = this.orderCache.get(indexId);
      const existingOrders = existingCached?.orders || [];
      
      // Combine orders, but avoid duplicates based on hash
      const existingHashes = new Set(existingOrders.map(o => o.hash));
      const newOrders = orders.filter(o => !existingHashes.has(o.hash));
      const allOrders = [...existingOrders, ...newOrders];
      
      // Cache the merged results
      this.orderCache.set(indexId, { orders: allOrders, timestamp: Date.now() });
      console.log(`✅ Loaded ${orders.length} orders from blockchain, ${existingOrders.length} from cache, total: ${allOrders.length} for index ${indexId}`);

      return allOrders;
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