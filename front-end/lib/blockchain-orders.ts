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

// Type for extended ethereum object
type ExtendedEthereum = {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  selectedAddress?: string | null;
  isMetaMask?: boolean;
  isPhantom?: boolean;
  providers?: any[];
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
};

// Using direct SDK approach like the working backend

// Token info interface
interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
}

// Index condition interface
interface IndexCondition {
  indexId: number;
  operator: string;
  threshold: number;
  description: string;
}

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
    } as TokenInfo,
    WETH: {
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
      symbol: 'WETH'
    } as TokenInfo
  }
} as const;

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
   * Check if browser wallet is available and connected (enhanced version)
   */
  private isWalletAvailable(): boolean {
    const hasWindow = typeof window !== "undefined";
    const hasEthereum = hasWindow && !!window.ethereum;
    
    const ethereum = window.ethereum as ExtendedEthereum | undefined;
    
    console.log('🔍 [BlockchainOrders] isWalletAvailable check:', {
      hasWindow,
      hasEthereum,
      selectedAddress: hasEthereum ? ethereum?.selectedAddress : null,
      isMetaMask: hasEthereum ? ethereum?.isMetaMask : false,
      isPhantom: hasEthereum ? ethereum?.isPhantom : false
    });

    // Check if browser environment and ethereum is available
    if (!hasWindow || !hasEthereum) {
      console.log('❌ [BlockchainOrders] No window or ethereum available');
      return false;
    }

    return true; // If ethereum is available, we can try to connect
  }

  /**
   * Request wallet connection (preferring MetaMask)
   */
  private async requestWalletConnection(): Promise<void> {
    try {
      // If both wallets present, try to connect to MetaMask specifically
      const ethereum = window.ethereum as ExtendedEthereum | undefined;
      if (ethereum?.isMetaMask && ethereum?.isPhantom && ethereum?.providers) {
        const metamaskProvider = ethereum.providers.find((p: any) => p.isMetaMask && !p.isPhantom);
        if (metamaskProvider) {
          console.log('🔄 [BlockchainOrders] Requesting MetaMask connection...');
          await metamaskProvider.request({ method: 'eth_requestAccounts' });
          return;
        }
      }
      
      // Default connection request
      console.log('🔄 [BlockchainOrders] Requesting wallet connection...');
      const defaultEthereum = window.ethereum as ExtendedEthereum;
      await defaultEthereum.request({ method: 'eth_requestAccounts' });
    } catch (error) {
      console.error('❌ [BlockchainOrders] Failed to connect wallet:', error);
      throw new Error('Failed to connect wallet. Please ensure MetaMask is installed and unlock your wallet.');
    }
  }

  /**
   * Get current wallet address (enhanced async version)
   */
  private async getCurrentWalletAddress(): Promise<string | null> {
    if (!this.isWalletAvailable()) {
      console.log('❌ [BlockchainOrders] Wallet not available');
      return null;
    }

    try {
      const ethereum = window.ethereum as ExtendedEthereum;
      
      // First check selectedAddress
      if (ethereum.selectedAddress) {
        console.log('✅ [BlockchainOrders] Found selectedAddress:', ethereum.selectedAddress);
        return ethereum.selectedAddress;
      }

      // If no selectedAddress, try to get accounts
      console.log('🔍 [BlockchainOrders] No selectedAddress, checking eth_accounts...');
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      
      if (accounts && accounts.length > 0) {
        console.log('✅ [BlockchainOrders] Found account via eth_accounts:', accounts[0]);
        return accounts[0];
      }

      // If still no account, try to request connection
      console.log('⚠️ [BlockchainOrders] No wallet address found, attempting to connect...');
      await this.requestWalletConnection();
      
      // Try again after connection
      const newAccounts = await ethereum.request({ method: 'eth_accounts' });
      if (newAccounts && newAccounts.length > 0) {
        console.log('✅ [BlockchainOrders] Connected and found account:', newAccounts[0]);
        return newAccounts[0];
      }

      console.log('❌ [BlockchainOrders] No wallet address found even after connection attempt');
      return null;
    } catch (error) {
      console.error('❌ [BlockchainOrders] Error getting wallet address:', error);
      return null;
    }
  }

  /**
   * Create a new order with index condition (using secure server flow)
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    try {
      console.log("🔄 Creating order via secure server flow:", params);
      
      if (!this.isWalletAvailable()) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      const currentAccount = await this.getCurrentWalletAddress();
      if (!currentAccount) {
        throw new Error("No wallet address available");
      }

      console.log(`👤 Using wallet: ${currentAccount}`);
      console.log(`🌐 Network: Base Mainnet (${CONFIG.CHAIN_ID})`);

      // Parse tokens for the order
      const fromTokenInfo = this.getTokenInfo(params.fromToken);
      const toTokenInfo = this.getTokenInfo(params.toToken);
      
      console.log(`📊 Trading: ${params.fromAmount} ${fromTokenInfo.symbol} → ${params.toAmount} ${toTokenInfo.symbol}`);
      console.log(`📋 Condition: ${params.description}`);
      
      // STEP 1: Prepare unsigned order on server
      console.log('📋 Step 1: Preparing unsigned order on server...');
      
      const orderRequest = {
        fromToken: fromTokenInfo.symbol,
        toToken: toTokenInfo.symbol,
        amount: params.fromAmount,
        expectedAmount: params.toAmount,
        condition: {
          indexId: params.indexId,
          operator: this.mapOperatorToString(params.operator),
          threshold: params.threshold,
          description: params.description
        },
        expirationHours: params.expiry ? Math.floor(params.expiry / 3600) : 24,
        makerAddress: currentAccount,
        config: {
          CHAIN_ID: CONFIG.CHAIN_ID,
          INDEX_ORACLE_ADDRESS: CONFIG.INDEX_ORACLE_ADDRESS,
          LIMIT_ORDER_PROTOCOL: CONFIG.LIMIT_ORDER_PROTOCOL
        }
      };

      console.log('📤 Sending order parameters to server...');
      const prepareResponse = await fetch('http://localhost:3001/orders/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderRequest)
      });

      if (!prepareResponse.ok) {
        const errorText = await prepareResponse.text();
        throw new Error(`Server preparation failed: ${errorText}`);
      }

      const prepareResult = await prepareResponse.json();
      if (!prepareResult.success) {
        throw new Error(`Order preparation failed: ${prepareResult.error}`);
      }

      console.log('✅ Server prepared unsigned order:', {
        orderHash: prepareResult.orderHash,
        orderId: prepareResult.orderId,
        condition: prepareResult.condition.description,
        expiration: prepareResult.order.expiration
      });

      // STEP 2: Sign the order with MetaMask
      console.log('✍️ Step 2: Signing order with MetaMask...');
      
      const ethereum = window.ethereum as ExtendedEthereum;
      const signature = await ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [currentAccount, JSON.stringify(prepareResult.signingData.typedData)]
      });
      
      console.log('✅ Order signed successfully');
      
      // STEP 3: Submit signed order back to server
      console.log('📤 Step 3: Submitting signed order to server...');
      
      const submitData = {
        orderData: prepareResult.signingData,
        signature: signature
      };

      const submitResponse = await fetch('http://localhost:3001/orders/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(`Server submission failed: ${errorText}`);
      }

      const submitResult = await submitResponse.json();
      
      console.log('📊 FINAL RESULT:', {
        success: submitResult.success,
        orderHash: submitResult.orderHash,
        submitted: submitResult.submission?.submitted || false
      });

      if (!submitResult.success) {
        throw new Error(`Order submission failed: ${submitResult.submission?.error || 'Unknown error'}`);
      }

      console.log('✅ Order submitted successfully to 1inch via server!');
      
      // Show success notification
      if (typeof window !== 'undefined') {
        // Create and show success popup
        this.showSuccessPopup(prepareResult.orderHash, params.description);
      }
      
      // Create order object for caching
      const newOrder = {
        hash: prepareResult.orderHash,
        indexId: params.indexId,
        operator: params.operator,
        threshold: params.threshold,
        description: params.description,
        makerAsset: fromTokenInfo.address,
        takerAsset: toTokenInfo.address,
        makingAmount: ethers.utils.parseUnits(params.fromAmount, fromTokenInfo.decimals).toString(),
        takingAmount: ethers.utils.parseUnits(params.toAmount, toTokenInfo.decimals).toString(),
        fromToken: fromTokenInfo.address,
        toToken: toTokenInfo.address,
        fromAmount: params.fromAmount,
        toAmount: params.toAmount,
        maker: currentAccount,
        receiver: currentAccount,
        expiry: Math.floor(Date.now() / 1000) + (orderRequest.expirationHours * 3600),
        status: submitResult.success ? ("active" as const) : ("cancelled" as const),
        createdAt: Date.now(),
        transactionHash: prepareResult.orderHash
      };

      // Save to persistent localStorage cache
      try {
        console.log('💾 Saving order to persistent localStorage cache');
        
        const savedOrder = {
          orderHash: newOrder.hash,
          type: 'limit' as const,
          timestamp: newOrder.createdAt,
          date: new Date(newOrder.createdAt).toISOString(),
          status: submitResult.success ? 'submitted' as const : 'pending' as const,
          
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
            salt: prepareResult.technical?.salt || '0' // Use salt from server response
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
  private getTokenInfo(tokenAddress: string): TokenInfo {
    // Check if it's a symbol or address
    const tokenKey = Object.keys(CONFIG.TOKENS).find(key => {
      const token = CONFIG.TOKENS[key as keyof typeof CONFIG.TOKENS];
      return token.address.toLowerCase() === tokenAddress.toLowerCase() ||
             key === tokenAddress.toUpperCase();
    });
    
    if (tokenKey) {
      return CONFIG.TOKENS[tokenKey as keyof typeof CONFIG.TOKENS];
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
   * Show success popup notification
   */
  private showSuccessPopup(orderHash: string, description: string): void {
    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
    popup.style.animation = 'slideInRight 0.3s ease-out';
    
    popup.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <div class="flex-1">
          <h4 class="font-medium">🎉 Order Submitted Successfully!</h4>
          <p class="text-sm mt-1 opacity-90">${description}</p>
          <p class="text-xs mt-1 opacity-75 font-mono">${orderHash.slice(0, 10)}...${orderHash.slice(-8)}</p>
        </div>
        <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    // Add CSS animation if not already added
    if (!document.querySelector('#success-popup-styles')) {
      const styles = document.createElement('style');
      styles.id = 'success-popup-styles';
      styles.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(styles);
    }

    // Add to page
    document.body.appendChild(popup);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      popup.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (popup.parentElement) {
          popup.remove();
        }
      }, 300);
    }, 8000);

    console.log('🎉 Success popup displayed for order:', orderHash);
  }



  /**
   * Cancel an existing order using 1inch SDK directly
   */
  async cancelOrder(orderHash: string): Promise<boolean> {
    try {
      if (!this.isWalletAvailable()) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      const currentAccount = await this.getCurrentWalletAddress();
      if (!currentAccount) {
        throw new Error("No wallet address available");
      }

      console.log(`🚫 Cancelling order ${orderHash} with user wallet...`);
      
      // Initialize 1inch SDK with custom proxy connector
      console.log('🔧 Initializing 1inch SDK with direct connector for cancellation...');
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
      
      const ethereum = window.ethereum as ExtendedEthereum;

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

      // Get current wallet address
      const fromAddress = await this.getCurrentWalletAddress();
      if (!fromAddress) {
        throw new Error("No wallet address available for transaction");
      }

      // Send transaction via MetaMask
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: fromAddress,
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
        const ethereum = window.ethereum as ExtendedEthereum | undefined;
        const receipt = await ethereum?.request({
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
      const currentWallet = await this.getCurrentWalletAddress();
      const walletAddress = currentWallet?.toLowerCase();
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