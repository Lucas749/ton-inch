/**
 * 📊 Blockchain Indices Service
 * Handles index operations like creating, updating, and retrieving indices
 */

import { Web3 } from "web3";
import { CONTRACTS, ABIS, INDICES } from "./blockchain-constants";
import { retryWithBackoff, delay } from "./blockchain-utils";
import type { CustomIndex, OrderCondition } from "./blockchain-types";
import type { BlockchainWallet } from "./blockchain-wallet";

// Global request lock to prevent multiple simultaneous requests across all instances
let globalPendingRequest: Promise<CustomIndex[]> | null = null;
let globalIndicesCache: CustomIndex[] | null = null;
let globalCacheTimestamp: number = 0;
const GLOBAL_CACHE_DURATION = 30000; // 30 seconds

export class BlockchainIndices {
  private web3: Web3;
  private wallet: BlockchainWallet;
  private oracle: any;
  private preInteraction: any;

  constructor(web3Instance: Web3, walletInstance: BlockchainWallet) {
    this.web3 = web3Instance;
    this.wallet = walletInstance;
    this.initializeContracts();
  }

  /**
   * Initialize contract instances
   */
  private initializeContracts(): void {
    this.oracle = new this.web3.eth.Contract(
      ABIS.IndexOracle,
      CONTRACTS.IndexOracle
    );
    // No more preInteraction contract in new architecture
    this.preInteraction = null;
  }

  /**
   * Get all custom indices from the oracle with rate limiting and global caching
   */
  async getAllIndices(): Promise<CustomIndex[]> {
    try {
      // Check global cache first
      const now = Date.now();
      if (globalIndicesCache && (now - globalCacheTimestamp) < GLOBAL_CACHE_DURATION) {
        console.log(`📊 Using global cached indices data (${globalIndicesCache.length} indices, cached ${Math.round((now - globalCacheTimestamp) / 1000)}s ago)`);
        return globalIndicesCache;
      }

      // Check if there's already a pending request
      if (globalPendingRequest) {
        console.log("⏳ Another indices request is in progress, waiting...");
        return await globalPendingRequest;
      }

      // Set the global pending request
      globalPendingRequest = this.fetchAllIndices();
      
      try {
        const indices = await globalPendingRequest;
        globalIndicesCache = indices;
        globalCacheTimestamp = now;
        return indices;
      } finally {
        globalPendingRequest = null;
      }
    } catch (error) {
      console.error("❌ Error getting all indices:", error);
      globalPendingRequest = null;
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Internal method to actually fetch indices from the blockchain
   */
  private async fetchAllIndices(): Promise<CustomIndex[]> {
    const indices: CustomIndex[] = [];

    // First, load the 4 predefined indices (Apple=0, Tesla=1, VIX=2, BTC=3)
    console.log("🔍 Loading predefined indices (0-3)...");
    const predefinedIndices = [
      { id: 0, name: "Apple Stock", symbol: "AAPL", description: "Apple Inc. stock price" },
      { id: 1, name: "Tesla Stock", symbol: "TSLA", description: "Tesla Inc. stock price" },
      { id: 2, name: "VIX Volatility Index", symbol: "VIX", description: "CBOE Volatility Index" },
      { id: 3, name: "Bitcoin Price", symbol: "BTC", description: "Bitcoin price in USD" }
    ];

    for (const predefined of predefinedIndices) {
      try {
        const result = await retryWithBackoff(async () => {
          return await this.oracle.methods.getIndexValue(predefined.id).call();
        });
        
        if (result && result[0]) {
          indices.push({
            id: predefined.id,
            name: predefined.name,
            description: predefined.description,
            value: Number(result[0]),
            timestamp: Number(result[1]) || Date.now(),
            active: true,
            creator: CONTRACTS.IndexOracle,
            createdAt: 0
          });
          console.log(`✅ Loaded ${predefined.name}: ${Number(result[0])} basis points`);
        }
        
        // Add small delay between requests
        await delay(100);
      } catch (error) {
        console.warn(`⚠️ Could not load predefined index ${predefined.name}:`, error);
        // Still add the index with default values so it shows up
        indices.push({
          id: predefined.id,
          name: predefined.name,
          description: predefined.description,
          value: 0,
          timestamp: 0,
          active: false,
          creator: CONTRACTS.IndexOracle,
          createdAt: 0
        });
      }
    }

    // Then load any custom indices (starting from ID 4)
    console.log("🔍 Loading custom indices (4+)...");
    try {
      const customIndicesArray = await this.oracle.methods.getAllCustomIndices().call();
      console.log("📊 Found custom indices:", customIndicesArray);
      
      for (let i = 0; i < customIndicesArray.length; i++) {
        const indexId = customIndicesArray[i];
        const id = Number(indexId);
        
        // Skip if it's one of the predefined indices we already loaded
        if (id < 4) continue;
        
        try {
          const result = await retryWithBackoff(async () => {
            return await this.oracle.methods.getIndexValue(id).call();
          });
          
          if (result && result[0]) {
            indices.push({
              id,
              name: `Custom Index ${id}`,
              description: `User-created index #${id}`,
              value: Number(result[0]),
              timestamp: Number(result[1]),
              active: true,
              creator: "Unknown",
              createdAt: Number(result[1])
            });
            console.log(`✅ Loaded custom index ${id}: ${Number(result[0])}`);
          }
          
          // Add delay between requests
          if (i < customIndicesArray.length - 1) {
            await delay(200);
          }
        } catch (e) {
          console.warn(`⚠️ Failed to load custom index ${indexId}:`, e);
          continue;
        }
      }
    } catch (error) {
      console.warn("Could not get custom indices list:", error);
    }

    console.log(`✅ Loaded ${indices.length} total indices`);
    return indices.sort((a, b) => a.id - b.id);
  }

  /**
   * Get index value by ID
   */
  async getIndexValue(indexId: number): Promise<{value: number, timestamp: number}> {
    try {
      if (!this.oracle) {
        throw new Error("Oracle contract not initialized");
      }

      const result = await this.oracle.methods.getIndexValue(indexId).call();
      
      if (!result || !result[0] || result[0] === "0") {
        throw new Error(`Index ${indexId} does not exist or has no value`);
      }

      return {
        value: Number(result[0]),
        timestamp: Number(result[1])
      };
    } catch (error) {
      console.error(`❌ Error getting index ${indexId} value:`, error);
      throw error;
    }
  }

  /**
   * Create a new custom index (updated for new architecture)
   */
  async createIndex(name: string, description: string, initialValue: number): Promise<number> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      if (!this.oracle) {
        throw new Error("Oracle contract not initialized");
      }

      console.log(`🔄 Creating new index: ${name}`);

      // New architecture requires additional parameters
      const tx = await this.oracle.methods
        .createCustomIndex(
          initialValue,
          `Custom index: ${description}`, // sourceUrl
          0, // oracleType (0 = MOCK, 1 = CHAINLINK)
          "0x0000000000000000000000000000000000000000" // chainlinkOracleAddress
        )
        .send({
          from: this.wallet.currentAccount,
          gas: "300000",
        });

      console.log(`✅ Index created! Transaction: ${tx.transactionHash}`);

      // Clear cache so new index appears
      this.clearCache();

      // Get the new index ID from the transaction events or next ID
      const nextId = await this.oracle.methods.getNextCustomIndexId().call();
      return parseInt(nextId) - 1; // The ID that was just created
    } catch (error) {
      console.error("❌ Error creating index:", error);
      throw error;
    }
  }

  /**
   * Update index value (updated for new architecture)
   */
  async updateIndex(indexId: number, newValue: number): Promise<boolean> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      if (!this.oracle) {
        throw new Error("Oracle contract not initialized");
      }

      console.log(`🔄 Updating index ${indexId} to ${newValue}`);

      // Determine if it's a predefined index (0-3) or custom index (4+)
      let tx;
      if (indexId <= 3) {
        // Update predefined index using uint8 indexType
        tx = await this.oracle.methods
          .updateIndex(indexId, newValue)
          .send({
            from: this.wallet.currentAccount,
            gas: "150000",
          });
      } else {
        // Update custom index using uint256 indexId
        tx = await this.oracle.methods
          .updateCustomIndex(indexId, newValue)
          .send({
            from: this.wallet.currentAccount,
            gas: "150000",
          });
      }

      console.log(`✅ Index updated! Transaction: ${tx.transactionHash}`);

      // Clear cache so updated value appears
      this.clearCache();

      return true;
    } catch (error) {
      console.error("❌ Error updating index:", error);
      throw error;
    }
  }

  /**
   * Clear the global cache
   */
  clearCache(): void {
    globalIndicesCache = null;
    globalCacheTimestamp = 0;
    globalPendingRequest = null;
    console.log("🗑️ Indices cache cleared");
  }

  /**
   * Check if an order condition should trigger
   */
  async validateOrderCondition(condition: OrderCondition): Promise<boolean> {
    try {
      const { value } = await this.getIndexValue(condition.indexId);
      
      switch (condition.operator) {
        case 1: // GT
          return value > condition.threshold;
        case 2: // LT
          return value < condition.threshold;
        case 3: // GTE
          return value >= condition.threshold;
        case 4: // LTE
          return value <= condition.threshold;
        case 5: // EQ
          return value === condition.threshold;
        case 6: // NEQ
          return value !== condition.threshold;
        default:
          return false;
      }
    } catch (error) {
      console.error("❌ Error validating condition:", error);
      return false;
    }
  }
}