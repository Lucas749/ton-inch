/**
 * 🚀 Blockchain Service for Frontend
 *
 * This service orchestrates all blockchain operations by delegating to specialized services.
 * It provides a unified interface for wallet, token, index, and order operations.
 */

import { Web3 } from "web3";
import { getRpcUrl, getRpcDescription } from "./blockchain-utils";
import { BlockchainWallet } from "./blockchain-wallet";
import { BlockchainTokens } from "./blockchain-tokens";
import { BlockchainIndices } from "./blockchain-indices";
import { BlockchainOrders } from "./blockchain-orders";
import type { 
  OrderCondition, 
  Order, 
  OrderParams, 
  CustomIndex, 
  SwapOrder 
} from "./blockchain-types";

export class BlockchainService {
  private web3: Web3;
  
  // Specialized services
  public wallet: BlockchainWallet;
  public tokens: BlockchainTokens;
  public indices: BlockchainIndices;
  public orders: BlockchainOrders;

  constructor() {
    // Initialize Web3 with Alchemy or fallback to Base Sepolia
    const rpcUrl = getRpcUrl();
    console.log(`🌐 Initializing Web3 with RPC: ${getRpcDescription(rpcUrl)}`);
    this.web3 = new Web3(rpcUrl);
    
    // Initialize specialized services
    this.wallet = new BlockchainWallet(this.web3);
    this.tokens = new BlockchainTokens(this.web3, this.wallet);
    this.indices = new BlockchainIndices(this.web3, this.wallet);
    this.orders = new BlockchainOrders(this.web3, this.wallet, this.tokens);
    
    // Set up network change handling
    this.wallet.onNetworkChanged((chainId) => {
      console.log(`🔄 Network changed to ${chainId}, reinitializing contracts...`);
    }, () => {
      // Reinitialize all contract-dependent services
      this.indices.reinitialize();
      this.orders.reinitialize();
    });
  }

  // Convenience methods that delegate to specialized services
  
  // === WALLET OPERATIONS ===

  async connectWallet(): Promise<string | null> {
    return this.wallet.connectWallet();
  }

  async switchToBaseSepoliaNetwork(): Promise<boolean> {
    return this.wallet.switchToBaseSepoliaNetwork();
  }

  async getNetworkInfo(): Promise<{ chainId: number; networkName: string }> {
    return this.wallet.getNetworkInfo();
  }

  isWalletConnected(): boolean {
    return this.wallet.isWalletConnected();
  }

  getWalletAddress(): string | null {
    return this.wallet.getWalletAddress();
  }

  async getETHBalance(): Promise<string> {
    return this.wallet.getETHBalance();
  }

  onAccountChanged(callback: (account: string | null) => void): void {
    this.wallet.onAccountChanged(callback);
  }

  onNetworkChanged(callback: (chainId: string) => void): void {
    this.wallet.onNetworkChanged(callback);
  }

  // === TOKEN OPERATIONS ===

  async getTokenBalance(tokenAddress: string): Promise<string> {
    return this.tokens.getTokenBalance(tokenAddress);
  }

  async mintTestTokens(amount: number = 1000): Promise<boolean> {
    return this.tokens.mintTestTokens(amount);
  }

  async getTestUSDCBalance(): Promise<string> {
    return this.tokens.getTestUSDCBalance();
  }

  // === INDEX OPERATIONS ===

  async getAllIndices(): Promise<CustomIndex[]> {
    return this.indices.getAllIndices();
  }

  async getIndexValue(indexId: number): Promise<{value: number, timestamp: number}> {
    return this.indices.getIndexValue(indexId);
  }

  async createIndex(name: string, description: string, initialValue: number): Promise<number> {
    return this.indices.createIndex(name, description, initialValue);
  }

  /**
   * Update an existing index value
   */
  async updateIndex(indexId: number, newValue: number): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }

      const tx = await this.oracle.methods
        .updateCustomIndex(indexId, newValue)
        .send({
          from: this.account,
          gas: "100000",
        });

      console.log("✅ Index updated:", tx.transactionHash);
      return true;
    } catch (error) {
      console.error("❌ Error updating index:", error);
      throw error;
    }
  }

  /**
   * Validate if an order condition is met
   */
  async validateOrderCondition(condition: OrderCondition): Promise<boolean> {
    try {
      const result = await this.preInteraction.methods
        .validateOrder(
          condition.indexId,
          condition.operator,
          condition.threshold
        )
        .call();

      return result;
    } catch (error) {
      console.error("❌ Error validating order condition:", error);
      throw error;
    }
  }

  /**
   * Get token balance for connected wallet
   */
  async getTokenBalance(tokenAddress: string): Promise<string> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error("Wallet not connected");
      }

      const tokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        tokenAddress
      );
      const balance = await tokenContract.methods
        .balanceOf(this.account)
        .call();
      const decimals = await tokenContract.methods.decimals().call();

      return this.web3.utils.fromWei(
        balance as string,
        Number(decimals) === 18 ? "ether" : "mwei"
      );
    } catch (error) {
      console.error("❌ Error getting token balance:", error);
      throw error;
    }
  }

  /**
   * Get ETH balance for connected wallet
   */
  async getETHBalance(): Promise<string> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error("Wallet not connected");
      }

      const balance = await this.web3.eth.getBalance(this.account);
      return this.web3.utils.fromWei(balance, "ether");
    } catch (error) {
      console.error("❌ Error getting ETH balance:", error);
      throw error;
    }
  }

  /**
   * Get current network info
   */
  async getNetworkInfo(): Promise<{ chainId: number; networkName: string }> {
    try {
      const chainId = await this.web3.eth.getChainId();
      const networkName =
        Number(chainId) === 84532 ? "Base Sepolia" : `Unknown (${chainId})`;

      return { chainId: Number(chainId), networkName };
    } catch (error) {
      console.error("❌ Error getting network info:", error);
      throw error;
    }
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    // First check our internal state
    if (this.isInitialized && !!this.account) {
      return true;
    }
    
    // If not initialized but wallet exists, try to detect connection
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        // Check if we can get current accounts synchronously
        const provider = window.ethereum;
        if (provider.selectedAddress) {
          // Auto-initialize if we detect a connected wallet
          this.account = provider.selectedAddress;
          this.web3.setProvider(window.ethereum);
          this.isInitialized = true;
          console.log("🔄 Auto-detected wallet connection:", this.account);
          return true;
        }
      } catch (error) {
        console.warn("⚠️ Could not detect wallet connection:", error);
      }
    }
    
    return false;
  }

  /**
   * Get connected wallet address
   */
  getWalletAddress(): string | null {
    // First check our internal state
    if (this.account) {
      return this.account;
    }
    
    // If not set but wallet exists, try to detect address
    if (typeof window !== "undefined" && window.ethereum && window.ethereum.selectedAddress) {
      this.account = window.ethereum.selectedAddress;
      return this.account;
    }
    
    return null;
  }

  /**
   * Listen for account changes
   */
  onAccountChanged(callback: (account: string | null) => void): void {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          this.account = accounts[0];
          callback(accounts[0]);
        } else {
          this.account = null;
          this.isInitialized = false;
          callback(null);
        }
      });
    }
  }

  /**
   * Listen for network changes
   */
  onNetworkChanged(callback: (chainId: string) => void): void {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("chainChanged", (chainId: string) => {
        // Re-initialize web3 with new network
        this.web3 = new Web3(window.ethereum);
        this.initializeContracts();
        callback(chainId);
      });
    }
  }

  /**
   * Create a new order with index condition
   */
  async createOrder(params: OrderParams): Promise<Order | null> {
    try {
      console.log("🔄 Creating order with params:", params);
      
      if (!this.isWalletConnected()) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      if (!this.factory) {
        throw new Error("Factory contract not initialized");
      }

      // Generate a random salt for order uniqueness
      const salt = Math.floor(Math.random() * 1000000);
      const maker = this.account;
      const receiver = this.account; // Same as maker for now
      const makerAsset = params.fromToken;
      const takerAsset = params.toToken;
      
      // Convert amounts to wei/smallest unit
      const makingAmount = this.parseTokenAmount(params.fromAmount, 6); // Assuming USDC (6 decimals)
      const takingAmount = this.parseTokenAmount(params.toAmount, 18); // Assuming WETH (18 decimals)
      
      const indexId = params.indexId;
      const operator = params.operator;
      const threshold = params.threshold;
      const expiry = Math.floor(Date.now() / 1000) + (params.expiry || 3600); // Default 1 hour

      console.log("🔄 Order parameters:", {
        salt, maker, receiver, makerAsset, takerAsset,
        makingAmount, takingAmount, indexId, operator, threshold, expiry
      });

      // First, approve the factory to spend the maker asset
      const fromTokenContract = new this.web3.eth.Contract(
        ABIS.ERC20,
        params.fromToken
      );

      console.log("🔄 Approving factory to spend tokens...");
      await fromTokenContract.methods
        .approve(CONTRACTS.IndexLimitOrderFactory, makingAmount)
        .send({
          from: this.account,
          gas: "100000",
        });

      console.log("✅ Token approval successful");

      // Now create the order
      console.log("🔄 Creating index order...");
      const tx = await this.factory.methods
        .createIndexOrder(
          salt, maker, receiver, makerAsset, takerAsset,
          makingAmount, takingAmount, indexId, operator, threshold, expiry
        )
        .send({
          from: this.account,
          gas: "500000",
        });

      console.log("✅ Order created!", tx.transactionHash);

      // Clear cache for this index so new order appears immediately
      this.clearOrderCache(params.indexId);

      // Return order object
      return {
        hash: tx.transactionHash,
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
        maker: this.account,
        receiver: this.account,
        expiry,
        status: "active",
        createdAt: Date.now(),
        transactionHash: tx.transactionHash,
      };

    } catch (error) {
      console.error("❌ Error creating order:", error);
      throw error;
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderHash: string): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.account) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }

      const tx = await this.factory.methods.cancelOrder(orderHash).send({
        from: this.account,
        gas: "150000",
      });

      console.log("✅ Order cancelled:", tx.transactionHash);
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
   * Get operator name for display
   */
  private getOperatorName(operator: number): string {
    const names = [">", "<", ">=", "<=", "=="];
    return names[operator] || "?";
  }

  /**
   * Parse token amount with proper decimals
   */
  parseTokenAmount(amount: string, decimals: number): string {
    // Handle decimal amounts by using parseFloat and then converting to wei
    const floatAmount = parseFloat(amount);
    if (isNaN(floatAmount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    
    // Multiply by 10^decimals to convert to smallest unit (wei)
    const multiplier = Math.pow(10, decimals);
    const amountInWei = Math.floor(floatAmount * multiplier);
    
    return amountInWei.toString();
  }

  /**
   * Format token amount from wei
   */
  formatTokenAmount(amount: string, decimals: number): string {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) {
      return "0";
    }
    
    // Convert from smallest unit back to human readable
    const divisor = Math.pow(10, decimals);
    const humanReadable = amountNumber / divisor;
    
    return humanReadable.toString();
  }

  /**
   * Get index update history
   */
  async getIndexHistory(
    indexId: number,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    try {
      const events = await this.oracle.getPastEvents("IndexUpdated", {
        filter: { indexId },
        fromBlock: fromBlock || "earliest",
        toBlock: toBlock || "latest",
      });

      return events.map((event: any) => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        indexId: event.returnValues.indexId,
        newValue: event.returnValues.newValue,
        timestamp: event.returnValues.timestamp || Date.now(),
      }));
    } catch (error) {
      console.error("Error fetching index history:", error);
      return [];
    }
  }

  /**
   * Mint test tokens for the user (Base Sepolia only)
   */
  async mintTestTokens(amount: number = 1000): Promise<boolean> {
    try {
      if (!this.isWalletConnected()) {
        throw new Error("Wallet not connected");
      }

      const testUSDC = new this.web3.eth.Contract(
        ABIS.TestToken,
        CONTRACTS.TestUSDC
      );

      // Convert amount to proper decimals (USDC has 6 decimals)
      const mintAmount = amount * Math.pow(10, 6);

      console.log(`🪙 Minting ${amount} Test USDC...`);
      
      const tx = await testUSDC.methods
        .mint(this.account, mintAmount.toString())
        .send({
          from: this.account,
          gas: "100000",
        });

      console.log("✅ Test tokens minted!", tx.transactionHash);
      return true;
    } catch (error) {
      console.error("❌ Error minting test tokens:", error);
      throw error;
    }
  }

  /**
   * Get test USDC balance
   */
  async getTestUSDCBalance(): Promise<string> {
    try {
      if (!this.isWalletConnected()) {
        return "0";
      }

      const testUSDC = new this.web3.eth.Contract(
        ABIS.TestToken,
        CONTRACTS.TestUSDC
      );

      const balance = await testUSDC.methods.balanceOf(this.account).call();
      // USDC has 6 decimals
      return (parseInt(balance as string) / Math.pow(10, 6)).toString();
    } catch (error) {
      console.error("❌ Error getting test USDC balance:", error);
      return "0";
    }
  }

  /**
   * Get index statistics over time period
   */
  async getIndexStatistics(
    indexId: number,
    days: number = 7
  ): Promise<{
    min: number;
    max: number;
    avg: number;
    current: number;
    volatility: number;
  }> {
    try {
      const history = await this.getIndexHistory(indexId);
      const recentHistory = history.slice(-days * 24); // Approximate hourly updates

      if (recentHistory.length === 0) {
        const currentValue = await this.getIndexValue(indexId);
        return {
          min: currentValue.value,
          max: currentValue.value,
          avg: currentValue.value,
          current: currentValue.value,
          volatility: 0,
        };
      }

      const values = recentHistory.map((h) => parseFloat(h.newValue));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const current = values[values.length - 1];

      // Calculate simple volatility (standard deviation)
      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
        values.length;
      const volatility = Math.sqrt(variance);

      return { min, max, avg, current, volatility };
    } catch (error) {
      console.error("Error calculating index statistics:", error);
      const currentValue = await this.getIndexValue(indexId);
      return {
        min: currentValue.value,
        max: currentValue.value,
        avg: currentValue.value,
        current: currentValue.value,
        volatility: 0,
      };
    }
  }

  /**
   * Search indices by name
   */
  async searchIndicesByName(searchTerm: string): Promise<any[]> {
    try {
      const allIndices = await this.getAllIndices();
      return allIndices.filter(
        (index) =>
          index.name &&
          index.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error("Error searching indices:", error);
      return [];
    }
  }

  /**
   * Retry function with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>, 
    maxRetries: number = 3, 
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if it's not a circuit breaker or rate limit error
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        console.warn(`⚠️ Attempt ${attempt + 1} failed:`, error.message);
      }
    }
    
    throw lastError;
  }

  /**
   * Check if an error is retryable (circuit breaker, rate limit, etc.)
   */
  private isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return message.includes('circuit breaker') || 
           message.includes('rate limit') || 
           message.includes('too many requests') ||
           message.includes('timeout') ||
           message.includes('network error');
  }

  /**
   * Clear order cache for a specific index (call after creating new orders)
   */
  public clearOrderCache(indexId?: number): void {
    if (indexId !== undefined) {
      this.orderCache.delete(indexId);
      console.log(`🗑️ Cleared cache for index ${indexId}`);
    } else {
      this.orderCache.clear();
      console.log(`🗑️ Cleared all order cache`);
    }
  }

  /**
   * Delay helper function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get complete information for a single index
   */
  private async getIndexDetails(indexId: number): Promise<CustomIndex | null> {
    try {
      if (!this.preInteraction || !this.oracle) {
        console.error('Contracts not initialized');
        return null;
      }

      // Get metadata from PreInteraction contract
      const info = await this.preInteraction.methods.getIndexInfo(indexId).call();
      
      // Get current value from oracle (correct contract)
      const valueData = await this.oracle.methods.getIndexValue(indexId).call();
      
      return {
        id: indexId,
        name: info.name || `Index ${indexId}`,
        description: info.description || `Index ${indexId} description`,
        creator: info.creator,
        active: info.isActive,
        createdAt: Number(info.createdAt),
        value: Number(valueData[0]), // getIndexValue returns [value, timestamp]
        timestamp: Number(valueData[1])
      };
    } catch (error) {
      console.error(`❌ Error fetching details for index ${indexId}:`, error);
      return null;
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
      const events = await this.retryWithBackoff(async () => {
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
}

// Singleton instance
export const blockchainService = new BlockchainService();

// Export constants and types for backward compatibility
export { OPERATORS, CONTRACTS } from "./blockchain-constants";
export type { 
  OrderCondition, 
  Order, 
  OrderParams, 
  CustomIndex, 
  SwapOrder 
} from "./blockchain-types";