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
  private static instance: BlockchainService | null = null;
  private web3: Web3;
  
  // Specialized services
  public wallet: BlockchainWallet;
  public tokens: BlockchainTokens;
  public indices: BlockchainIndices;
  public orders: BlockchainOrders;

  private constructor() {
    // Initialize Web3 with Alchemy or fallback to Base Mainnet
    const rpcUrl = getRpcUrl();
    console.log(`🌐 Initializing Web3 with RPC: ${getRpcDescription(rpcUrl)} (Singleton)`);
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

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  // Method to reset singleton for testing purposes
  public static resetInstance(): void {
    BlockchainService.instance = null;
  }

  // === WALLET OPERATIONS ===
  
  async connectWallet(): Promise<string | null> {
    return this.wallet.connectWallet();
  }

  async switchToBaseMainnet(): Promise<boolean> {
    return this.wallet.switchToBaseMainnet();
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

  // === WALLET SIGNING OPERATIONS ===

  async getPrivateKeyForDemo(): Promise<string> {
    return this.wallet.getPrivateKeyForDemo();
  }

  async signTypedDataV4(typedData: any): Promise<string> {
    return this.wallet.signTypedDataV4(typedData);
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

  async updateIndex(indexId: number, newValue: number): Promise<boolean> {
    return this.indices.updateIndex(indexId, newValue);
  }

  async validateOrderCondition(condition: OrderCondition): Promise<boolean> {
    return this.indices.validateOrderCondition(condition);
  }

  async getIndexHistory(indexId: number, fromBlock?: number, toBlock?: number): Promise<any[]> {
    return this.indices.getIndexHistory(indexId, fromBlock, toBlock);
  }

  async getIndexStatistics(indexId: number, days: number = 7): Promise<{
    min: number;
    max: number;
    avg: number;
    current: number;
    volatility: number;
  }> {
    return this.indices.getIndexStatistics(indexId, days);
  }

  async searchIndicesByName(searchTerm: string): Promise<CustomIndex[]> {
    return this.indices.searchIndicesByName(searchTerm);
  }

  clearIndicesCache(): void {
    this.indices.clearCache();
  }

  async isContractOwner(): Promise<boolean> {
    return this.indices.isOwner();
  }

  // === ORDER OPERATIONS ===

  async createOrder(params: OrderParams): Promise<Order | null> {
    return this.orders.createOrder(params);
  }

  async cancelOrder(orderHash: string): Promise<boolean> {
    return this.orders.cancelOrder(orderHash);
  }

  async getOrderStatus(orderHash: string): Promise<number> {
    return this.orders.getOrderStatus(orderHash);
  }

  async getOrdersByIndex(indexId: number): Promise<any[]> {
    return this.orders.getOrdersByIndex(indexId);
  }

  clearOrderCache(indexId?: number): void {
    this.orders.clearOrderCache(indexId);
  }

  // === UTILITY METHODS ===

  /**
   * Parse token amount with proper decimals (delegate to utils)
   */
  parseTokenAmount(amount: string, decimals: number): string {
    const { parseTokenAmount } = require('./blockchain-utils');
    return parseTokenAmount(amount, decimals);
  }

  /**
   * Format token amount from wei (delegate to utils)
   */
  formatTokenAmount(amount: string, decimals: number): string {
    const { formatTokenAmount } = require('./blockchain-utils');
    return formatTokenAmount(amount, decimals);
  }
}

// Singleton instance
export const blockchainService = BlockchainService.getInstance();

// Export constants and types for backward compatibility
export { OPERATORS, CONTRACTS } from "./blockchain-constants";
export type { 
  OrderCondition, 
  Order, 
  OrderParams, 
  CustomIndex, 
  SwapOrder 
} from "./blockchain-types";