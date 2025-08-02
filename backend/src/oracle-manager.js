#!/usr/bin/env node

/**
 * Oracle Manager - Complete interface for MockIndexOracle contract
 * 
 * Provides functions to:
 * - Query all index data
 * - Create new custom indices
 * - Update existing indices
 * - View all indices and their data
 * - Manage index states
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Manual config since config.ts is TypeScript
const CONFIG = {
    CHAIN_ID: parseInt(process.env.CHAIN_ID) || 8453,
    RPC_URL: process.env.RPC_URL || 'https://base.llamarpc.com',
    CONTRACTS: {
        INDEX_ORACLE_ADDRESS: process.env.INDEX_ORACLE_ADDRESS || '0x8a585F9B2359Ef093E8a2f5432F387960e953BD2'
    }
};

// Contract ABI for HybridIndexOracle (previously MockIndexOracle)
const MOCK_INDEX_ORACLE_ABI = [
    // Read Functions
    "function getIndexValue(uint8 indexType) external view returns (uint256 value, uint256 timestamp)",
    "function getIndexValue(uint256 indexId) external view returns (uint256 value, uint256 timestamp)",
    "function isValidIndex(uint8 indexType) external view returns (bool)",
    "function isValidIndex(uint256 indexId) external view returns (bool)",
    "function getNextCustomIndexId() external view returns (uint256)",
    "function getAllCustomIndices() external view returns (uint256[] memory indexIds, uint256[] memory values, uint256[] memory timestamps, bool[] memory activeStates)",
    "function indexData(uint8) external view returns (uint256 value, uint256 timestamp, string memory sourceUrl, bool isActive, uint8 oracleType)",
    "function customIndexData(uint256) external view returns (uint256 value, uint256 timestamp, string memory sourceUrl, bool isActive, uint8 oracleType)",
    "function owner() external view returns (address)",
    
    // Write Functions (onlyOwner)
    "function updateIndex(uint8 indexType, uint256 newValue) external",
    "function updateIndices(uint8[] calldata indexTypes, uint256[] calldata newValues) external",
    "function setIndexActive(uint8 indexType, bool isActive) external",
    "function simulatePriceMovement(uint8 indexType, uint256 percentChange, bool isIncrease) external",

    "function createCustomIndex(uint256 initialValue, string calldata sourceUrl, uint8 oracleType, address chainlinkOracleAddress) external returns (uint256 indexId)",
    "function updateCustomIndex(uint256 indexId, uint256 newValue) external",
    "function setCustomIndexActive(uint256 indexId, bool isActive) external",
    "function transferOwnership(address newOwner) external",
    
    // Hybrid Oracle Functions
    "function setChainlinkOracle(address _chainlinkOracleAddress) external",
    "function setIndexChainlinkOracle(uint256 indexId, address _chainlinkOracleAddress) external",
    "function batchSetIndexChainlinkOracles(uint256[] calldata indexIds, address[] calldata chainlinkOracleAddresses) external",
    "function getIndexChainlinkOracle(uint256 indexId) external view returns (address oracleAddress)",
    "function getMultipleIndexChainlinkOracles(uint256[] calldata indexIds) external view returns (address[] memory oracleAddresses, bool[] memory isSpecific)",
    "function setIndexOracleType(uint256 indexId, uint8 oracleType) external",
    "function setCustomIndexOracleType(uint256 indexId, uint8 oracleType) external",
    "function batchSetOracleType(uint256[] calldata indexIds, uint8[] calldata oracleTypes) external",
    "function getIndexOracleType(uint256 indexId) external view returns (uint8 oracleType)",
    "function getHybridOracleStatus() external view returns (address chainlinkAddress, bool isChainlinkConfigured, uint256 mockIndicesCount, uint256 chainlinkIndicesCount)",
    "function defaultChainlinkOracleAddress() external view returns (address)",
    "function indexChainlinkOracles(uint256) external view returns (address)",
    
    // Events
    "event IndexUpdated(uint8 indexed indexType, uint256 value, uint256 timestamp, string sourceUrl)",
    "event CustomIndexCreated(uint256 indexed indexId, uint256 value, uint256 timestamp, string sourceUrl)",
    "event SourceUrlUpdated(uint256 indexed indexId, string oldUrl, string newUrl)"
];

// Index type mappings
const INDEX_TYPES = {
    INFLATION_RATE: 0,
    ELON_FOLLOWERS: 1,
    BTC_PRICE: 2,
    VIX_INDEX: 3,
    UNEMPLOYMENT_RATE: 4,
    TESLA_STOCK: 5
};

const INDEX_NAMES = {
    0: 'Inflation Rate',
    1: 'Elon Followers', 
    2: 'BTC Price',
    3: 'VIX Index',
    4: 'Unemployment Rate',
    5: 'Tesla Stock'
};

const INDEX_SYMBOLS = {
    0: 'INFL',
    1: 'ELON',
    2: 'BTC',
    3: 'VIX',
    4: 'UNEMP',
    5: 'TSLA'
};

// Oracle type mappings
const ORACLE_TYPES = {
    MOCK: 0,
    CHAINLINK: 1
};

const ORACLE_TYPE_NAMES = {
    0: 'Mock Oracle',
    1: 'Chainlink Functions'
};

const INDEX_UNITS = {
    0: 'Basis Points (100 = 1%)',
    1: 'Follower Count',
    2: 'USD (scaled by 100)',
    3: 'Basis Points (100 = 1.00)',
    4: 'Basis Points (100 = 1%)',
    5: 'USD (scaled by 100)'
};

// ===================================================================
// INITIALIZATION
// ===================================================================

/**
 * Initialize oracle contract connection
 */
async function initializeOracle(privateKey = null) {
    console.log('🔧 Initializing Oracle Connection');
    console.log('==================================');
    
    try {
        // Create provider
        const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
        
        // Create wallet if private key provided
        let wallet = null;
        if (privateKey) {
            wallet = new ethers.Wallet(privateKey, provider);
            console.log(`👤 Wallet: ${wallet.address}`);
        }
        
        // Create contract instance
        const contract = new ethers.Contract(
            CONFIG.CONTRACTS.INDEX_ORACLE_ADDRESS,
            MOCK_INDEX_ORACLE_ABI,
            wallet || provider
        );
        
        console.log(`📍 Oracle Address: ${CONFIG.CONTRACTS.INDEX_ORACLE_ADDRESS}`);
        console.log(`🌐 Network: ${CONFIG.CHAIN_ID}`);
        console.log('✅ Oracle connection initialized\n');
        
        return { provider, wallet, contract };
    } catch (error) {
        console.error('❌ Failed to initialize oracle:', error.message);
        throw error;
    }
}

// ===================================================================
// READ FUNCTIONS - Query Oracle Data
// ===================================================================

/**
 * Get all predefined indices data
 */
async function getAllPredefinedIndices() {
    console.log('📊 Getting All Predefined Indices');
    console.log('=================================');
    
    try {
        const { contract } = await initializeOracle();
        
        const indices = [];
        
        for (let i = 0; i <= 5; i++) {
            try {
                const [value, timestamp, sourceUrl, isActive] = await contract.indexData(i);
                
                indices.push({
                    id: i,
                    type: 'predefined',
                    name: INDEX_NAMES[i],
                    symbol: INDEX_SYMBOLS[i],
                    value: value.toString(),
                    timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
                    sourceUrl: sourceUrl,
                    isActive: isActive,
                    unit: INDEX_UNITS[i],
                    formatted: formatIndexValue(i, value)
                });
            } catch (error) {
                console.warn(`Warning: Could not fetch index ${i}: ${error.message}`);
            }
        }
        
        console.log(`✅ Found ${indices.length} predefined indices\n`);
        
        return {
            success: true,
            indices: indices,
            count: indices.length
        };
        
    } catch (error) {
        console.error('❌ Failed to get predefined indices:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get all custom indices data
 */
async function getAllCustomIndices() {
    console.log('📊 Getting All Custom Indices');
    console.log('=============================');
    
    try {
        const { contract } = await initializeOracle();
        
        const [indexIds, values, timestamps, activeStates] = await contract.getAllCustomIndices();
        
        const customIndices = [];
        
        for (let i = 0; i < indexIds.length; i++) {
            try {
                const [, , sourceUrl,] = await contract.customIndexData(indexIds[i]);
                
                customIndices.push({
                    id: indexIds[i].toNumber(),
                    type: 'custom',
                    name: `Custom Index ${indexIds[i]}`,
                    symbol: `CUSTOM${indexIds[i]}`,
                    value: values[i].toString(),
                    timestamp: new Date(timestamps[i].toNumber() * 1000).toISOString(),
                    sourceUrl: sourceUrl,
                    isActive: activeStates[i],
                    unit: 'Custom Unit',
                    formatted: values[i].toString()
                });
            } catch (error) {
                console.warn(`Warning: Could not fetch custom index ${indexIds[i]}: ${error.message}`);
            }
        }
        
        console.log(`✅ Found ${customIndices.length} custom indices\n`);
        
        return {
            success: true,
            indices: customIndices,
            count: customIndices.length
        };
        
    } catch (error) {
        console.error('❌ Failed to get custom indices:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get all indices (predefined + custom)
 */
async function getAllIndices() {
    console.log('📊 Getting ALL Indices (Predefined + Custom)');
    console.log('==============================================');
    
    try {
        const predefinedResult = await getAllPredefinedIndices();
        const customResult = await getAllCustomIndices();
        
        if (!predefinedResult.success || !customResult.success) {
            throw new Error('Failed to fetch some indices');
        }
        
        const allIndices = [
            ...predefinedResult.indices,
            ...customResult.indices
        ];
        
        console.log(`📋 TOTAL INDICES SUMMARY`);
        console.log(`========================`);
        console.log(`   Predefined: ${predefinedResult.count}`);
        console.log(`   Custom: ${customResult.count}`);
        console.log(`   TOTAL: ${allIndices.length}\n`);
        
        return {
            success: true,
            indices: allIndices,
            summary: {
                total: allIndices.length,
                predefined: predefinedResult.count,
                custom: customResult.count
            }
        };
        
    } catch (error) {
        console.error('❌ Failed to get all indices:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get specific index data by ID
 */
async function getIndexById(indexId) {
    console.log(`🔍 Getting Index Data for ID: ${indexId}`);
    console.log('=======================================');
    
    try {
        const { contract } = await initializeOracle();
        
        let indexData;
        
        if (indexId <= 5) {
            // Predefined index
            const [value, timestamp, sourceUrl, isActive] = await contract.indexData(indexId);
            
            indexData = {
                id: indexId,
                type: 'predefined',
                name: INDEX_NAMES[indexId],
                symbol: INDEX_SYMBOLS[indexId],
                value: value.toString(),
                timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
                sourceUrl: sourceUrl,
                isActive: isActive,
                unit: INDEX_UNITS[indexId],
                formatted: formatIndexValue(indexId, value)
            };
        } else {
            // Custom index
            const [value, timestamp, sourceUrl, isActive] = await contract.customIndexData(indexId);
            
            indexData = {
                id: indexId,
                type: 'custom',
                name: `Custom Index ${indexId}`,
                symbol: `CUSTOM${indexId}`,
                value: value.toString(),
                timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
                sourceUrl: sourceUrl,
                isActive: isActive,
                unit: 'Custom Unit',
                formatted: value.toString()
            };
        }
        
        console.log(`✅ Found index: ${indexData.name} (${indexData.symbol})`);
        console.log(`   Value: ${indexData.formatted}`);
        console.log(`   Active: ${indexData.isActive}`);
        console.log(`   Updated: ${indexData.timestamp}\n`);
        
        return {
            success: true,
            index: indexData
        };
        
    } catch (error) {
        console.error(`❌ Failed to get index ${indexId}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Check oracle contract status
 */
async function getOracleStatus() {
    console.log('🔍 Getting Oracle Contract Status');
    console.log('=================================');
    
    try {
        const { contract } = await initializeOracle();
        
        const owner = await contract.owner();
        const nextCustomId = await contract.getNextCustomIndexId();
        
        console.log(`📍 Contract Address: ${CONFIG.CONTRACTS.INDEX_ORACLE_ADDRESS}`);
        console.log(`👤 Owner: ${owner}`);
        console.log(`🆔 Next Custom Index ID: ${nextCustomId}`);
        console.log('✅ Oracle is operational\n');
        
        return {
            success: true,
            contractAddress: CONFIG.CONTRACTS.INDEX_ORACLE_ADDRESS,
            owner: owner,
            nextCustomIndexId: nextCustomId.toNumber(),
            status: 'operational'
        };
        
    } catch (error) {
        console.error('❌ Failed to get oracle status:', error.message);
        return { success: false, error: error.message };
    }
}

// ===================================================================
// WRITE FUNCTIONS - Modify Oracle Data (Requires Private Key)
// ===================================================================

/**
 * Create a new custom index (simple version - defaults to MOCK oracle)
 * @param {number} initialValue - Initial value for the index
 * @param {string} sourceUrl - URL where this index data comes from  
 * @param {string} privateKey - Private key for transaction signing
 * @returns {Promise<Object>} Result object with success status and index details
 */
async function createNewIndex(initialValue, sourceUrl, privateKey) {
    console.log('🆕 Creating New Custom Index (Simple Version)');
    console.log('==============================================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    // Use the enhanced function with MOCK oracle as default
    return await createNewIndexWithChainlinkOracle(
        `Custom Index`, // Default name
        initialValue,
        sourceUrl,
        ORACLE_TYPES.MOCK,  // Default to MOCK oracle
        null,               // No specific Chainlink oracle
        privateKey
    );
}

/**
 * Update an existing index value
 */
async function updateIndexValue(indexId, newValue, privateKey) {
    console.log(`📝 Updating Index ${indexId}`);
    console.log('======================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        console.log(`🆔 Index ID: ${indexId}`);
        console.log(`💰 New Value: ${newValue}`);
        console.log(`👤 Updater: ${wallet.address}`);
        
        // Determine if it's predefined or custom index
        let tx;
        if (indexId <= 5) {
            console.log('📤 Updating predefined index...');
            tx = await contract.updateIndex(indexId, newValue);
        } else {
            console.log('📤 Updating custom index...');
            tx = await contract.updateCustomIndex(indexId, newValue);
        }
        
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Index ${indexId} updated successfully!`);
        console.log(`💰 New Value: ${newValue}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexId: indexId,
            newValue: newValue,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error(`❌ Failed to update index ${indexId}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Simulate price movement for demo purposes
 */
async function simulatePriceMovement(indexId, percentChange, isIncrease, privateKey) {
    console.log(`🎬 Simulating Price Movement for Index ${indexId}`);
    console.log('============================================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    if (indexId > 5) {
        throw new Error('Price simulation only available for predefined indices');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        console.log(`🆔 Index: ${INDEX_NAMES[indexId]} (${INDEX_SYMBOLS[indexId]})`);
        console.log(`📈 Change: ${isIncrease ? '+' : '-'}${percentChange / 100}%`);
        console.log(`👤 Simulator: ${wallet.address}`);
        
        console.log('📤 Submitting simulation...');
        const tx = await contract.simulatePriceMovement(indexId, percentChange, isIncrease);
        
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Price movement simulated successfully!`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexId: indexId,
            percentChange: percentChange,
            isIncrease: isIncrease,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error(`❌ Failed to simulate price movement:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Set index active/inactive status
 */
async function setIndexStatus(indexId, isActive, privateKey) {
    console.log(`⚙️ Setting Index ${indexId} Status`);
    console.log('==============================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        console.log(`🆔 Index ID: ${indexId}`);
        console.log(`📊 New Status: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`👤 Updater: ${wallet.address}`);
        
        // Determine if it's predefined or custom index
        let tx;
        if (indexId <= 5) {
            console.log('📤 Updating predefined index status...');
            tx = await contract.setIndexActive(indexId, isActive);
        } else {
            console.log('📤 Updating custom index status...');
            tx = await contract.setCustomIndexActive(indexId, isActive);
        }
        
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Index ${indexId} status updated!`);
        console.log(`📊 Status: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexId: indexId,
            isActive: isActive,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error(`❌ Failed to set index status:`, error.message);
        return { success: false, error: error.message };
    }
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Format index value for display
 */
function formatIndexValue(indexId, value) {
    const numValue = typeof value === 'string' ? parseInt(value) : value.toNumber();
    
    switch (indexId) {
        case 0: // Inflation Rate (basis points)
        case 4: // Unemployment Rate (basis points)
            return `${(numValue / 100).toFixed(2)}%`;
        case 1: // Elon Followers
            return `${(numValue / 1000000).toFixed(1)}M followers`;
        case 2: // BTC Price (scaled by 100)
        case 5: // Tesla Stock (scaled by 100)
            return `$${(numValue / 100).toFixed(2)}`;
        case 3: // VIX Index (basis points)
            return `${(numValue / 100).toFixed(2)}`;
        default:
            return numValue.toString();
    }
}

/**
 * Display formatted index data
 */
function displayIndex(index) {
    console.log(`📊 ${index.name} (${index.symbol})`);
    console.log(`   ID: ${index.id}`);
    console.log(`   Value: ${index.formatted}`);
    console.log(`   Raw Value: ${index.value}`);
    console.log(`   Status: ${index.isActive ? '🟢 Active' : '🔴 Inactive'}`);
    console.log(`   Updated: ${index.timestamp}`);
    console.log(`   Source: ${index.sourceUrl || 'N/A'}`);
    console.log(`   Unit: ${index.unit}`);
    console.log('');
}

/**
 * Display all indices in a formatted table
 */
function displayAllIndices(indices) {
    console.log('📋 ALL INDICES SUMMARY');
    console.log('======================');
    
    indices.forEach((index, i) => {
        const status = index.isActive ? '🟢' : '🔴';
        const type = index.type === 'predefined' ? '🏭' : '🛠️';
        console.log(`${i + 1}. ${type} ${status} ${index.name} (${index.symbol}) - ${index.formatted}`);
    });
    console.log('');
}

// ===================================================================
// HYBRID ORACLE FUNCTIONS
// ===================================================================

/**
 * Set the default Chainlink oracle address (fallback for all indices)
 */
async function setChainlinkOracleAddress(chainlinkOracleAddress, privateKey) {
    console.log('🔗 Setting Default Chainlink Oracle Address');
    console.log('===========================================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        console.log(`🔗 Setting Default Chainlink Oracle to: ${chainlinkOracleAddress}`);
        
        const tx = await contract.setChainlinkOracle(chainlinkOracleAddress);
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Default Chainlink oracle address updated successfully!`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            chainlinkOracleAddress: chainlinkOracleAddress,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error('❌ Failed to set default Chainlink oracle:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Set specific Chainlink oracle address for an index
 */
async function setIndexChainlinkOracleAddress(indexId, chainlinkOracleAddress, privateKey) {
    console.log(`🔗 Setting Chainlink Oracle for Index ${indexId}`);
    console.log('===============================================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        console.log(`🆔 Index ID: ${indexId}`);
        console.log(`🔗 Chainlink Oracle: ${chainlinkOracleAddress}`);
        
        const tx = await contract.setIndexChainlinkOracle(indexId, chainlinkOracleAddress);
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Index ${indexId} Chainlink oracle set successfully!`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexId: indexId,
            chainlinkOracleAddress: chainlinkOracleAddress,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error(`❌ Failed to set Chainlink oracle for index ${indexId}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Batch set Chainlink oracle addresses for multiple indices
 */
async function batchSetIndexChainlinkOracles(indexIds, chainlinkOracleAddresses, privateKey) {
    console.log('🔗 Batch Setting Index Chainlink Oracles');
    console.log('=========================================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    if (indexIds.length !== chainlinkOracleAddresses.length) {
        throw new Error('Index IDs and oracle addresses arrays must have the same length');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        console.log(`📊 Setting Chainlink oracles for ${indexIds.length} indices`);
        indexIds.forEach((id, i) => {
            console.log(`   Index ${id}: ${chainlinkOracleAddresses[i]}`);
        });
        
        const tx = await contract.batchSetIndexChainlinkOracles(indexIds, chainlinkOracleAddresses);
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Batch Chainlink oracle addresses set successfully!`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexIds: indexIds,
            chainlinkOracleAddresses: chainlinkOracleAddresses,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error('❌ Failed to batch set Chainlink oracles:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get Chainlink oracle address for a specific index
 */
async function getIndexChainlinkOracleAddress(indexId) {
    try {
        const { contract } = await initializeOracle();
        
        const oracleAddress = await contract.getIndexChainlinkOracle(indexId);
        
        return {
            success: true,
            indexId: indexId,
            oracleAddress: oracleAddress,
            isDefault: oracleAddress === await contract.defaultChainlinkOracleAddress()
        };
        
    } catch (error) {
        console.error(`❌ Failed to get Chainlink oracle for index ${indexId}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get all per-index Chainlink oracle addresses
 */
async function getAllIndexChainlinkOracles() {
    console.log('🔍 Getting All Index Chainlink Oracles');
    console.log('======================================');
    
    try {
        const { contract } = await initializeOracle();
        
        // Get all indices (0-5 predefined, plus custom ones)
        const totalIndices = await contract.getNextCustomIndexId();
        const indexIds = Array.from({length: totalIndices.toNumber()}, (_, i) => i);
        
        const [oracleAddresses, isSpecific] = await contract.getMultipleIndexChainlinkOracles(indexIds);
        const defaultAddress = await contract.defaultChainlinkOracleAddress();
        
        const result = indexIds.map((id, i) => ({
            indexId: id,
            indexName: INDEX_NAMES[id] || `Custom Index ${id}`,
            oracleAddress: oracleAddresses[i],
            isSpecific: isSpecific[i],
            isDefault: !isSpecific[i],
            hasOracle: oracleAddresses[i] !== '0x0000000000000000000000000000000000000000'
        }));
        
        console.log(`✅ Retrieved oracle addresses for ${result.length} indices`);
        console.log(`🔗 Default Oracle: ${defaultAddress}`);
        
        const specificCount = result.filter(r => r.isSpecific).length;
        const defaultCount = result.filter(r => r.isDefault && r.hasOracle).length;
        
        console.log(`📊 ${specificCount} indices with specific oracles`);
        console.log(`📊 ${defaultCount} indices using default oracle\n`);
        
        return {
            success: true,
            defaultOracleAddress: defaultAddress,
            indices: result,
            summary: {
                total: result.length,
                specificOracles: specificCount,
                usingDefault: defaultCount,
                noOracle: result.filter(r => !r.hasOracle).length
            }
        };
        
    } catch (error) {
        console.error('❌ Failed to get all Chainlink oracles:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Set oracle type for an index
 */
async function setIndexOracleType(indexId, oracleType, privateKey) {
    console.log(`🔄 Setting Oracle Type for Index ${indexId}`);
    console.log('==========================================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        const oracleTypeName = ORACLE_TYPE_NAMES[oracleType] || `Type ${oracleType}`;
        console.log(`🆔 Index ID: ${indexId}`);
        console.log(`🔧 Oracle Type: ${oracleTypeName}`);
        
        let tx;
        if (indexId <= 5) {
            tx = await contract.setIndexOracleType(indexId, oracleType);
        } else {
            tx = await contract.setCustomIndexOracleType(indexId, oracleType);
        }
        
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Oracle type updated successfully!`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexId: indexId,
            oracleType: oracleType,
            oracleTypeName: oracleTypeName,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error(`❌ Failed to set oracle type for index ${indexId}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Batch set oracle types for multiple indices
 */
async function batchSetOracleTypes(indexIds, oracleTypes, privateKey) {
    console.log('🔄 Batch Setting Oracle Types');
    console.log('=============================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    if (indexIds.length !== oracleTypes.length) {
        throw new Error('Index IDs and oracle types arrays must have the same length');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        console.log(`📊 Setting oracle types for ${indexIds.length} indices`);
        indexIds.forEach((id, i) => {
            const typeName = ORACLE_TYPE_NAMES[oracleTypes[i]] || `Type ${oracleTypes[i]}`;
            console.log(`   Index ${id}: ${typeName}`);
        });
        
        const tx = await contract.batchSetOracleType(indexIds, oracleTypes);
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        console.log(`✅ Oracle types updated successfully!`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexIds: indexIds,
            oracleTypes: oracleTypes,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error('❌ Failed to batch set oracle types:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get hybrid oracle status
 */
async function getHybridOracleStatus() {
    console.log('🔍 Getting Hybrid Oracle Status');
    console.log('===============================');
    
    try {
        const { contract } = await initializeOracle();
        
        const [chainlinkAddress, isChainlinkConfigured, mockCount, chainlinkCount] = 
            await contract.getHybridOracleStatus();
        
        console.log(`🔗 Chainlink Oracle Address: ${chainlinkAddress}`);
        console.log(`✅ Chainlink Configured: ${isChainlinkConfigured ? 'Yes' : 'No'}`);
        console.log(`📊 Mock Oracle Indices: ${mockCount}`);
        console.log(`🔗 Chainlink Indices: ${chainlinkCount}`);
        console.log(`📈 Total Indices: ${mockCount.add(chainlinkCount)}\n`);
        
        return {
            success: true,
            chainlinkOracleAddress: chainlinkAddress,
            isChainlinkConfigured: isChainlinkConfigured,
            mockIndicesCount: mockCount.toNumber(),
            chainlinkIndicesCount: chainlinkCount.toNumber(),
            totalIndices: mockCount.add(chainlinkCount).toNumber()
        };
        
    } catch (error) {
        console.error('❌ Failed to get hybrid oracle status:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new custom index with oracle type selection
 */
async function createNewIndexWithOracleType(name, initialValue, sourceUrl, oracleType, privateKey) {
    console.log('🆕 Creating New Index with Oracle Type');
    console.log('======================================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        const oracleTypeName = ORACLE_TYPE_NAMES[oracleType] || `Type ${oracleType}`;
        console.log(`📋 Index Name: ${name}`);
        console.log(`💰 Initial Value: ${initialValue}`);
        console.log(`🔗 Source URL: ${sourceUrl}`);
        console.log(`🔧 Oracle Type: ${oracleTypeName}`);
        
        const tx = await contract['createCustomIndex(uint256,string,uint8,address)'](initialValue, sourceUrl, oracleType, '0x0000000000000000000000000000000000000000');
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        // Parse event to get index ID
        const event = receipt.events?.find(e => e.event === 'CustomIndexCreated');
        const indexId = event ? event.args.indexId.toNumber() : null;
        
        console.log(`✅ Index created successfully!`);
        console.log(`🆔 New Index ID: ${indexId}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexId: indexId,
            name: name,
            initialValue: initialValue,
            sourceUrl: sourceUrl,
            oracleType: oracleType,
            oracleTypeName: oracleTypeName,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error('❌ Failed to create index with oracle type:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new custom index with oracle type and specific Chainlink oracle address
 */
async function createNewIndexWithChainlinkOracle(name, initialValue, sourceUrl, oracleType, chainlinkOracleAddress, privateKey) {
    console.log('🆕 Creating New Index with Specific Chainlink Oracle');
    console.log('===================================================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    // Use null address if not provided
    const oracleAddress = chainlinkOracleAddress || '0x0000000000000000000000000000000000000000';
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        const oracleTypeName = ORACLE_TYPE_NAMES[oracleType] || `Type ${oracleType}`;
        console.log(`📋 Index Name: ${name}`);
        console.log(`💰 Initial Value: ${initialValue}`);
        console.log(`🔗 Source URL: ${sourceUrl}`);
        console.log(`🔧 Oracle Type: ${oracleTypeName}`);
        console.log(`🏭 Chainlink Oracle: ${oracleAddress === '0x0000000000000000000000000000000000000000' ? 'None (will use default)' : oracleAddress}`);
        
        const tx = await contract['createCustomIndex(uint256,string,uint8,address)'](
            initialValue, 
            sourceUrl, 
            oracleType,
            oracleAddress
        );
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        // Parse event to get index ID
        const event = receipt.events?.find(e => e.event === 'CustomIndexCreated');
        const indexId = event ? event.args.indexId.toNumber() : null;
        
        console.log(`✅ Index created successfully!`);
        console.log(`🆔 New Index ID: ${indexId}`);
        if (oracleAddress !== '0x0000000000000000000000000000000000000000') {
            console.log(`🔗 Specific Chainlink Oracle: ${oracleAddress}`);
        }
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexId: indexId,
            name: name,
            initialValue: initialValue,
            sourceUrl: sourceUrl,
            oracleType: oracleType,
            oracleTypeName: oracleTypeName,
            chainlinkOracleAddress: oracleAddress,
            hasSpecificOracle: oracleAddress !== '0x0000000000000000000000000000000000000000',
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error('❌ Failed to create index with Chainlink oracle:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get oracle type for a specific index
 */
async function getIndexOracleType(indexId) {
    try {
        const { contract } = await initializeOracle();
        
        const oracleType = await contract.getIndexOracleType(indexId);
        const oracleTypeName = ORACLE_TYPE_NAMES[oracleType] || `Type ${oracleType}`;
        
        return {
            success: true,
            indexId: indexId,
            oracleType: oracleType,
            oracleTypeName: oracleTypeName
        };
        
    } catch (error) {
        console.error(`❌ Failed to get oracle type for index ${indexId}:`, error.message);
        return { success: false, error: error.message };
    }
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
    // Initialization
    initializeOracle,
    
    // Read Functions
    getAllPredefinedIndices,
    getAllCustomIndices,
    getAllIndices,
    getIndexById,
    getOracleStatus,
    
    // Write Functions
    createNewIndex,
    updateIndexValue,
    simulatePriceMovement,
    setIndexStatus,
    
    // Hybrid Oracle Functions
    setChainlinkOracleAddress,
    setIndexChainlinkOracleAddress,
    batchSetIndexChainlinkOracles,
    getIndexChainlinkOracleAddress,
    getAllIndexChainlinkOracles,
    setIndexOracleType,
    batchSetOracleTypes,
    getHybridOracleStatus,
    createNewIndexWithOracleType,
    createNewIndexWithChainlinkOracle,
    getIndexOracleType,
    
    // Utilities
    formatIndexValue,
    displayIndex,
    displayAllIndices,
    
    // Constants
    INDEX_TYPES,
    INDEX_NAMES,
    INDEX_SYMBOLS,
    INDEX_UNITS,
    ORACLE_TYPES,
    ORACLE_TYPE_NAMES
};

// ===================================================================
// CLI USAGE (if run directly)
// ===================================================================

if (require.main === module) {
    async function runDemo() {
        console.log('🚀 ORACLE MANAGER DEMO');
        console.log('======================\n');
        
        try {
            // Check oracle status
            await getOracleStatus();
            
            // Get all indices
            const result = await getAllIndices();
            if (result.success) {
                displayAllIndices(result.indices);
                
                // Show detailed view of first few indices
                console.log('📋 DETAILED INDEX VIEW');
                console.log('======================');
                result.indices.slice(0, 3).forEach(displayIndex);
            }
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
        }
    }
    
    runDemo();
}