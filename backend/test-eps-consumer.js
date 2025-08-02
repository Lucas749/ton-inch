/**
 * Test EPS Consumer Contract
 * Simple script to interact with the deployed EPS consumer
 */

require('dotenv').config();
const { ethers } = require('ethers');

// Configuration
const CONFIG = {
    RPC_URL: process.env.RPC_URL || 'https://base.llamarpc.com',
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    SUBSCRIPTION_ID: process.env.CHAINLINK_SUBSCRIPTION_ID || '65'
};

// EPS Consumer ABI (minimal)
const EPS_CONSUMER_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "symbol", "type": "string"}],
        "name": "requestEPS",
        "outputs": [{"internalType": "bytes32", "name": "requestId", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getLatestEPS",
        "outputs": [
            {"internalType": "uint256", "name": "eps", "type": "uint256"},
            {"internalType": "string", "name": "symbol", "type": "string"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getFormattedEPS",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "latestEPS",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "lastSymbol",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "lastUpdateTime",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "subscriptionId",
        "outputs": [{"internalType": "uint64", "name": "", "type": "uint64"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "s_lastRequestId",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "bytes32", "name": "requestId", "type": "bytes32"},
            {"indexed": false, "internalType": "string", "name": "symbol", "type": "string"},
            {"indexed": false, "internalType": "uint256", "name": "epsValue", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "EPSUpdated",
        "type": "event"
    }
];

// Initialize contract
async function initializeContract(contractAddress) {
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    const contract = new ethers.Contract(contractAddress, EPS_CONSUMER_ABI, provider);
    
    let signer = null;
    if (CONFIG.PRIVATE_KEY) {
        signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    }
    
    return { contract, provider, signer };
}

// Read current EPS data
async function readEPSData(contract) {
    console.log('📊 READING CURRENT EPS DATA');
    console.log('============================');
    
    try {
        const [eps, symbol, timestamp] = await contract.getLatestEPS();
        const formattedEPS = await contract.getFormattedEPS();
        const subscriptionId = await contract.subscriptionId();
        const lastRequestId = await contract.s_lastRequestId();
        
        console.log('Contract Info:');
        console.log(`  Address: ${contract.address}`);
        console.log(`  Subscription ID: ${subscriptionId.toString()}`);
        console.log('');
        
        console.log('Latest EPS Data:');
        console.log(`  Symbol: ${symbol || 'None'}`);
        console.log(`  Raw EPS: ${eps.toString()}`);
        console.log(`  Formatted EPS: $${formattedEPS}`);
        console.log(`  Last Update: ${timestamp.toString() === '0' ? 'Never' : new Date(timestamp.toNumber() * 1000).toLocaleString()}`);
        console.log(`  Last Request ID: ${lastRequestId === '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'None' : lastRequestId}`);
        
        return {
            success: true,
            eps: eps.toString(),
            formattedEPS,
            symbol,
            timestamp: timestamp.toString(),
            subscriptionId: subscriptionId.toString()
        };
    } catch (error) {
        console.error('❌ Error reading EPS data:', error.message);
        return { success: false, error: error.message };
    }
}

// Request new EPS data
async function requestEPS(contract, signer, symbol = 'MSTR') {
    if (!signer) {
        throw new Error('Private key required for requesting EPS data');
    }
    
    console.log(`🔄 REQUESTING EPS DATA FOR ${symbol.toUpperCase()}`);
    console.log('=================================');
    
    try {
        const contractWithSigner = contract.connect(signer);
        
        // Set gas settings for Base network
        const gasSettings = {
            gasPrice: ethers.utils.parseUnits('0.0052', 'gwei'),
            gasLimit: 500000  // Higher limit for Chainlink Functions
        };
        
        const tx = await contractWithSigner.requestEPS(symbol.toUpperCase(), gasSettings);
        console.log(`📡 Request transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Request confirmed in block ${receipt.blockNumber}`);
        console.log(`⏰ Note: Chainlink Functions response may take 1-2 minutes`);
        
        return {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber
        };
    } catch (error) {
        console.error('❌ Error requesting EPS:', error.message);
        return { success: false, error: error.message };
    }
}

// Main test function
async function main() {
    // Replace with your deployed contract address
    const CONTRACT_ADDRESS = process.argv[2];
    
    if (!CONTRACT_ADDRESS) {
        console.log('Usage: node test-eps-consumer.js <contract_address> [action] [symbol]');
        console.log('');
        console.log('Examples:');
        console.log('  node test-eps-consumer.js 0x123... read');
        console.log('  node test-eps-consumer.js 0x123... request MSTR');
        console.log('  node test-eps-consumer.js 0x123... request AAPL');
        return;
    }
    
    const action = process.argv[3] || 'read';
    const symbol = process.argv[4] || 'MSTR';
    
    try {
        const { contract, provider, signer } = await initializeContract(CONTRACT_ADDRESS);
        
        console.log(`🏗️  EPS CONSUMER TEST`);
        console.log(`========================`);
        console.log(`Contract: ${CONTRACT_ADDRESS}`);
        console.log(`Action: ${action}`);
        console.log(`Network: Base Mainnet`);
        console.log('');
        
        if (action === 'read') {
            await readEPSData(contract);
        } else if (action === 'request') {
            if (!signer) {
                console.error('❌ Private key required for requesting data');
                return;
            }
            
            // First show current data
            await readEPSData(contract);
            console.log('');
            
            // Then request new data
            const result = await requestEPS(contract, signer, symbol);
            
            if (result.success) {
                console.log('');
                console.log('💡 TIP: Run "read" action again in 1-2 minutes to see updated data');
            }
        } else {
            console.error('❌ Unknown action. Use "read" or "request"');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Export functions for use as module
module.exports = {
    initializeContract,
    readEPSData,
    requestEPS
};

// Run if called directly
if (require.main === module) {
    main();
}