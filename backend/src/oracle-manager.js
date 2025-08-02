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
        INDEX_ORACLE_ADDRESS: process.env.INDEX_ORACLE_ADDRESS || '0x55aAfa1D3de3D05536C96Ee9F1b965D6cE04a4c1'
    }
};

// Contract ABI for MockIndexOracle
const MOCK_INDEX_ORACLE_ABI = [
    // Read Functions
    "function getIndexValue(uint8 indexType) external view returns (uint256 value, uint256 timestamp)",
    "function getIndexValue(uint256 indexId) external view returns (uint256 value, uint256 timestamp)",
    "function isValidIndex(uint8 indexType) external view returns (bool)",
    "function isValidIndex(uint256 indexId) external view returns (bool)",
    "function getNextCustomIndexId() external view returns (uint256)",
    "function getAllCustomIndices() external view returns (uint256[] memory indexIds, uint256[] memory values, uint256[] memory timestamps, bool[] memory activeStates)",
    "function indexData(uint8) external view returns (uint256 value, uint256 timestamp, string memory sourceUrl, bool isActive)",
    "function customIndexData(uint256) external view returns (uint256 value, uint256 timestamp, string memory sourceUrl, bool isActive)",
    "function owner() external view returns (address)",
    
    // Write Functions (onlyOwner)
    "function updateIndex(uint8 indexType, uint256 newValue) external",
    "function updateIndices(uint8[] calldata indexTypes, uint256[] calldata newValues) external",
    "function setIndexActive(uint8 indexType, bool isActive) external",
    "function simulatePriceMovement(uint8 indexType, uint256 percentChange, bool isIncrease) external",
    "function createCustomIndex(uint256 initialValue, string calldata sourceUrl) external returns (uint256 indexId)",
    "function updateCustomIndex(uint256 indexId, uint256 newValue) external",
    "function setCustomIndexActive(uint256 indexId, bool isActive) external",
    "function transferOwnership(address newOwner) external",
    
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
 * Create a new custom index
 */
async function createNewIndex(initialValue, sourceUrl, privateKey) {
    console.log('🆕 Creating New Custom Index');
    console.log('============================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    try {
        const { contract, wallet } = await initializeOracle(privateKey);
        
        console.log(`💰 Initial Value: ${initialValue}`);
        console.log(`🔗 Source URL: ${sourceUrl}`);
        console.log(`👤 Creator: ${wallet.address}`);
        
        // Call createCustomIndex
        console.log('📤 Submitting transaction...');
        const tx = await contract.createCustomIndex(initialValue, sourceUrl);
        
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        // Parse the event to get the new index ID
        const event = receipt.events?.find(e => e.event === 'CustomIndexCreated');
        const newIndexId = event ? event.args.indexId.toNumber() : null;
        
        console.log(`✅ Custom index created successfully!`);
        console.log(`🆔 New Index ID: ${newIndexId}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);
        console.log(`💰 Transaction Fee: ${ethers.utils.formatEther(receipt.gasUsed.mul(tx.gasPrice))} ETH\n`);
        
        return {
            success: true,
            indexId: newIndexId,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error('❌ Failed to create custom index:', error.message);
        return { success: false, error: error.message };
    }
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
        console.log(`💰 Transaction Fee: ${ethers.utils.formatEther(receipt.gasUsed.mul(tx.gasPrice))} ETH\n`);
        
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
        console.log(`💰 Transaction Fee: ${ethers.utils.formatEther(receipt.gasUsed.mul(tx.gasPrice))} ETH\n`);
        
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
        console.log(`💰 Transaction Fee: ${ethers.utils.formatEther(receipt.gasUsed.mul(tx.gasPrice))} ETH\n`);
        
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
    
    // Utilities
    formatIndexValue,
    displayIndex,
    displayAllIndices,
    
    // Constants
    INDEX_TYPES,
    INDEX_NAMES,
    INDEX_SYMBOLS,
    INDEX_UNITS
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