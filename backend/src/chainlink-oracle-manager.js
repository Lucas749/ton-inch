#!/usr/bin/env node

/**
 * Chainlink Oracle Manager
 * 
 * Provides functions to interact with the ChainlinkIndexOracle contract
 * 
 * Features:
 * - Create new indices with custom source code
 * - Update existing indices
 * - Manage source code templates
 * - Monitor request status
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Manual config
const CONFIG = {
    CHAIN_ID: parseInt(process.env.CHAIN_ID) || 8453,
    RPC_URL: process.env.RPC_URL || 'https://base.llamarpc.com',
    CONTRACTS: {
        CHAINLINK_ORACLE_ADDRESS: process.env.CHAINLINK_ORACLE_ADDRESS || ''
    }
};

// Chainlink Oracle ABI (simplified for key functions)
const CHAINLINK_ORACLE_ABI = [
    "function createIndex(string memory sourceCode, string memory sourceUrl, string memory description) external returns (uint256 indexId)",
    "function updateIndex(uint256 indexId, string memory sourceCode, string[] memory args) external returns (bytes32 requestId)",
    "function updateMultipleIndices(uint256[] memory indexIds, string memory sourceCode, string[][] memory args) external",
    "function getIndexValue(uint256 indexId) external view returns (uint256 value, uint256 timestamp, string memory sourceUrl, bool isActive)",
    "function updateDefaultSource(string memory newSource) external",
    "function setIndexActive(uint256 indexId, bool isActive) external",
    "function getTotalIndices() external view returns (uint256)",
    "function subscriptionId() external view returns (uint64)",
    "function defaultSource() external view returns (string memory)",
    "function emergencySetValue(uint256 indexId, uint256 value) external",
    
    // Events
    "event IndexCreated(uint256 indexed indexId, string sourceUrl, string description)",
    "event IndexUpdated(uint256 indexed indexId, uint256 value, uint256 timestamp, string sourceUrl)",
    "event RequestSent(bytes32 indexed requestId, uint256 indexed indexId)",
    "event RequestFulfilled(bytes32 indexed requestId, uint256 indexed indexId, uint256 value)"
];

// Source code templates
const SOURCE_TEMPLATES = {
    VIX: path.join(__dirname, '../chainlink-functions/vix-source.js'),
    BTC: path.join(__dirname, '../chainlink-functions/btc-price-source.js'),
    STOCK: path.join(__dirname, '../chainlink-functions/stock-price-source.js'),
    INFLATION: path.join(__dirname, '../chainlink-functions/inflation-source.js'),
    GENERIC: path.join(__dirname, '../chainlink-functions/generic-api-source.js')
};

// ===================================================================
// INITIALIZATION
// ===================================================================

/**
 * Initialize Chainlink oracle connection
 */
async function initializeChainlinkOracle(privateKey = null) {
    console.log('🔧 Initializing Chainlink Oracle Connection');
    console.log('============================================');
    
    try {
        if (!CONFIG.CONTRACTS.CHAINLINK_ORACLE_ADDRESS) {
            throw new Error('CHAINLINK_ORACLE_ADDRESS not set in environment variables');
        }
        
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
            CONFIG.CONTRACTS.CHAINLINK_ORACLE_ADDRESS,
            CHAINLINK_ORACLE_ABI,
            wallet || provider
        );
        
        console.log(`📍 Oracle Address: ${CONFIG.CONTRACTS.CHAINLINK_ORACLE_ADDRESS}`);
        console.log(`🌐 Network: ${CONFIG.CHAIN_ID}`);
        console.log('✅ Chainlink oracle connection initialized\n');
        
        return { provider, wallet, contract };
    } catch (error) {
        console.error('❌ Failed to initialize Chainlink oracle:', error.message);
        throw error;
    }
}

// ===================================================================
// READ FUNCTIONS
// ===================================================================

/**
 * Get all indices from the Chainlink oracle
 */
async function getAllChainlinkIndices() {
    console.log('📊 Getting All Chainlink Indices');
    console.log('=================================');
    
    try {
        const { contract } = await initializeChainlinkOracle();
        
        const totalIndices = await contract.getTotalIndices();
        const indices = [];
        
        for (let i = 0; i < totalIndices.toNumber(); i++) {
            try {
                const [value, timestamp, sourceUrl, isActive] = await contract.getIndexValue(i);
                
                indices.push({
                    id: i,
                    value: value.toString(),
                    timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
                    sourceUrl: sourceUrl,
                    isActive: isActive,
                    formatted: formatChainlinkValue(i, value)
                });
            } catch (error) {
                console.warn(`Warning: Could not fetch index ${i}: ${error.message}`);
            }
        }
        
        console.log(`✅ Found ${indices.length} Chainlink indices\n`);
        
        return {
            success: true,
            indices: indices,
            count: indices.length
        };
        
    } catch (error) {
        console.error('❌ Failed to get Chainlink indices:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get oracle status and configuration
 */
async function getChainlinkOracleStatus() {
    console.log('🔍 Getting Chainlink Oracle Status');
    console.log('==================================');
    
    try {
        const { contract } = await initializeChainlinkOracle();
        
        const subscriptionId = await contract.subscriptionId();
        const totalIndices = await contract.getTotalIndices();
        const defaultSource = await contract.defaultSource();
        
        console.log(`📍 Contract Address: ${CONFIG.CONTRACTS.CHAINLINK_ORACLE_ADDRESS}`);
        console.log(`🔗 Subscription ID: ${subscriptionId}`);
        console.log(`📊 Total Indices: ${totalIndices}`);
        console.log(`📝 Default Source Length: ${defaultSource.length} characters`);
        console.log('✅ Chainlink oracle is operational\n');
        
        return {
            success: true,
            contractAddress: CONFIG.CONTRACTS.CHAINLINK_ORACLE_ADDRESS,
            subscriptionId: subscriptionId.toString(),
            totalIndices: totalIndices.toNumber(),
            defaultSourceLength: defaultSource.length,
            status: 'operational'
        };
        
    } catch (error) {
        console.error('❌ Failed to get oracle status:', error.message);
        return { success: false, error: error.message };
    }
}

// ===================================================================
// WRITE FUNCTIONS
// ===================================================================

/**
 * Create a new index with custom source code
 */
async function createChainlinkIndex(templateName, sourceUrl, description, privateKey) {
    console.log('🆕 Creating New Chainlink Index');
    console.log('===============================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    try {
        // Load source code template
        const templatePath = SOURCE_TEMPLATES[templateName.toUpperCase()];
        if (!templatePath || !fs.existsSync(templatePath)) {
            throw new Error(`Template '${templateName}' not found`);
        }
        
        const sourceCode = fs.readFileSync(templatePath, 'utf8');
        console.log(`📝 Using template: ${templateName}`);
        console.log(`🔗 Source URL: ${sourceUrl}`);
        console.log(`📋 Description: ${description}`);
        
        const { contract, wallet } = await initializeChainlinkOracle(privateKey);
        
        // Create the index
        console.log('📤 Submitting transaction...');
        const tx = await contract.createIndex(sourceCode, sourceUrl, description);
        
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        // Parse event to get index ID
        const event = receipt.events?.find(e => e.event === 'IndexCreated');
        const indexId = event ? event.args.indexId.toNumber() : null;
        
        console.log(`✅ Chainlink index created successfully!`);
        console.log(`🆔 New Index ID: ${indexId}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        
        return {
            success: true,
            indexId: indexId,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error('❌ Failed to create Chainlink index:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing index using Chainlink Functions
 */
async function updateChainlinkIndex(indexId, templateName, args, privateKey) {
    console.log(`📝 Updating Chainlink Index ${indexId}`);
    console.log('====================================');
    
    if (!privateKey) {
        throw new Error('Private key required for write operations');
    }
    
    try {
        // Load source code template (optional)
        let sourceCode = '';
        if (templateName) {
            const templatePath = SOURCE_TEMPLATES[templateName.toUpperCase()];
            if (templatePath && fs.existsSync(templatePath)) {
                sourceCode = fs.readFileSync(templatePath, 'utf8');
                console.log(`📝 Using template: ${templateName}`);
            }
        }
        
        console.log(`🆔 Index ID: ${indexId}`);
        console.log(`📊 Arguments: ${JSON.stringify(args)}`);
        
        const { contract, wallet } = await initializeChainlinkOracle(privateKey);
        
        // Update the index
        console.log('📤 Submitting Chainlink Functions request...');
        const tx = await contract.updateIndex(indexId, sourceCode, args);
        
        console.log(`⏳ Transaction Hash: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        // Parse event to get request ID
        const event = receipt.events?.find(e => e.event === 'RequestSent');
        const requestId = event ? event.args.requestId : null;
        
        console.log(`✅ Chainlink Functions request sent successfully!`);
        console.log(`🔗 Request ID: ${requestId}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed}`);

        console.log(`⏳ Waiting for Chainlink Functions to fulfill the request...\n`);
        
        return {
            success: true,
            indexId: indexId,
            requestId: requestId,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.error(`❌ Failed to update Chainlink index ${indexId}:`, error.message);
        return { success: false, error: error.message };
    }
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Format Chainlink index value for display
 */
function formatChainlinkValue(indexId, value) {
    const numValue = typeof value === 'string' ? parseInt(value) : value.toNumber();
    
    switch (indexId) {
        case 0: // VIX Index
            return `${(numValue / 100).toFixed(2)}`;
        case 1: // BTC Price
            return `$${(numValue / 100).toFixed(2)}`;
        case 2: // Inflation Rate
            return `${(numValue / 100).toFixed(2)}%`;
        default:
            return numValue.toString();
    }
}

/**
 * List available source code templates
 */
function listSourceTemplates() {
    console.log('📝 Available Source Code Templates');
    console.log('==================================');
    
    Object.keys(SOURCE_TEMPLATES).forEach(name => {
        const path = SOURCE_TEMPLATES[name];
        const exists = fs.existsSync(path);
        console.log(`${exists ? '✅' : '❌'} ${name}: ${path}`);
    });
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
    // Initialization
    initializeChainlinkOracle,
    
    // Read Functions
    getAllChainlinkIndices,
    getChainlinkOracleStatus,
    
    // Write Functions
    createChainlinkIndex,
    updateChainlinkIndex,
    
    // Utilities
    formatChainlinkValue,
    listSourceTemplates,
    
    // Constants
    CONFIG,
    SOURCE_TEMPLATES
};

// ===================================================================
// CLI USAGE (if run directly)
// ===================================================================

if (require.main === module) {
    async function runDemo() {
        console.log('🔗 CHAINLINK ORACLE MANAGER DEMO');
        console.log('=================================\n');
        
        try {
            // Check oracle status
            await getChainlinkOracleStatus();
            
            // List templates
            listSourceTemplates();
            
            // Get all indices
            const result = await getAllChainlinkIndices();
            if (result.success) {
                console.log('\n📊 CURRENT CHAINLINK INDICES');
                console.log('=============================');
                result.indices.forEach((index, i) => {
                    const status = index.isActive ? '🟢' : '🔴';
                    console.log(`${i + 1}. ${status} Index ${index.id}: ${index.formatted}`);
                    console.log(`   Source: ${index.sourceUrl}`);
                    console.log(`   Updated: ${index.timestamp}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
        }
    }
    
    runDemo();
}