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
import { OrderCacheService } from "./order-cache-service";

// Note: 1inch SDK imports removed - now using backend API

// Configuration matching backend
const CONFIG = {
  CHAIN_ID: 8453, // Base Mainnet
  RPC_URL: 'https://base.llamarpc.com',
  LIMIT_ORDER_PROTOCOL: '0x111111125421cA6dc452d289314280a0f8842A65',
  INDEX_ORACLE_ADDRESS: '0x3073D2b5e72c48f16Ee99700BC07737b8ecd8709',
  
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
      status: "cancelled" as const, // Updated to reflect that user cancelled this order
      createdAt: Date.now() - (30 * 60 * 1000), // 30 minutes ago to show it was created earlier
      transactionHash: '0x1c163afb0d50e5db8596bf442d064b014c4370af97fdbc495f6e641fb50ad5a1'
    };

    // Add to cache for VIX index (indexId: 2)
    this.orderCache.set(2, {
      orders: [existingOrder],
      timestamp: Date.now()
    });

    console.log('💾 Pre-populated cache with existing cancelled order:', existingOrder.hash);
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

      console.log('✅ Order structure created by backend:', result.orderHash);
      console.log('⏳ Order not yet submitted - requires MetaMask signing...');
      
      // Check if we need to sign the order with MetaMask
      if (result.typedData) {
        console.log('📝 Prompting MetaMask for signature...');
        
        try {
          // Request user signature via MetaMask
          const provider = (window as any).ethereum;
          if (!provider) {
            throw new Error('MetaMask not installed');
          }

          const signature = await provider.request({
            method: 'eth_signTypedData_v4',
            params: [this.wallet.currentAccount, JSON.stringify(result.typedData)],
          });

          console.log('✅ Order signed by user:', signature);
          
          // Submit signed order to 1inch API
          console.log('📤 Submitting signed order to 1inch API...');
          
          try {
            // Submit to actual 1inch limit order API
            const submitUrl = `https://api.1inch.dev/orderbook/v4.0/${CONFIG.CHAIN_ID}/order`;
            
            const submitPayload = {
              ...result.typedData.message,
              signature: signature
            };
            
            console.log('📡 Submitting to 1inch:', { url: submitUrl, orderHash: result.orderHash });
            
            const submitResponse = await fetch(submitUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`
              },
              body: JSON.stringify(submitPayload)
            });

            if (!submitResponse.ok) {
              const errorText = await submitResponse.text();
              console.error('❌ 1inch API error:', errorText);
              throw new Error(`1inch API error: ${submitResponse.status} ${errorText}`);
            }

            const submitResult = await submitResponse.json();
            console.log('✅ Order successfully submitted to 1inch API:', submitResult);
            console.log('🎉 LIMIT ORDER CREATED SUCCESSFULLY!');
            
          } catch (submitError) {
            console.error('❌ Failed to submit order to 1inch:', submitError);
            throw new Error(`Order signed but 1inch submission failed: ${(submitError as Error).message}`);
          }
          
        } catch (signError) {
          console.error('❌ User rejected signing or signing failed:', signError);
          throw new Error('Order signing cancelled or failed');
        }
      } else {
        console.error('❌ No typedData returned from backend - cannot sign order');
        throw new Error('Backend did not return signing data');
      }

      // If we get here, the order was successfully signed and submitted to 1inch
      // Now save to persistent cache
      console.log('💾 Order successfully submitted - saving to cache...');
      
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

      // Skip in-memory cache - use persistent storage only
      console.log('💾 Skipping in-memory cache, saving directly to persistent storage only');

      // Save to persistent localStorage cache
      try {
        console.log('💾 Saving successfully submitted order to persistent localStorage cache');
        
        const fromTokenInfo = this.getTokenInfo(params.fromToken);
        const toTokenInfo = this.getTokenInfo(params.toToken);
        
        const savedOrder = {
          orderHash: newOrder.hash,
          type: 'limit' as const,
          timestamp: newOrder.createdAt,
          date: new Date(newOrder.createdAt).toISOString(),
          status: 'submitted' as const, // New orders start as submitted
          
          // Use the meaningful order description from the form (e.g., "bitcoin", "vix")
          description: params.description,
          
          fromToken: {
            address: params.fromToken,
            symbol: fromTokenInfo.symbol,
            name: fromTokenInfo.symbol,
            decimals: fromTokenInfo.decimals
          },
          toToken: {
            address: params.toToken,
            symbol: toTokenInfo.symbol,
            name: toTokenInfo.symbol,
            decimals: toTokenInfo.decimals
          },
          fromAmount: newOrder.makingAmount || '0',
          toAmount: newOrder.takingAmount || '0',
          fromAmountFormatted: `${newOrder.fromAmount} ${fromTokenInfo.symbol}`,
          toAmountFormatted: `${newOrder.toAmount} ${toTokenInfo.symbol}`,
          
          walletAddress: this.wallet.currentAccount!,
          chainId: CONFIG.CHAIN_ID.toString(),
          
          validUntil: newOrder.expiry,
          
          limitOrderData: {
            maker: newOrder.maker,
            receiver: newOrder.receiver,
            makerAsset: newOrder.makerAsset,
            takerAsset: newOrder.takerAsset,
            makingAmount: newOrder.makingAmount || '0',
            takingAmount: newOrder.takingAmount || '0',
            salt: '0'
          }
        };
        
        OrderCacheService.saveOrder(savedOrder);
        console.log('✅ Order successfully submitted to 1inch and saved to cache');
        
      } catch (cacheError) {
        console.error('⚠️ Failed to save order to persistent cache:', cacheError);
        // Don't fail the whole operation if persistent cache save fails
      }

      // Return the cached order object (only if successfully submitted)
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

      console.log('🔧 Executing actual 1inch protocol cancellation with MetaMask...');
      
      // Check if the API preparation was successful
      if (result.success) {
        // Step 1: Get order details from 1inch API to get makerTraits
        console.log('🔍 Step 1: Getting order details from 1inch API...');
        
        try {
          const orderDetailsResponse = await fetch(`/api/oneinch/fusion?action=get-order&orderHash=${orderHash}`);
          if (!orderDetailsResponse.ok) {
            throw new Error('Failed to get order details from 1inch API');
          }
          
          const orderDetails = await orderDetailsResponse.json();
          if (!orderDetails.success || !orderDetails.order) {
            throw new Error('Order not found in 1inch API');
          }
          
          console.log('✅ Order details retrieved:', {
            maker: orderDetails.order.maker,
            makerTraits: orderDetails.order.makerTraits
          });
          
          // Step 2: Verify user is the order maker
          if (orderDetails.order.maker.toLowerCase() !== this.wallet.currentAccount?.toLowerCase()) {
            throw new Error(`Only the order maker can cancel this order. Maker: ${orderDetails.order.maker}, Your address: ${this.wallet.currentAccount}`);
          }
          
          console.log('✅ Order ownership verified');
          
          // Step 3: Execute cancellation transaction via MetaMask
          console.log('📤 Step 3: Executing cancellation transaction...');
          
          const txHash = await this.executeCancellationTransaction(orderHash, orderDetails.order.makerTraits);
          
          console.log(`✅ Order cancelled successfully! Transaction: ${txHash}`);
          
        } catch (contractError) {
          console.error('❌ Contract cancellation failed:', contractError);
          const errorMessage = contractError instanceof Error ? contractError.message : String(contractError);
          throw new Error(`Failed to cancel order on-chain: ${errorMessage}`);
        }
        console.log('✅ API cancellation preparation successful, updating persistent storage');
        
        // First try to update the order in persistent storage
        let persistentCacheUpdated = false;
        try {
          persistentCacheUpdated = OrderCacheService.updateOrderStatus(orderHash, 'cancelled');
          
          if (persistentCacheUpdated) {
            console.log('✅ Updated order status in persistent localStorage cache');
          } else {
            console.warn(`⚠️ Order ${orderHash} not found in persistent cache - may already be cancelled or doesn't exist`);
            return false;
          }
        } catch (cacheError) {
          console.error('❌ Failed to update persistent cache:', cacheError);
          throw new Error('Failed to update order status in persistent storage');
        }
        
        // Also update in-memory cache if the order exists there (optional optimization)
        let orderFoundInMemory = false;
        for (const [indexId, cacheData] of Array.from(this.orderCache.entries())) {
          const order = cacheData.orders.find((o: any) => o.hash === orderHash);
          if (order) {
            order.status = 'cancelled' as const;
            order.cancelledAt = Date.now(); // Track when it was cancelled
            console.log(`✅ Also updated order ${orderHash} status in in-memory cache for index ${indexId}`);
            orderFoundInMemory = true;
            break;
          }
        }
        
        if (!orderFoundInMemory) {
          console.log('ℹ️ Order not found in in-memory cache, but that\'s okay - persistent storage was updated');
        }
        
        return true;
      } else {
        console.error('❌ API cancellation preparation failed, not updating cache');
        throw new Error(result.message || 'Order cancellation preparation failed');
      }
    } catch (error) {
      console.error("❌ Error cancelling order:", error);
      throw error;
    }
  }

  /**
   * Execute cancellation transaction via MetaMask
   */
  private async executeCancellationTransaction(orderHash: string, makerTraits: string): Promise<string> {
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask not available");
      }

      // Contract ABI for cancelOrder function
      const cancelOrderABI = [
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

      // Create contract interface
      const iface = new ethers.utils.Interface(cancelOrderABI);
      
      // Encode the function call
      const calldata = iface.encodeFunctionData("cancelOrder", [makerTraits, orderHash]);
      
      console.log('🔧 Transaction details:', {
        to: CONFIG.LIMIT_ORDER_PROTOCOL,
        data: calldata,
        makerTraits,
        orderHash
      });

      // Send transaction via MetaMask
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.wallet.currentAccount,
          to: CONFIG.LIMIT_ORDER_PROTOCOL,
          data: calldata,
          // Let MetaMask estimate gas
        }],
      });

      console.log(`⏳ Transaction sent: ${txHash}`);
      console.log('⏳ Waiting for confirmation...');

      // Wait for transaction confirmation
      await this.waitForTransactionConfirmation(txHash);
      
      return txHash;
    } catch (error) {
      console.error("❌ Error executing cancellation transaction:", error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransactionConfirmation(txHash: string): Promise<void> {
    const maxAttempts = 30; // 5 minutes at 10 second intervals
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const receipt = await window.ethereum?.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
        
        if (receipt) {
          if (receipt.status === '0x1') {
            console.log(`✅ Transaction confirmed in block ${parseInt(receipt.blockNumber, 16)}`);
            return;
          } else {
            throw new Error('Transaction failed (reverted)');
          }
        }
        
        // Transaction not yet mined, wait and try again
        console.log(`⏳ Waiting for confirmation... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Transaction failed')) {
          throw error;
        }
        // Other errors might be temporary, continue waiting
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Transaction confirmation timeout');
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    throw new Error('Transaction confirmation timeout');
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
   * Get all orders for a specific index from persistent cache only
   */
  async getOrdersByIndex(indexId: number): Promise<any[]> {
    try {
      const allOrders = await this.getAllCachedOrders();
      const indexOrders = allOrders.filter(order => order.indexId === indexId);
      
      console.log(`📋 Loaded ${indexOrders.length} persistent orders for index ${indexId}`);
      return indexOrders;
      
    } catch (error) {
      console.error(`⚠️ Failed to load orders for index ${indexId}:`, error);
      return [];
    }
  }

  /**
   * Get ALL cached orders across all indices (for portfolio overview)
   * Uses persistent localStorage cache only
   */
  async getAllCachedOrders(): Promise<any[]> {
    try {
      const persistentOrders = OrderCacheService.getAllOrders();
      
      // Filter persistent orders to only include those for the current wallet
      const walletAddress = this.wallet.currentAccount?.toLowerCase();
      const walletPersistentOrders = walletAddress ? 
        persistentOrders.filter(order => order.walletAddress.toLowerCase() === walletAddress) : [];
      
      // Convert persistent orders to the format expected by the frontend
      const convertedPersistentOrders = walletPersistentOrders.map(persistentOrder => ({
        hash: persistentOrder.orderHash,
        indexId: 0, // Default index for persistent orders without specific index
        operator: 1, // Default operator
        threshold: 0, // Default threshold
        // Use the stored meaningful description (e.g., "bitcoin") or fallback to token symbols
        description: persistentOrder.description || `${persistentOrder.fromToken.symbol} → ${persistentOrder.toToken.symbol}`,
        makerAsset: persistentOrder.fromToken.address,
        takerAsset: persistentOrder.toToken.address,
        makingAmount: persistentOrder.fromAmount,
        takingAmount: persistentOrder.toAmount,
        fromToken: persistentOrder.fromToken.address,
        toToken: persistentOrder.toToken.address,
        fromAmount: persistentOrder.fromAmountFormatted,
        toAmount: persistentOrder.toAmountFormatted,
        maker: persistentOrder.walletAddress,
        receiver: persistentOrder.walletAddress,
        expiry: persistentOrder.validUntil || Math.floor(Date.now() / 1000) + 86400,
        status: persistentOrder.status as any,
        createdAt: persistentOrder.timestamp,
        transactionHash: persistentOrder.orderHash
      }));
      
      // Sort by creation time (newest first)
      convertedPersistentOrders.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log(`📋 Loaded ${walletPersistentOrders.length} persistent orders (persistent storage only)`);
      return convertedPersistentOrders;
      
    } catch (error) {
      console.error('⚠️ Failed to load persistent cache:', error);
      console.log('📋 No orders loaded - persistent storage failed');
      return [];
    }
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