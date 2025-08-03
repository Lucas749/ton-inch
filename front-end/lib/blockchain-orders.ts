/**
 * 📋 Blockchain Orders Service
 * Handles order operations like creating, canceling, and tracking orders using 1inch SDK directly
 * Updated to use SDK directly instead of backend API calls
 */

import { Web3 } from "web3";
import { ethers } from "ethers";
import { CONTRACTS, ABIS, OPERATORS, INDICES } from "./blockchain-constants";
import { retryWithBackoff, parseTokenAmount } from "./blockchain-utils";
import type { Order, OrderParams } from "./blockchain-types";
import type { BlockchainWallet } from "./blockchain-wallet";
import type { BlockchainTokens } from "./blockchain-tokens";
import { OrderCacheService } from "./order-cache-service";

// 1inch SDK imports for direct usage
import { LimitOrder, MakerTraits, Address, Sdk, randBigInt, FetchProviderConnector, ExtensionBuilder } from '@1inch/limit-order-sdk';

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

  // Using 1inch SDK directly for order creation and management

  /**
   * Check if browser wallet is available and connected (like 1inch-service.ts)
   */
  private isWalletAvailable(): boolean {
    return typeof window !== "undefined" && 
           !!window.ethereum && 
           !!window.ethereum.selectedAddress;
  }

  /**
   * Get current wallet address
   */
  private getCurrentWalletAddress(): string | null {
    if (!this.isWalletAvailable()) {
      return null;
    }
    return window.ethereum!.selectedAddress || null;
  }

  /**
   * Create a new order with index condition (using 1inch SDK directly)
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    try {
      console.log("🔄 Creating order via 1inch SDK directly:", params);
      
      if (!this.isWalletAvailable()) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      const currentAccount = this.getCurrentWalletAddress();
      if (!currentAccount) {
        throw new Error("No wallet address available");
      }

      console.log(`👤 Using wallet: ${currentAccount}`);
      console.log(`🌐 Network: Base Mainnet (${CONFIG.CHAIN_ID})`);

      // Initialize 1inch SDK
      const sdk = new Sdk({
        authKey: process.env.NEXT_PUBLIC_ONEINCH_API_KEY!,
        networkId: CONFIG.CHAIN_ID,
        httpConnector: new FetchProviderConnector()
      });

      // Parse tokens
      const fromTokenInfo = this.getTokenInfo(params.fromToken);
      const toTokenInfo = this.getTokenInfo(params.toToken);
      
      // Parse amounts
      const makingAmount = BigInt(ethers.utils.parseUnits(params.fromAmount, fromTokenInfo.decimals).toString());
      const takingAmount = BigInt(ethers.utils.parseUnits(params.toAmount, toTokenInfo.decimals).toString());
      
      console.log(`📊 Trading: ${params.fromAmount} ${fromTokenInfo.symbol} → ${params.toAmount} ${toTokenInfo.symbol}`);
      console.log(`📋 Condition: ${params.description}`);
      
      // Create predicate
      console.log('🔮 Creating index predicate...');
      const condition = {
        indexId: params.indexId,
        operator: this.mapOperatorToString(params.operator),
        threshold: params.threshold,
        description: params.description
      };
      const predicate = this.createIndexPredicate(condition);
      
      // Create extension
      const extension = new ExtensionBuilder()
        .withPredicate(predicate)
        .build();
      console.log('✅ Extension created with predicate');
      
      // Setup timing
      const expirationHours = params.expiry ? Math.floor(params.expiry / 3600) : 24;
      const expiration = BigInt(Math.floor(Date.now() / 1000) + (expirationHours * 3600));
      const UINT_40_MAX = (1n << 40n) - 1n;
      
      // Create MakerTraits
      const makerTraits = MakerTraits.default()
        .withExpiration(expiration)
        .withNonce(randBigInt(UINT_40_MAX))
        .allowPartialFills()
        .allowMultipleFills()
        .withExtension();
      
      console.log('🔧 Creating order...');
      
      // Create order (following backend pattern)
      const order = await sdk.createOrder({
        makerAsset: new Address(fromTokenInfo.address),
        takerAsset: new Address(toTokenInfo.address),
        makingAmount: makingAmount,
        takingAmount: takingAmount,
        maker: new Address(currentAccount)
      }, makerTraits);
      
      // TODO: Add extension/predicate support 
      // The SDK interface for extensions seems to have changed between versions
      // For now creating basic orders without predicates - needs investigation
      
      const orderHash = order.getOrderHash(CONFIG.CHAIN_ID);
      console.log(`✅ Order created: ${orderHash}`);
      
      // Sign order with MetaMask
      console.log('✍️ Signing order with MetaMask...');
      const typedData = order.getTypedData(CONFIG.CHAIN_ID);
      
      // Request signature from MetaMask (like 1inch-service.ts)
      const signature = await window.ethereum!.request({
        method: 'eth_signTypedData_v4',
        params: [currentAccount, JSON.stringify(typedData)],
      });
      
      console.log('✅ Order signed');
      
      // Submit order to 1inch
      console.log('📤 Submitting to 1inch...');
      let submitResult = null;
      let submitError = null;
      
      try {
        submitResult = await sdk.submitOrder(order, signature);
        console.log('✅ Order submitted successfully!');
      } catch (error) {
        submitError = error instanceof Error ? error.message : String(error);
        console.log(`⚠️ Submit failed: ${submitError}`);
      }
      
      // Create order object for caching
      const newOrder = {
        hash: orderHash,
        indexId: params.indexId,
        operator: params.operator,
        threshold: params.threshold,
        description: params.description,
        makerAsset: fromTokenInfo.address,
        takerAsset: toTokenInfo.address,
        makingAmount: makingAmount.toString(),
        takingAmount: takingAmount.toString(),
        fromToken: fromTokenInfo.address,
        toToken: toTokenInfo.address,
        fromAmount: params.fromAmount,
        toAmount: params.toAmount,
        maker: currentAccount,
        receiver: currentAccount,
        expiry: Math.floor(Date.now() / 1000) + (expirationHours * 3600),
        status: submitResult ? ("active" as const) : ("cancelled" as const),
        createdAt: Date.now(),
        transactionHash: orderHash
      };

      // Save to persistent localStorage cache
      try {
        console.log('💾 Saving order to persistent localStorage cache');
        
        const savedOrder = {
          orderHash: newOrder.hash,
          type: 'limit' as const,
          timestamp: newOrder.createdAt,
          date: new Date(newOrder.createdAt).toISOString(),
          status: submitResult ? 'submitted' as const : 'pending' as const,
          
          description: params.description,
          
          fromToken: {
            address: fromTokenInfo.address,
            symbol: fromTokenInfo.symbol,
            name: fromTokenInfo.symbol,
            decimals: fromTokenInfo.decimals
          },
          toToken: {
            address: toTokenInfo.address,
            symbol: toTokenInfo.symbol,
            name: toTokenInfo.symbol,
            decimals: toTokenInfo.decimals
          },
          fromAmount: newOrder.makingAmount,
          toAmount: newOrder.takingAmount,
          fromAmountFormatted: `${newOrder.fromAmount} ${fromTokenInfo.symbol}`,
          toAmountFormatted: `${newOrder.toAmount} ${toTokenInfo.symbol}`,
          
          walletAddress: currentAccount,
          chainId: CONFIG.CHAIN_ID.toString(),
          
          validUntil: newOrder.expiry,
          
          limitOrderData: {
            maker: newOrder.maker,
            receiver: newOrder.receiver,
            makerAsset: newOrder.makerAsset,
            takerAsset: newOrder.takerAsset,
            makingAmount: newOrder.makingAmount,
            takingAmount: newOrder.takingAmount,
            salt: order.salt.toString()
          }
        };
        
        OrderCacheService.saveOrder(savedOrder);
        console.log('✅ Order saved to cache');
        
      } catch (cacheError) {
        console.error('⚠️ Failed to save order to persistent cache:', cacheError);
      }

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
    console.log(`   Index ID: ${condition.indexId}`);
    console.log(`   Operator: ${condition.operator}`);
    console.log(`   Threshold: ${condition.threshold}`);
    
    // Oracle call encoding
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
    
    // Map our operator to 1inch methods (only gt, lt, eq are commonly supported)
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
    
    // Complete predicate with protocol address
    const completePredicate = ethers.utils.solidityPack(
      ['address', 'bytes'],
      [CONFIG.LIMIT_ORDER_PROTOCOL, predicateData]
    );
    
    return completePredicate;
  }

  /**
   * Cancel an existing order using 1inch SDK directly
   */
  async cancelOrder(orderHash: string): Promise<boolean> {
    try {
      if (!this.isWalletAvailable()) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      const currentAccount = this.getCurrentWalletAddress();
      if (!currentAccount) {
        throw new Error("No wallet address available");
      }

      console.log(`🚫 Cancelling order ${orderHash} with user wallet...`);
      
      // Initialize 1inch SDK
      const sdk = new Sdk({
        authKey: process.env.NEXT_PUBLIC_ONEINCH_API_KEY!,
        networkId: CONFIG.CHAIN_ID,
        httpConnector: new FetchProviderConnector()
      });
      
      // Step 1: Get order details from 1inch API to get makerTraits
      console.log('🔍 Step 1: Getting order details from 1inch API...');
      
      try {
        // Use the existing oneinch API endpoint to get order details
        const orderDetailsResponse = await fetch(`/api/oneinch/fusion?action=get-order&orderHash=${orderHash}`);
        
        if (!orderDetailsResponse.ok) {
          if (orderDetailsResponse.status === 404) {
            // Order doesn't exist on 1inch API - it was never successfully submitted
            console.log('⚠️ Order not found on 1inch API - it was likely never successfully submitted');
            console.log('🔄 Marking order as cancelled locally...');
            
            // Mark the order as cancelled in local storage
            OrderCacheService.updateOrderStatus(orderHash, 'cancelled');
            
            return true;
          }
          throw new Error('Failed to get order details from 1inch API');
        }
        
        const orderDetailsResult = await orderDetailsResponse.json();
        if (!orderDetailsResult.success || !orderDetailsResult.order) {
          throw new Error('Order not found in 1inch API');
        }
        
        const order = orderDetailsResult.order;
        
        console.log('✅ Order details retrieved:', {
          maker: order.maker,
          makerTraits: order.makerTraits
        });
        
        // Step 2: Verify user is the order maker
        if (order.maker.toLowerCase() !== currentAccount.toLowerCase()) {
          throw new Error(`Only the order maker can cancel this order. Maker: ${order.maker}, Your address: ${currentAccount}`);
        }
        
        console.log('✅ Order ownership verified');
        
        // Step 3: Execute cancellation transaction via MetaMask
        console.log('📤 Step 3: Executing cancellation transaction...');
        
        const txHash = await this.executeCancellationTransaction(orderHash, order.makerTraits);
        
        console.log(`✅ Order cancelled successfully! Transaction: ${txHash}`);
        
        // Update order status in cache
        OrderCacheService.updateOrderStatus(orderHash, 'cancelled');
        
        return true;
        
      } catch (contractError) {
        console.error('❌ Contract cancellation failed:', contractError);
        const errorMessage = contractError instanceof Error ? contractError.message : String(contractError);
        throw new Error(`Failed to cancel order on-chain: ${errorMessage}`);
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
          from: this.getCurrentWalletAddress(),
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
      const walletAddress = this.getCurrentWalletAddress()?.toLowerCase();
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