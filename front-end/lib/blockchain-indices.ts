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

      // If there's already a global pending request, return it to avoid duplicate calls
      if (globalPendingRequest) {
        console.log('📊 Waiting for existing global indices request... (preventing duplicate call)');
        return globalPendingRequest;
      }

      console.log('📊 Fetching all indices with rate limiting... (global request)');
      
      // Create and store the global promise
      globalPendingRequest = this.fetchAllIndices();
      
      try {
        const indices = await globalPendingRequest;
        
        // Cache the results globally
        globalIndicesCache = indices;
        globalCacheTimestamp = now;
        
        return indices;
      } finally {
        // Clear the global pending request
        globalPendingRequest = null;
      }
    } catch (error) {
      console.error("❌ Error fetching indices:", error);
      globalPendingRequest = null; // Clear on error
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
   * Clear the global indices cache (call after creating/updating indices)
   */
  clearCache(): void {
    globalIndicesCache = null;
    globalCacheTimestamp = 0;
    globalPendingRequest = null;
    console.log('🗑️ Cleared global indices cache');
  }

  /**
   * Create a new custom index
   */
  async createIndex(
    name: string,
    description: string,
    initialValue: number
  ): Promise<number> {
    try {
      console.log("🔄 Creating index:", { name, description, initialValue });
      
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      if (!this.oracle || !this.preInteraction) {
        throw new Error("Contracts not initialized");
      }

      // Step 1: Get next index ID
      const indexId = await this.oracle.methods.getNextCustomIndexId().call();
      console.log("📋 Next index ID:", indexId);

      // Step 2: Create in oracle
      console.log("🔄 Creating index in oracle...");
      const oracleTx = await this.oracle.methods
        .createCustomIndex(initialValue)
        .send({
          from: this.wallet.currentAccount,
          gas: "150000",
        });

      console.log("✅ Index created in oracle:", oracleTx.transactionHash);

      // Step 3: Register in PreInteraction
      console.log("🔄 Registering index in PreInteraction...");
      const preIntTx = await this.preInteraction.methods
        .registerIndex(name, description, CONTRACTS.IndexOracle)
        .send({
          from: this.wallet.currentAccount,
          gas: "300000",
        });

      console.log("✅ Index registered in PreInteraction:", preIntTx.transactionHash);
      console.log(`🎉 Index "${name}" created with ID: ${indexId}`);

      // Clear cache so next fetch gets fresh data
      this.clearCache();

      return parseInt(indexId);

    } catch (error) {
      console.error("❌ Error creating index:", error);
      throw error;
    }
  }

  /**
   * Update an existing index value
   */
  async updateIndex(indexId: number, newValue: number): Promise<boolean> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      const tx = await this.oracle.methods
        .updateCustomIndex(indexId, newValue)
        .send({
          from: this.wallet.currentAccount,
          gas: "100000",
        });

      console.log("✅ Index updated:", tx.transactionHash);
      
      // Clear cache so next fetch gets fresh data
      this.clearCache();
      
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
  async searchIndicesByName(searchTerm: string): Promise<CustomIndex[]> {
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
   * Get complete information for a single index
   */
  async getIndexDetails(indexId: number): Promise<CustomIndex | null> {
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
   * Reinitialize contracts (called when network changes)
   */
  reinitialize(): void {
    this.initializeContracts();
    // Clear global cache when network changes
    this.clearCache();
  }
}