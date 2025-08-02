/**
 * 📊 Blockchain Indices Service
 * Handles index operations like creating, updating, and retrieving indices
 */

import { Web3 } from "web3";
import { CONTRACTS, ABIS, INDICES, ORACLE_TYPES } from "./blockchain-constants";
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
        console.log(`📊 Sample cached index names:`, globalIndicesCache.slice(0, 3).map(i => `${i.id}:"${i.name}"`));
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
        console.log(`📊 Fresh indices fetched! Count: ${indices.length}`);
        console.log(`📊 Fresh index names:`, indices.slice(0, 5).map(i => `${i.id}:"${i.name}"`));
        
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

    // First, load predefined indices (0-5) from the blockchain - these represent various economic and financial indicators
    console.log("🔍 Loading predefined indices (0-5) from blockchain...");
    const predefinedNames: Record<number, { name: string, symbol: string, description: string, alphaVantageSymbol?: string, category: string, currentValue: string, exampleCondition: string }> = {
      0: { name: "Inflation Rate", symbol: "INFL", description: "US Consumer Price Index inflation rate", category: "Economics", currentValue: "3.20%", exampleCondition: "Execute when inflation > 4%" },
      1: { name: "Elon Followers", symbol: "ELON", description: "Elon Musk's Twitter follower count", category: "Intelligence", currentValue: "150.0M", exampleCondition: "Execute when Elon > 160M followers" },
      2: { name: "BTC Price", symbol: "BTC", description: "Bitcoin price in USD", alphaVantageSymbol: "BTC", category: "Crypto", currentValue: "$43,000", exampleCondition: "Execute when BTC < $40,000" },
      3: { name: "VIX Index", symbol: "VIX", description: "CBOE Volatility Index", alphaVantageSymbol: "VIX", category: "Indices", currentValue: "22.57", exampleCondition: "Execute when VIX > 25" },
      4: { name: "Unemployment", symbol: "UNEMP", description: "US unemployment rate", category: "Economics", currentValue: "3.70%", exampleCondition: "Execute when unemployment > 4%" },
      5: { name: "Tesla Stock", symbol: "TSLA", description: "Tesla Inc. stock price", alphaVantageSymbol: "TSLA", category: "Stocks", currentValue: "$248.00", exampleCondition: "Execute when Tesla > $250" }
    };

    for (let id = 0; id <= 5; id++) {
      try {
        const result = await retryWithBackoff(async () => {
          return await this.oracle.methods.getIndexValue(id).call();
        });
        
        if (result && result[0]) {
          const predefinedInfo = predefinedNames[id];
          indices.push({
            id,
            name: predefinedInfo.name,
            description: predefinedInfo.description,
            value: Number(result[0]),
            timestamp: Number(result[1]) || Date.now(),
            active: true,
            creator: CONTRACTS.IndexOracle,
            createdAt: 0,
            symbol: predefinedInfo.symbol,
            alphaVantageSymbol: predefinedInfo.alphaVantageSymbol,
            category: predefinedInfo.category,
            currentValue: predefinedInfo.currentValue,
            exampleCondition: predefinedInfo.exampleCondition
          });
          console.log(`✅ Loaded predefined ${predefinedInfo.name}: ${Number(result[0])} basis points`);
        }
        
        // Add small delay between requests
        await delay(100);
      } catch (error) {
        console.warn(`⚠️ Could not load predefined index ${id}:`, error);
      }
    }

    // Then, load custom indices (6+) from the oracle
    console.log("🔍 Loading custom indices from blockchain...");
    try {
      const customIndicesArray = await this.oracle.methods.getAllCustomIndices().call();
      console.log("📊 Raw custom indices response:", customIndicesArray);
      
      if (customIndicesArray && customIndicesArray.indexIds && customIndicesArray.values) {
        const indexIds = customIndicesArray.indexIds;
        const values = customIndicesArray.values;
        const timestamps = customIndicesArray.timestamps;
        const activeStates = customIndicesArray.activeStates;
        
        console.log(`📋 Found ${indexIds.length} custom indices:`, indexIds.map((id: any) => Number(id)));
        
        // For each custom index, get its detailed information from the oracle
        for (let i = 0; i < indexIds.length; i++) {
          const id = Number(indexIds[i]);
          const value = Number(values[i]);
          const timestamp = Number(timestamps[i]);
          const active = Boolean(activeStates[i]);
          
          let indexDetails = null;
          try {
            // Get custom index details
            indexDetails = await this.oracle.methods.customIndexData(id).call();
            console.log(`📄 Custom index ${id} details:`, indexDetails);
            console.log(`📄 Index details length: ${indexDetails ? (indexDetails.length || indexDetails.__length__) : 'null'}`);
            console.log(`📄 Index details keys:`, indexDetails ? Object.keys(indexDetails) : 'null');
            if (indexDetails && (indexDetails.length >= 3 || indexDetails.__length__ >= 3 || indexDetails[2] !== undefined)) {
              console.log(`📄 SourceUrl at index 2: "${indexDetails[2]}"`);
            }
          } catch (error) {
            console.warn(`⚠️ Could not get details for custom index ${id}:`, error);
          }
          
          // Extract name from Alpha Vantage sourceUrl or use default naming
          let name = `Custom Index ${id}`;
          let description = `User-created index #${id}`;
          
          console.log(`🔍 Checking indexDetails for index ${id}: exists=${!!indexDetails}, length=${indexDetails ? (indexDetails.length || indexDetails.__length__) : 'N/A'}`);
          
          if (indexDetails && (indexDetails.length >= 3 || indexDetails.__length__ >= 3 || indexDetails[2] !== undefined)) {
            console.log(`🔍 IndexDetails has sufficient length for index ${id}`);
            const sourceUrl = indexDetails[2]; // sourceUrl is typically the 3rd element
            console.log(`🔍 Processing sourceUrl for index ${id}: "${sourceUrl}"`);
            console.log(`🔍 SourceUrl exists and trimmed: ${!!(sourceUrl && sourceUrl.trim())}`);
            if (sourceUrl && sourceUrl.trim()) {
              console.log(`🔍 Entering URL parsing logic for index ${id}`);
              
              // Simple and direct Alpha Vantage URL parsing
              if (sourceUrl.includes('alphavantage.co')) {
                console.log(`🔍 Detected Alpha Vantage URL for index ${id}`);
                try {
                  const url = new URL(sourceUrl);
                  const functionParam = url.searchParams.get('function');
                  const symbolParam = url.searchParams.get('symbol');
                  console.log(`🔍 Extracted from URL - function: "${functionParam}", symbol: "${symbolParam}"`);
                  
                  // Direct name extraction - no complex logic
                  if (symbolParam) {
                    name = symbolParam.toUpperCase();
                    if (functionParam && functionParam.toLowerCase().includes('earnings')) {
                      name = `${symbolParam.toUpperCase()} EPS`;
                    }
                    console.log(`✅ Using symbol-based name: "${name}"`);
                  } else if (functionParam) {
                    // For CORN, GOLD, etc. - just capitalize the function name
                    name = functionParam.charAt(0).toUpperCase() + functionParam.slice(1).toLowerCase();
                    console.log(`✅ Using function-based name: "${name}"`);
                  }
                  
                  description = `${name} tracked via Alpha Vantage`;
                  console.log(`✅ Final result for index ${id}: name="${name}", desc="${description}"`);
                  
                } catch (urlError) {
                  console.warn(`Could not parse sourceUrl for index ${id}:`, urlError);
                  // Keep the default name and description
                }
              } else {
                console.log(`🔍 Not an Alpha Vantage URL for index ${id}`);
              }
            } else {
              console.log(`🔍 SourceUrl for index ${id} is empty or whitespace only`);
            }
          } else {
            console.log(`🔍 IndexDetails for index ${id} doesn't have sufficient length or is null`);
          }
          
          console.log(`🔍 Final name for index ${id} after URL processing: "${name}"`);
          
          // Extract additional market data from Alpha Vantage URL - simplified
          let alphaVantageSymbol = null;
          let category = 'Custom';
          let avatar = '🔗';
          let color = 'bg-blue-500';
          
          if (indexDetails && (indexDetails.length >= 3 || indexDetails.__length__ >= 3 || indexDetails[2] !== undefined)) {
            const sourceUrl = indexDetails[2];
            if (sourceUrl && sourceUrl.includes('alphavantage.co')) {
              try {
                const url = new URL(sourceUrl);
                const functionParam = url.searchParams.get('function');
                const symbolParam = url.searchParams.get('symbol');
                
                if (symbolParam) {
                  alphaVantageSymbol = symbolParam.toUpperCase();
                }
                
                // Simple category assignment based on function/symbol
                if (symbolParam) {
                  // Has symbol - likely a stock, crypto, or specific asset
                  if (functionParam && functionParam.toLowerCase().includes('earnings')) {
                    category = 'Stocks';
                    avatar = '📊';
                    color = 'bg-green-500';
                  } else if (functionParam && functionParam.toLowerCase().includes('digital')) {
                    category = 'Crypto';
                    avatar = '₿';
                    color = 'bg-orange-500';
                  } else {
                    category = 'Stocks';
                    avatar = '📈';
                    color = 'bg-green-500';
                  }
                } else if (functionParam) {
                  const func = functionParam.toLowerCase();
                  // Commodities like CORN, GOLD, etc.
                  const commodities = ['corn', 'wheat', 'wti', 'brent', 'gold', 'silver', 'copper', 'oil', 'gas'];
                  if (commodities.some(c => func.includes(c))) {
                    category = 'Commodities';
                    avatar = '🌾';
                    color = 'bg-yellow-500';
                  } else if (func.includes('fx') || func.includes('currency')) {
                    category = 'Forex';
                    avatar = '💱';
                    color = 'bg-purple-500';
                  } else {
                    category = 'Economics';
                    avatar = '📊';
                    color = 'bg-red-500';
                  }
                }
                
                console.log(`🎨 Set category for index ${id}: ${category} (${avatar})`);
              } catch (urlError) {
                console.warn(`Could not parse sourceUrl for market data for index ${id}:`, urlError);
              }
            }
          }

          console.log(`🔍 Index ${id} final name: "${name}", symbol: "${alphaVantageSymbol || `IDX${id}`}", category: "${category}"`);
          
          indices.push({
            id,
            name,
            description,
            value,
            timestamp,
            active,
            creator: CONTRACTS.IndexOracle,
            createdAt: timestamp,
            alphaVantageSymbol,
            category,
            avatar,
            color,
            symbol: alphaVantageSymbol || `IDX${id}`
          });
          
          console.log(`✅ Loaded custom ${name}: ${value} basis points (active: ${active})`);
          
          // Add delay between requests
          await delay(100);
        }
      }
    } catch (error) {
      console.error("❌ Error loading custom indices:", error);
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
   * Check if the current user is the contract owner
   */
  async isOwner(): Promise<boolean> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        return false;
      }

      const ownerAddress = await this.oracle.methods.owner().call();
      return this.wallet.currentAccount.toLowerCase() === ownerAddress.toLowerCase();
    } catch (error) {
      console.error("❌ Error checking ownership:", error);
      return false;
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

      console.log(`📝 Updating Index ${indexId} to ${newValue}`);
      
      // Determine if it's predefined or custom index (matches backend logic)
      let tx;
      if (indexId <= 5) {
        console.log('📤 Updating predefined index...');
        
        // Estimate gas first to catch any issues early
        const gasEstimate = await this.oracle.methods
          .updateIndex(indexId, newValue)
          .estimateGas({ from: this.wallet.currentAccount });
        
        console.log(`⛽ Estimated gas: ${gasEstimate}`);
        
        tx = await this.oracle.methods
          .updateIndex(indexId, newValue)
          .send({
            from: this.wallet.currentAccount,
            gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
          });
      } else {
        console.log('📤 Updating custom index...');
        
        // Estimate gas first to catch any issues early
        const gasEstimate = await this.oracle.methods
          .updateCustomIndex(indexId, newValue)
          .estimateGas({ from: this.wallet.currentAccount });
        
        console.log(`⛽ Estimated gas: ${gasEstimate}`);
        
        tx = await this.oracle.methods
          .updateCustomIndex(indexId, newValue)
          .send({
            from: this.wallet.currentAccount,
            gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
          });
      }

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
   * Create a new custom index with oracle type (similar to backend oracle-manager.js)
   */
  async createIndexWithOracleType(
    name: string,
    initialValue: number,
    sourceUrl: string,
    oracleType: number
  ): Promise<{
    success: boolean;
    indexId?: number;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      console.log(`🆕 Creating new index with oracle type:`, {
        name,
        initialValue,
        sourceUrl,
        oracleType
      });
      
      console.log(`💰 Using your connected wallet: ${this.wallet.currentAccount}`);

      // Estimate gas first
      const gasEstimate = await this.oracle.methods
        .createCustomIndex(
          initialValue.toString(),
          sourceUrl,
          oracleType,
          '0x0000000000000000000000000000000000000000' // null address for chainlink oracle
        )
        .estimateGas({ from: this.wallet.currentAccount });

      console.log(`⛽ Estimated gas: ${gasEstimate}`);

      // Execute transaction
      const tx = await this.oracle.methods
        .createCustomIndex(
          initialValue.toString(),
          sourceUrl,
          oracleType,
          '0x0000000000000000000000000000000000000000'
        )
        .send({
          from: this.wallet.currentAccount,
          gas: Math.floor(Number(gasEstimate) * 1.2), // Convert BigInt to Number and add 20% buffer
        });

      console.log("✅ Index created successfully:", tx.transactionHash);

      // Parse the events to get the new index ID
      let indexId = null;
      if (tx.events && tx.events.CustomIndexCreated) {
        indexId = parseInt(tx.events.CustomIndexCreated.returnValues.indexId);
      }

      // Clear cache so next fetch gets fresh data
      this.clearCache();

      return {
        success: true,
        indexId: indexId,
        transactionHash: tx.transactionHash
      };

    } catch (error) {
      console.error("❌ Error creating index with oracle type:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
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