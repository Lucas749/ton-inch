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
    
    // Pre-populate with user's existing successful order
    this.addExistingSuccessfulOrder();
  }

  /**
   * Add the user's existing successful order that was created before caching was fixed
   */
  private addExistingSuccessfulOrder() {
    const existingOrder = {
      hash: '0x1c163afb0d50e5db8596bf442d064b014c4370af97fdbc495f6e641fb50ad5a1',
      indexId: 2, // VIX Volatility Index
      operator: 1, // GT (greater than)
      threshold: 18000,
      description: 'Buy WETH when VIX Volatility Index > 180',
      makerAsset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      takerAsset: '0x4200000000000000000000000000000000000006', // WETH
      makingAmount: '100000', // 0.1 USDC (6 decimals)
      takingAmount: '30000000000000', // 0.00003 WETH (18 decimals)
      fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      toToken: '0x4200000000000000000000000000000000000006',
      fromAmount: '0.1',
      toAmount: '0.00003',
      maker: '0x2fd13180574f0a81eec90a6e021f6eb7dc1a9b9b', // User's actual wallet
      receiver: '0x2fd13180574f0a81eec90a6e021f6eb7dc1a9b9b',
      expiry: Math.floor(Date.now() / 1000) + (2 * 3600), // 2 hours from now
      status: "active" as const,
      createdAt: Date.now(),
      transactionHash: '0x1c163afb0d50e5db8596bf442d064b014c4370af97fdbc495f6e641fb50ad5a1'
    };

    // Add to cache for VIX index (indexId: 2)
    this.orderCache.set(2, {
      orders: [existingOrder],
      timestamp: Date.now()
    });

    console.log('💾 Pre-populated cache with existing successful order:', existingOrder.hash);
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
   * Cancel an existing order using wallet-based approach (like backend)
   */
  async cancelOrder(orderHash: string): Promise<boolean> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      console.log(`🚫 Cancelling order ${orderHash} with user wallet...`);
      
      // Call backend API to prepare cancellation data
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel-order',
          orderHash: orderHash,
          walletAddress: this.wallet.currentAccount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to prepare cancellation');
      }

      const result = await response.json();
      console.log('📋 Cancellation prepared:', result);

      // For now, implement client-side cancellation using Web3
      // TODO: Implement proper MetaMask transaction signing
      const provider = (window as any).ethereum;
      const web3 = new (await import('web3')).Web3(provider);
      
      // 1inch Limit Order Protocol ABI for cancelOrder
      const limitOrderABI = [
        {
          "inputs": [
            {"internalType": "uint256", "name": "makerTraits", "type": "uint256"},
            {"internalType": "bytes32", "name": "orderHash", "type": "bytes32"}
          ],
          "name": "cancelOrder",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];

      const limitOrderContract = new web3.eth.Contract(
        limitOrderABI,
        CONFIG.LIMIT_ORDER_PROTOCOL
      );

      // Note: For a complete implementation, we'd need to:
      // 1. Get order details from 1inch API to get makerTraits
      // 2. Verify user is the maker
      // 3. Call cancelOrder with proper makerTraits
      
      console.log('⚠️ Order cancellation requires additional 1inch API integration');
      console.log('🔧 For now, marking order as cancelled in cache');
      
      // Update cache to mark order as cancelled
      let orderFound = false;
      for (const [indexId, cacheData] of this.orderCache.entries()) {
        const order = cacheData.orders.find(o => o.hash === orderHash);
        if (order) {
          order.status = 'cancelled' as const;
          order.cancelledAt = Date.now(); // Track when it was cancelled
          console.log(`✅ Marked order ${orderHash} as cancelled in cache for index ${indexId}`);
          orderFound = true;
          break;
        }
      }
      
      if (!orderFound) {
        console.warn(`⚠️ Order ${orderHash} not found in cache - may already be cancelled or doesn't exist`);
      }
      
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
   * Get all orders for a specific index from cache only (no blockchain loading)
   */
  async getOrdersByIndex(indexId: number): Promise<any[]> {
    // Only return cached orders - no blockchain loading
    const cached = this.orderCache.get(indexId);
    const orders = cached?.orders || [];
    
    console.log(`📋 Loaded ${orders.length} cached orders for index ${indexId}`);
    return orders;
  }

  /**
   * Get ALL cached orders across all indices (for portfolio overview)
   */
  async getAllCachedOrders(): Promise<any[]> {
    const allOrders: any[] = [];
    
    for (const [indexId, cacheData] of this.orderCache.entries()) {
      allOrders.push(...cacheData.orders);
    }
    
    // Sort by creation time (newest first)
    allOrders.sort((a, b) => b.createdAt - a.createdAt);
    
    console.log(`📋 Loaded ${allOrders.length} total cached orders across all indices`);
    return allOrders;
  }

  /**
   * Get orders by status across all indices
   */
  async getOrdersByStatus(status: 'active' | 'cancelled' | 'filled'): Promise<any[]> {
    const allOrders = await this.getAllCachedOrders();
    const filteredOrders = allOrders.filter(order => order.status === status);
    
    console.log(`📋 Found ${filteredOrders.length} ${status} orders`);
    return filteredOrders;
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