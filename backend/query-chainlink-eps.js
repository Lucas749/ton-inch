/**
 * Query EPS Values from Chainlink Oracle
 * 
 * This script demonstrates how to:
 * 1. Read current EPS estimates from the deployed Chainlink oracle
 * 2. Trigger updates for new EPS data
 * 3. Query specific stock symbols
 */

require('dotenv').config();
const { ethers } = require('ethers');

// Configuration
const CONFIG = {
    RPC_URL: process.env.RPC_URL || 'https://base.llamarpc.com',
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    CHAINLINK_ORACLE_ADDRESS: '0x605B42A92f8707520629CA9bD924f469c262C8e3',
    ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY || '123'
};

// Minimal ABI for the functions we need
const CHAINLINK_ORACLE_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "indexId", "type": "uint256"}],
        "name": "getIndexValue",
        "outputs": [
            {"internalType": "uint256", "name": "value", "type": "uint256"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"internalType": "string", "name": "sourceUrl", "type": "string"},
            {"internalType": "bool", "name": "isActive", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTotalIndices",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "indexId", "type": "uint256"},
            {"internalType": "string", "name": "sourceCode", "type": "string"},
            {"internalType": "string[]", "name": "args", "type": "string[]"}
        ],
        "name": "updateIndex",
        "outputs": [{"internalType": "bytes32", "name": "requestId", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "sourceCode", "type": "string"},
            {"internalType": "string", "name": "sourceUrl", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"}
        ],
        "name": "createIndex",
        "outputs": [{"internalType": "uint256", "name": "indexId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "indexData",
        "outputs": [
            {"internalType": "uint256", "name": "value", "type": "uint256"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"internalType": "string", "name": "sourceUrl", "type": "string"},
            {"internalType": "bool", "name": "isActive", "type": "bool"},
            {"internalType": "bytes32", "name": "lastRequestId", "type": "bytes32"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// Initialize provider and contract
async function initializeContract() {
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    const contract = new ethers.Contract(
        CONFIG.CHAINLINK_ORACLE_ADDRESS, 
        CHAINLINK_ORACLE_ABI, 
        provider
    );
    
    let signer = null;
    if (CONFIG.PRIVATE_KEY) {
        signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    }
    
    return { provider, contract, signer };
}

// Get current EPS value for an index
async function getCurrentEPS(contract, indexId) {
    try {
        const [value, timestamp, sourceUrl, isActive] = await contract.getIndexValue(indexId);
        
        return {
            indexId,
            value: value.toString(),
            epsEstimate: parseFloat(value.toString()) / 10000, // Convert from scaled value
            timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
            sourceUrl,
            isActive,
            lastUpdated: new Date(timestamp.toNumber() * 1000).toLocaleString()
        };
    } catch (error) {
        return {
            indexId,
            error: error.message,
            success: false
        };
    }
}

// Get all current indices
async function getAllIndices(contract) {
    try {
        const totalIndices = await contract.getTotalIndices();
        const indices = [];
        
        console.log(`📊 Found ${totalIndices} total indices`);
        
        for (let i = 0; i < totalIndices.toNumber(); i++) {
            const indexData = await getCurrentEPS(contract, i);
            indices.push(indexData);
        }
        
        return indices;
    } catch (error) {
        console.error('Error getting all indices:', error.message);
        return [];
    }
}

// Update EPS for a specific stock symbol
async function updateEPS(contract, signer, indexId, stockSymbol = 'MSTR') {
    if (!signer) {
        throw new Error('Private key required for updating indices');
    }
    
    const contractWithSigner = contract.connect(signer);
    
    try {
        console.log(`🔄 Updating EPS estimate for ${stockSymbol}...`);
        
        // Use empty string to use the default Alpha Vantage source code
        const sourceCode = '';
        const args = [stockSymbol.toUpperCase()];
        
        // Base network gas settings - very low fees
        const gasSettings = {
            gasPrice: ethers.utils.parseUnits('0.0052', 'gwei'), // 0.0052 GWEI for Base
            gasLimit: 500000 // Conservative gas limit
        };
        
        console.log(`⛽ Using gas price: 0.0052 GWEI (Base network)`);
        
        const tx = await contractWithSigner.updateIndex(indexId, sourceCode, args, gasSettings);
        console.log(`📡 Update transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Update confirmed in block ${receipt.blockNumber}`);
        console.log(`💰 Gas used: ${receipt.gasUsed.toString()}`);
        
        return {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };
    } catch (error) {
        console.error(`❌ Failed to update EPS: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

// Create a new EPS index for a stock
async function createEPSIndex(contract, signer, stockSymbol, description) {
    if (!signer) {
        throw new Error('Private key required for creating indices');
    }
    
    const contractWithSigner = contract.connect(signer);
    
    try {
        console.log(`🆕 Creating new EPS index for ${stockSymbol}...`);
        
        // Use empty string to use the default Alpha Vantage source code
        const sourceCode = '';
        const sourceUrl = `Alpha Vantage EPS Estimates for ${stockSymbol}`;
        
        // Base network gas settings - very low fees
        const gasSettings = {
            gasPrice: ethers.utils.parseUnits('0.0052', 'gwei'), // 0.0052 GWEI for Base
            gasLimit: 800000 // Higher limit for contract creation
        };
        
        console.log(`⛽ Using gas price: 0.0052 GWEI (Base network)`);
        
        const tx = await contractWithSigner.createIndex(sourceCode, sourceUrl, description, gasSettings);
        console.log(`📡 Create transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Index created in block ${receipt.blockNumber}`);
        console.log(`💰 Gas used: ${receipt.gasUsed.toString()}`);
        
        // Extract the new index ID from events (would need event parsing)
        return {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };
    } catch (error) {
        console.error(`❌ Failed to create EPS index: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

// Format EPS data for display
function formatEPSData(epsData) {
    if (epsData.error) {
        return `❌ Index ${epsData.indexId}: ${epsData.error}`;
    }
    
    const status = epsData.isActive ? '🟢 Active' : '🔴 Inactive';
    return `
📊 Index ${epsData.indexId} ${status}
   EPS Estimate: $${epsData.epsEstimate.toFixed(4)}
   Raw Value: ${epsData.value}
   Last Updated: ${epsData.lastUpdated}
   Source: ${epsData.sourceUrl}`;
}

// Main demonstration function
async function main() {
    console.log('🔗 CHAINLINK EPS ORACLE QUERY');
    console.log('=============================');
    console.log(`📍 Oracle Address: ${CONFIG.CHAINLINK_ORACLE_ADDRESS}`);
    console.log(`🌐 Network: Base Mainnet`);
    console.log('');

    try {
        const { contract, signer } = await initializeContract();
        
        // 1. Get all current EPS values
        console.log('📊 CURRENT EPS VALUES:');
        console.log('======================');
        const allIndices = await getAllIndices(contract);
        
        allIndices.forEach(epsData => {
            console.log(formatEPSData(epsData));
        });
        
        console.log('');
        
        // 2. Demonstrate updating an index (if private key available)
        if (signer && allIndices.length > 0) {
            console.log('🔄 UPDATING EPS DATA:');
            console.log('====================');
            
            // Update the first index with MSTR data
            const updateResult = await updateEPS(contract, signer, 0, 'MSTR');
            console.log(updateResult);
            
            if (updateResult.success) {
                console.log('⏳ Wait ~60 seconds for Chainlink Functions to update...');
                console.log('🔍 Then run this script again to see the updated value!');
            }
        } else if (!signer) {
            console.log('ℹ️  To update EPS data, set PRIVATE_KEY in your .env file');
        }
        
        console.log('');
        console.log('💡 USAGE EXAMPLES:');
        console.log('==================');
        console.log('• Query MSTR EPS: node query-chainlink-eps.js');
        console.log('• Update with AAPL: updateEPS(contract, signer, 0, "AAPL")');
        console.log('• Update with TSLA: updateEPS(contract, signer, 0, "TSLA")');
        console.log('• Any stock symbol supported by Alpha Vantage');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Export functions for use in other scripts
module.exports = {
    initializeContract,
    getCurrentEPS,
    getAllIndices,
    updateEPS,
    createEPSIndex,
    formatEPSData,
    CONFIG
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}