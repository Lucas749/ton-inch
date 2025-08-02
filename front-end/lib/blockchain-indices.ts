/**
 * 📊 Blockchain Indices Service
 * Handles index operations like creating, updating, and retrieving indices
 */

import { Web3 } from "web3";
import { CONTRACTS, ABIS } from "./blockchain-constants";
import { retryWithBackoff, delay } from "./blockchain-utils";
import type { CustomIndex, OrderCondition } from "./blockchain-types";
import type { BlockchainWallet } from "./blockchain-wallet";

export class BlockchainIndices {
  private web3: Web3;
  private wallet: BlockchainWallet;
  private oracle: any;
  private preInteraction: any;
  private indicesCache: CustomIndex[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private pendingRequest: Promise<CustomIndex[]> | null = null;

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
      ABIS.MockIndexOracle,
      CONTRACTS.MockIndexOracle
    );
    this.preInteraction = new this.web3.eth.Contract(
      ABIS.IndexPreInteraction,
      CONTRACTS.IndexPreInteraction
    );
  }

  /**
   * Get all custom indices from the oracle with rate limiting and caching
   */
  async getAllIndices(): Promise<CustomIndex[]> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.indicesCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
        console.log('📊 Using cached indices data');
        return this.indicesCache;
      }

      // If there's already a pending request, return it to avoid duplicate calls
      if (this.pendingRequest) {
        console.log('📊 Waiting for existing indices request...');
        return this.pendingRequest;
      }

      console.log('📊 Fetching all indices with rate limiting...');
      
      // Create and store the promise
      this.pendingRequest = this.fetchAllIndices();
      
      try {
        const indices = await this.pendingRequest;
        
        // Cache the results
        this.indicesCache = indices;
        this.cacheTimestamp = now;
        
        return indices;
      } finally {
        // Clear the pending request
        this.pendingRequest = null;
      }
    } catch (error) {
      console.error("❌ Error fetching indices:", error);
      this.pendingRequest = null; // Clear on error
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Internal method to actually fetch indices from the blockchain
   */
  private async fetchAllIndices(): Promise<CustomIndex[]> {
    const indices: CustomIndex[] = [];

      // Get the actual list of created custom indices from the oracle
      try {
        const customIndicesArray = await this.oracle.methods.getAllCustomIndices().call();
        console.log("📊 Found custom indices:", customIndicesArray);
        
        for (let i = 0; i < customIndicesArray.length; i++) {
          const indexId = customIndicesArray[i];
          try {
            const id = Number(indexId);
            
            // Use retry logic for getIndexValue
            const result = await retryWithBackoff(async () => {
              return await this.oracle.methods.getIndexValue(id).call();
            });
            
            // Try to get additional info from PreInteraction contract
            let indexInfo = null;
            try {
              indexInfo = await retryWithBackoff(async () => {
                return await this.preInteraction.methods.getIndexInfo(id).call();
              });
            } catch (e) {
              // Index not registered in PreInteraction, use default values
            }

            indices.push({
              id,
              name: indexInfo?.name || `Custom Index ${id}`,
              description:
                indexInfo?.description || `Custom index with ID ${id}`,
              value: Number(result[0]),
              timestamp: Number(result[1]),
              active: indexInfo?.isActive ?? true,
              creator: indexInfo?.creator,
              createdAt: indexInfo?.createdAt
                ? Number(indexInfo.createdAt)
                : undefined,
            });
            
            // Add delay between requests to avoid overwhelming RPC
            if (i < customIndicesArray.length - 1) {
              await delay(200);
            }
          } catch (e) {
            console.warn(`⚠️ Failed to load index ${indexId}:`, e);
            continue;
          }
        }
      } catch (error) {
        console.warn("Could not get custom indices list, falling back to range scan:", error);
        
        // Fallback: scan a wider range and validate more carefully
        for (let i = 0; i <= 50; i++) {
          try {
            const result = await retryWithBackoff(async () => {
              return await this.oracle.methods.getIndexValue(i).call();
            });
            
            // More robust existence check: ensure we have valid data and timestamp
            if (result && result[0] && Number(result[0]) > 0 && Number(result[1]) > 0) {
              let indexInfo = null;
              try {
                indexInfo = await retryWithBackoff(async () => {
                  return await this.preInteraction.methods.getIndexInfo(i).call();
                });
              } catch (e) {
                // Index not registered in PreInteraction
              }

              indices.push({
                id: i,
                name: indexInfo?.name || `Custom Index ${i}`,
                description:
                  indexInfo?.description || `Custom index with ID ${i}`,
                value: Number(result[0]),
                timestamp: Number(result[1]),
                active: indexInfo?.isActive ?? true,
                creator: indexInfo?.creator,
                createdAt: indexInfo?.createdAt
                  ? Number(indexInfo.createdAt)
                  : undefined,
              });
            }
            
            // Add delay between fallback requests
            await delay(100);
          } catch (e) {
            // Index doesn't exist, continue
            continue;
          }
        }
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
   * Clear the indices cache (call after creating/updating indices)
   */
  clearCache(): void {
    this.indicesCache = null;
    this.cacheTimestamp = 0;
    this.pendingRequest = null;
    console.log('🗑️ Cleared indices cache');
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
        .registerIndex(name, description, CONTRACTS.MockIndexOracle)
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
    // Clear cache when network changes
    this.clearCache();
  }
}