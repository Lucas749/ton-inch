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
   * Get all custom indices from the oracle (always fresh data)
   */
  async getAllIndices(): Promise<CustomIndex[]> {
    console.log('💀 DEBUG: getAllIndices() called in blockchain-indices.ts');
    try {
      // If there's already a pending request, return it to avoid duplicate calls
      if (globalPendingRequest) {
        console.log('💀 DEBUG: Using existing globalPendingRequest');
        return globalPendingRequest;
      }
      
      console.log('💀 DEBUG: Creating new fetchAllIndices() request');
      // Create and store the global promise
      globalPendingRequest = this.fetchAllIndices();
      
      try {
        const indices = await globalPendingRequest;
        console.log('💀 DEBUG: fetchAllIndices() returned:', indices.length, 'indices');
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
    console.log('💀 DEBUG: fetchAllIndices() called - starting blockchain fetch');
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
        
        // DEBUG: Check if index 15 is in the custom indices
        const has15 = indexIds.some((id: any) => Number(id) === 15);
        console.log('🐛 DEBUG: Index 15 in custom indices?', has15);
        if (!has15) {
          console.log('🚨 PROBLEM: Index 15 NOT found in getAllCustomIndices() response!');
          console.log('🚨 This means it might be coming from predefined indices or another source');
        }
        
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
            // Get custom index details for URL parsing
          } catch (error) {
            console.warn(`⚠️ Could not get details for custom index ${id}:`, error);
          }
          
          // Extract name from Alpha Vantage sourceUrl or use default naming
          let name = `Custom Index ${id}`;
          let description = `User-created index #${id}`;
          
          // DEBUG: Log index 15 parsing
          if (id === 15) {
            console.log('🐛 DEBUG: Index 15 parsing details:', {
              id,
              indexDetails: indexDetails,
              sourceUrl: indexDetails?.[2] || 'NO_SOURCE_URL',
              hasIndexDetails: !!indexDetails,
              indexDetailsLength: indexDetails?.length || 0
            });
          }
          
          if (indexDetails && (indexDetails.length >= 3 || indexDetails.__length__ >= 3 || indexDetails[2] !== undefined)) {
            const sourceUrl = indexDetails[2]; // sourceUrl is typically the 3rd element
            
            // DEBUG: Log index 15 sourceUrl processing
            if (id === 15) {
              console.log('🐛 DEBUG: Index 15 sourceUrl processing:', {
                sourceUrl,
                sourceUrlTrimmed: sourceUrl?.trim(),
                willProcess: !!(sourceUrl && sourceUrl.trim())
              });
            }
            
            if (sourceUrl && sourceUrl.trim()) {
              
              // Simple and direct Alpha Vantage URL parsing
              if (sourceUrl.includes('alphavantage.co')) {
                try {
                  const url = new URL(sourceUrl);
                  const functionParam = url.searchParams.get('function');
                  const symbolParam = url.searchParams.get('symbol');
                  
                  // Direct name extraction - no complex logic
                  if (symbolParam) {
                    name = symbolParam.toUpperCase();
                    if (functionParam && functionParam.toLowerCase().includes('earnings')) {
                      name = `${symbolParam.toUpperCase()} EPS`;
                    }
                  } else if (functionParam) {
                    // For CORN, GOLD, etc. - just capitalize the function name
                    name = functionParam.charAt(0).toUpperCase() + functionParam.slice(1).toLowerCase();
                  }
                  
                  description = `${name} tracked via Alpha Vantage`;
                  
                } catch (urlError) {
                  console.warn(`Could not parse sourceUrl for index ${id}:`, urlError);
                  // Keep the default name and description
                }
              }
            }
          }
          
          // Extract additional market data from Alpha Vantage URL - simplified
          let alphaVantageSymbol: string | undefined = undefined;
          let category = 'Custom';
          
          if (indexDetails && (indexDetails.length >= 3 || indexDetails.__length__ >= 3 || indexDetails[2] !== undefined)) {
            const sourceUrl = indexDetails[2];
            if (sourceUrl && sourceUrl.includes('alphavantage.co')) {
              try {
                const url = new URL(sourceUrl);
                const functionParam = url.searchParams.get('function');
                const symbolParam = url.searchParams.get('symbol');
                
                if (symbolParam) {
                  alphaVantageSymbol = symbolParam.toUpperCase();
                } else if (functionParam) {
                  // Use function name as symbol for commodities, etc.
                  alphaVantageSymbol = functionParam.toUpperCase();
                }
                
                // Simple category assignment based on function/symbol
                if (symbolParam) {
                  // Has symbol - likely a stock, crypto, or specific asset
                  if (functionParam && functionParam.toLowerCase().includes('earnings')) {
                    category = 'Stocks';
                  } else if (functionParam && functionParam.toLowerCase().includes('digital')) {
                    category = 'Crypto';
                  } else {
                    category = 'Stocks';
                  }
                } else if (functionParam) {
                  const func = functionParam.toLowerCase();
                  // Commodities like CORN, GOLD, etc.
                  const commodities = ['corn', 'wheat', 'wti', 'brent', 'gold', 'silver', 'copper', 'oil', 'gas'];
                  if (commodities.some(c => func.includes(c))) {
                    category = 'Commodities';
                  } else if (func.includes('fx') || func.includes('currency')) {
                    category = 'Forex';
                  } else {
                    category = 'Economics';
                  }
                }
                
              } catch (urlError) {
                console.warn(`Could not parse sourceUrl for market data for index ${id}:`, urlError);
              }
            }
          }
          
          // Extract sourceUrl for external link
          const sourceUrl = indexDetails && indexDetails[2] ? indexDetails[2] : null;
          
          // DEBUG: Log index 15 final values before pushing
          if (id === 15) {
            console.log('🐛 DEBUG: Index 15 final values before push:', {
              id,
              name,
              description,
              category,
              alphaVantageSymbol,
              symbol: alphaVantageSymbol || `IDX${id}`,
              active,
              value,
              sourceUrl: indexDetails?.[2] || 'NO_SOURCE_URL'
            });
          }
          
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
            symbol: alphaVantageSymbol || `IDX${id}`
          });
          
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

      let result;
      
      if (indexId <= 5) {
        // Predefined index (0-5) - use indexData method
        result = await this.oracle.methods.indexData(indexId).call();
      } else {
        // Custom index (6+) - use customIndexData method
        result = await this.oracle.methods.customIndexData(indexId).call();
      }
      
      if (!result || !result[0]) {
        throw new Error(`Index ${indexId} does not exist or has no value`);
      }

      // Result format: [value, timestamp, sourceUrl, isActive, oracleType]
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
   * Clear any pending requests (no cache to clear)
   */
  clearCache(): void {
    globalPendingRequest = null;
    console.log('🗑️ Cleared pending requests');
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
          maxFeePerGas: '10000000', // 0.01 gwei - proper Base L2 max fee
          maxPriorityFeePerGas: '1000000', // 0.001 gwei - proper Base L2 priority fee
        });

      console.log("✅ Index created in oracle:", oracleTx.transactionHash);

      // Step 3: Register in PreInteraction
      console.log("🔄 Registering index in PreInteraction...");
      const preIntTx = await this.preInteraction.methods
        .registerIndex(name, description, CONTRACTS.IndexOracle)
        .send({
          from: this.wallet.currentAccount,
          gas: "300000",
          maxFeePerGas: '10000000', // 0.01 gwei - proper Base L2 max fee
          maxPriorityFeePerGas: '1000000', // 0.001 gwei - proper Base L2 priority fee
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
   * Update an existing index value (oracle-type aware)
   */
  async updateIndex(indexId: number, newValue: number): Promise<boolean> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      console.log(`📝 Updating Index ${indexId} to ${newValue}`);
      
      // Check current oracle type to provide better feedback
      try {
        const { oracleType, oracleTypeName } = await this.getIndexOracleType(indexId);
        console.log(`🔍 Index ${indexId} uses ${oracleTypeName}`);
        
        if (oracleType === ORACLE_TYPES.CHAINLINK) {
          console.log("📡 Note: This index uses Chainlink Functions - manual updates will override oracle data temporarily");
          console.log("💡 Chainlink Functions will continue to update this index automatically based on its source URL");
        } else {
          console.log("🏭 Note: This index uses Mock Oracle - manual updates will persist until next manual update");
        }
      } catch (error) {
        console.log("⚠️ Could not determine oracle type, proceeding with update...");
      }
      
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
            maxFeePerGas: '10000000', // 0.01 gwei - proper Base L2 max fee
            maxPriorityFeePerGas: '1000000', // 0.001 gwei - proper Base L2 priority fee
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
            maxFeePerGas: '10000000', // 0.01 gwei - proper Base L2 max fee
            maxPriorityFeePerGas: '1000000', // 0.001 gwei - proper Base L2 priority fee
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
   * Set index status (active/inactive) using connected wallet
   */
  async setIndexStatus(indexId: number, isActive: boolean): Promise<boolean> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      console.log(`⚙️ Setting Index ${indexId} Status to ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`🏠 Using contract: ${CONTRACTS.IndexOracle}`);
      console.log(`👤 From wallet: ${this.wallet.currentAccount}`);
      
      // Determine if it's predefined or custom index (matches backend logic)
      let tx;
      if (indexId <= 5) {
        console.log('📤 Updating predefined index status...');
        console.log('🔧 Calling: setIndexActive(indexId, isActive)');
        
        // Estimate gas first to catch any issues early
        const gasEstimate = await this.oracle.methods
          .setIndexActive(indexId, isActive)
          .estimateGas({ from: this.wallet.currentAccount });
        
        console.log(`⛽ Estimated gas: ${gasEstimate}`);
        
        tx = await this.oracle.methods
          .setIndexActive(indexId, isActive)
          .send({
            from: this.wallet.currentAccount,
            gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
            maxFeePerGas: '10000000', // 0.01 gwei - proper Base L2 max fee
            maxPriorityFeePerGas: '1000000', // 0.001 gwei - proper Base L2 priority fee
          });
      } else {
        console.log('📤 Updating custom index status...');
        console.log('🔧 Calling: setCustomIndexActive(indexId, isActive)');
        
        // Estimate gas first to catch any issues early
        const gasEstimate = await this.oracle.methods
          .setCustomIndexActive(indexId, isActive)
          .estimateGas({ from: this.wallet.currentAccount });
        
        console.log(`⛽ Estimated gas: ${gasEstimate}`);
        console.log(`🔐 Note: This will check ownership - you must be either:`);
        console.log(`   1. Contract owner, OR`);
        console.log(`   2. Creator of index ${indexId}`);
        
        tx = await this.oracle.methods
          .setCustomIndexActive(indexId, isActive)
          .send({
            from: this.wallet.currentAccount,
            gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
            maxFeePerGas: '10000000', // 0.01 gwei - proper Base L2 max fee
            maxPriorityFeePerGas: '1000000', // 0.001 gwei - proper Base L2 priority fee
          });
      }

      console.log(`✅ Index ${indexId} status updated to ${isActive ? 'ACTIVE' : 'INACTIVE'}:`, tx.transactionHash);
      
      // Clear cache so next fetch gets fresh data
      this.clearCache();
      
      return true;
    } catch (error: any) {
      console.error("❌ Error setting index status:", error);
      
      // Provide more helpful error messages for common ownership issues
      if (error.message && error.message.includes('Not owner')) {
        const enhancedError = new Error(
          `Access denied: You are not authorized to modify index ${indexId}. ` +
          `You must be either the contract owner or the creator of this index. ` +
          `Check the console logs above for detailed ownership information.`
        );
        enhancedError.name = 'OwnershipError';
        throw enhancedError;
      } else if (error.message && error.message.includes('execution reverted')) {
        const enhancedError = new Error(
          `Transaction reverted: ${error.message}. ` +
          `This typically means you don't have permission to modify this index. ` +
          `Check the console logs above for detailed ownership information.`
        );
        enhancedError.name = 'TransactionRevertedError';
        throw enhancedError;
      }
      
      throw error;
    }
  }

  /**
   * Set oracle type for an index using connected wallet
   */
  async setIndexOracleType(indexId: number, oracleType: number): Promise<{ oracleType: number; oracleTypeName: string }> {
    try {
      if (!this.wallet.isWalletConnected() || !this.wallet.currentAccount) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      const oracleTypeNames = {
        0: 'Mock Oracle',
        1: 'Chainlink Functions'
      };
      const oracleTypeName = oracleTypeNames[oracleType as keyof typeof oracleTypeNames] || `Type ${oracleType}`;

      console.log(`🔄 Setting Oracle Type for Index ${indexId} to ${oracleTypeName}`);
      
      // Determine if it's predefined or custom index (matches backend logic)
      let tx;
      if (indexId <= 5) {
        console.log('📤 Updating predefined index oracle type...');
        
        // Estimate gas first to catch any issues early
        const gasEstimate = await this.oracle.methods
          .setIndexOracleType(indexId, oracleType)
          .estimateGas({ from: this.wallet.currentAccount });
        
        console.log(`⛽ Estimated gas: ${gasEstimate}`);
        
        tx = await this.oracle.methods
          .setIndexOracleType(indexId, oracleType)
          .send({
            from: this.wallet.currentAccount,
            gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
            maxFeePerGas: '10000000', // 0.01 gwei - proper Base L2 max fee
            maxPriorityFeePerGas: '1000000', // 0.001 gwei - proper Base L2 priority fee
          });
      } else {
        console.log('📤 Updating custom index oracle type...');
        
        // Estimate gas first to catch any issues early
        const gasEstimate = await this.oracle.methods
          .setCustomIndexOracleType(indexId, oracleType)
          .estimateGas({ from: this.wallet.currentAccount });
        
        console.log(`⛽ Estimated gas: ${gasEstimate}`);
        
        tx = await this.oracle.methods
          .setCustomIndexOracleType(indexId, oracleType)
          .send({
            from: this.wallet.currentAccount,
            gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
            maxFeePerGas: '10000000', // 0.01 gwei - proper Base L2 max fee
            maxPriorityFeePerGas: '1000000', // 0.001 gwei - proper Base L2 priority fee
          });
      }

      console.log(`✅ Oracle type updated to ${oracleTypeName}:`, tx.transactionHash);
      
      // Provide information about value updates based on oracle type
      if (oracleType === ORACLE_TYPES.CHAINLINK) {
        console.log("📡 Switched to Chainlink Functions - index will be updated automatically based on its source URL");
        console.log("💡 Chainlink Functions will fetch real-time data and update the index value periodically");
      } else {
        console.log("🏭 Switched to Mock Oracle - index value updates are now manual only");
        console.log("💡 Use the 'Update Value' feature to manually set index values");
      }
      
      // Clear cache so next fetch gets fresh data
      this.clearCache();
      
      return { oracleType, oracleTypeName };
    } catch (error) {
      console.error("❌ Error setting oracle type:", error);
      throw error;
    }
  }

  /**
   * Get oracle type for an index
   */
  async getIndexOracleType(indexId: number): Promise<{ oracleType: number; oracleTypeName: string }> {
    try {
      console.log(`🔍 Getting Oracle Type for Index ${indexId}`);
      
      const oracleType = await this.oracle.methods.getIndexOracleType(indexId).call();
      
      const oracleTypeNames = {
        0: 'Mock Oracle',
        1: 'Chainlink Functions'
      };
      const oracleTypeName = oracleTypeNames[Number(oracleType) as keyof typeof oracleTypeNames] || `Type ${oracleType}`;

      console.log(`✅ Index ${indexId} uses ${oracleTypeName}`);

      return { 
        oracleType: Number(oracleType), 
        oracleTypeName 
      };
    } catch (error) {
      console.error("❌ Error getting oracle type:", error);
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
          maxFeePerGas: '10000000', // 0.01 gwei - proper Base L2 max fee
          maxPriorityFeePerGas: '1000000', // 0.001 gwei - proper Base L2 priority fee
        });

      console.log("✅ Index created successfully:", tx.transactionHash);

      // Parse the events to get the new index ID
      let indexId: number | undefined = undefined;
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