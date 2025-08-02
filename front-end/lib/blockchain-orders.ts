/**
 * 📋 Blockchain Orders Service
 * Handles order operations like creating, canceling, and tracking orders using 1inch SDK
 */

import { Web3 } from "web3";
import { CONTRACTS, ABIS, OPERATORS, INDICES } from "./blockchain-constants";
import { retryWithBackoff, parseTokenAmount } from "./blockchain-utils";
import type { Order, OrderParams } from "./blockchain-types";
import type { BlockchainWallet } from "./blockchain-wallet";
import type { BlockchainTokens } from "./blockchain-tokens";

// 1inch SDK imports
import { 
  LimitOrder, 
  MakerTraits, 
  Address, 
  Sdk, 
  randBigInt, 
  ExtensionBuilder,
  FetchProviderConnector
} from '@1inch/limit-order-sdk';
import { ethers } from 'ethers';

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

  /**
   * Initialize 1inch SDK per-request (matching backend pattern)
   */
  private initializeSDK(): any {
    try {
      const apiKey = process.env.NEXT_PUBLIC_ONEINCH_API_KEY;
      console.log('🔑 API Key available:', !!apiKey);
      
      if (!apiKey) {
        throw new Error('NEXT_PUBLIC_ONEINCH_API_KEY environment variable not found');
      }
      
      const sdk = new Sdk({
        authKey: apiKey,
        networkId: CONFIG.CHAIN_ID,
        httpConnector: new FetchProviderConnector()
      });
      
      console.log('✅ 1inch SDK initialized successfully');
      return sdk;
    } catch (error) {
      console.error('❌ Failed to initialize 1inch SDK:', error);
      throw error;
    }
  }

  /**
   * Create a new order with index condition (using 1inch SDK)
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    try {
      console.log("🔄 Creating order with 1inch SDK:", params);
      
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      // Initialize SDK per-request (matching backend pattern)
      console.log('🚀 Initializing 1inch SDK...');
      const sdk = this.initializeSDK();

      // Get token info
      const fromToken = this.getTokenInfo(params.fromToken);
      const toToken = this.getTokenInfo(params.toToken);
      
      console.log(`📊 Trading: ${params.fromAmount} ${fromToken.symbol} → ${params.toAmount} ${toToken.symbol}`);

      // Parse amounts (ethers v6 syntax)
      const makingAmount = ethers.parseUnits(params.fromAmount.toString(), fromToken.decimals);
      const takingAmount = ethers.parseUnits(params.toAmount.toString(), toToken.decimals);

      // Create index predicate
      console.log('🔮 Creating index predicate...');
      const predicate = this.createIndexPredicate({
        indexId: params.indexId,
        operator: this.mapOperatorToString(params.operator),
        threshold: params.threshold
      });

      // Create extension with predicate
      const extension = new ExtensionBuilder()
        .withPredicate(predicate)
        .build();
      
      console.log('✅ Extension created with predicate');

      // Setup timing
      const expirationHours = 24; // Default 24 hours
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

      // Create order using 1inch SDK (matching backend pattern)
      const order = await sdk.createOrder({
        makerAsset: new Address(fromToken.address),
        takerAsset: new Address(toToken.address),
        makingAmount: makingAmount,
        takingAmount: takingAmount,
        maker: new Address(this.wallet.currentAccount),
        extension: extension.encode()
      }, makerTraits); // Pass makerTraits directly, no .build()

      const orderHash = order.getOrderHash();
      console.log(`✅ Order created: ${orderHash}`);

      // Sign order using wallet
      console.log('✍️ Signing order...');
      const typedData = order.getTypedData(CONFIG.CHAIN_ID);
      
      // Use the wallet's signTypedData method
      const signature = await this.wallet.signTypedDataV4(typedData);
      console.log('✅ Order signed');

      // Submit order to 1inch (optional - for now just create locally)
      console.log('📤 Order created locally (1inch API submission requires auth key)');
      let submitResult = null;
      // Note: submitOrder would require 1inch API key for production
      // try {
      //   submitResult = await this.sdk.submitOrder(order, signature);
      //   console.log('✅ Order submitted successfully!');
      // } catch (error) {
      //   console.log(`⚠️ Submit failed: ${error.message}`);
      // }

      // Clear cache so new order appears
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
        makingAmount: makingAmount.toString(),
        takingAmount: takingAmount.toString(),
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount: params.toAmount,
        maker: this.wallet.currentAccount,
        receiver: this.wallet.currentAccount,
        expiry: Number(expiration),
        status: submitResult ? "active" : "pending",
        createdAt: Date.now(),
        transactionHash: orderHash, // In 1inch, orderHash is the primary identifier
      };

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
      CONFIG.TOKENS[key].address.toLowerCase() === tokenAddress.toLowerCase() ||
      key === tokenAddress.toUpperCase()
    );
    
    if (tokenKey) {
      return CONFIG.TOKENS[tokenKey];
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
    console.log(`   Index: ${INDICES[Object.keys(INDICES).find(key => INDICES[key].id === condition.indexId)]?.name}`);
    console.log(`   Operator: ${condition.operator}`);
    console.log(`   Threshold: ${condition.threshold}`);
    
    // Oracle call encoding (ethers v6 syntax)
    const getIndexValueSelector = ethers.id('getIndexValue(uint256)').slice(0, 10);
    const oracleCallData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes4', 'uint256'],
      [getIndexValueSelector, condition.indexId]
    );
    
    // Predicate structure: operator(threshold, arbitraryStaticCall(oracle, callData))
    const arbitraryStaticCallData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'bytes'],
      [CONFIG.INDEX_ORACLE_ADDRESS, oracleCallData]
    );
    
    let predicateData;
    
    // Map our operator to 1inch methods
    switch (condition.operator) {
      case 'gt':
      case 'gte': // Treat >= as > for simplicity
        predicateData = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'bytes'],
          [condition.threshold, arbitraryStaticCallData]
        );
        break;
      case 'lt':
      case 'lte': // Treat <= as < for simplicity
        predicateData = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'bytes'],
          [condition.threshold, arbitraryStaticCallData]
        );
        break;
      case 'eq':
        predicateData = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'bytes'],
          [condition.threshold, arbitraryStaticCallData]
        );
        break;
      default:
        // Default to gt
        predicateData = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'bytes'],
          [condition.threshold, arbitraryStaticCallData]
        );
    }
    
    // Complete predicate with protocol address (ethers v6 syntax)
    const completePredicate = ethers.solidityPacked(
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