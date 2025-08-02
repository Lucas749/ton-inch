#!/usr/bin/env node

/**
 * Test script for Chainlink Oracle Manager
 * 
 * Demonstrates Chainlink Functions integration:
 * - Check oracle status
 * - List available templates
 * - View existing indices
 * - Create new index (optional)
 * - Update index with real-world data
 */

const chainlinkManager = require('./src/chainlink-oracle-manager');
require('dotenv').config();

async function testChainlinkOracle() {
    console.log('🧪 TESTING CHAINLINK ORACLE MANAGER');
    console.log('===================================\n');
    
    const privateKey = process.env.PRIVATE_KEY;
    const chainlinkOracleAddress = process.env.CHAINLINK_ORACLE_ADDRESS;
    
    if (!chainlinkOracleAddress) {
        console.log('❌ CHAINLINK_ORACLE_ADDRESS not set in environment variables');
        console.log('   Please deploy the ChainlinkIndexOracle contract first:');
        console.log('   forge script script/DeployChainlinkOracle.s.sol --rpc-url $RPC_URL --broadcast\n');
        return;
    }
    
    try {
        console.log('📋 TEST 1: Oracle Status Check');
        console.log('===============================');
        const status = await chainlinkManager.getChainlinkOracleStatus();
        if (status.success) {
            console.log(`✅ Oracle operational at ${status.contractAddress}`);
            console.log(`🔗 Subscription ID: ${status.subscriptionId}`);
            console.log(`📊 Total Indices: ${status.totalIndices}\n`);
        } else {
            console.log(`❌ Oracle status check failed: ${status.error}\n`);
            return;
        }
        
        console.log('📝 TEST 2: Available Source Templates');
        console.log('=====================================');
        chainlinkManager.listSourceTemplates();
        console.log('');
        
        console.log('📊 TEST 3: Current Chainlink Indices');
        console.log('====================================');
        const indices = await chainlinkManager.getAllChainlinkIndices();
        if (indices.success) {
            console.log(`✅ Found ${indices.count} Chainlink indices`);
            
            if (indices.count > 0) {
                console.log('\n📋 Index Details:');
                indices.indices.forEach((index, i) => {
                    const status = index.isActive ? '🟢' : '🔴';
                    console.log(`   ${i + 1}. ${status} Index ${index.id}: ${index.formatted}`);
                    console.log(`      Source: ${index.sourceUrl}`);
                    console.log(`      Updated: ${index.timestamp}`);
                    console.log(`      Raw Value: ${index.value}`);
                    console.log('');
                });
            } else {
                console.log('   No indices found - contract may need initialization\n');
            }
        } else {
            console.log(`❌ Failed to get indices: ${indices.error}\n`);
        }
        
        // Test write functions only if private key is available
        if (privateKey) {
            console.log('✍️ WRITE OPERATIONS TESTS');
            console.log('=========================');
            
            console.log('🆕 TEST 4: Create New Index (BTC Price)');
            console.log('=======================================');
            
            const newIndex = await chainlinkManager.createChainlinkIndex(
                'BTC',                                      // Template name
                'https://api.coingecko.com/api/v3/bitcoin', // Source URL
                'Bitcoin Price Index via CoinGecko',        // Description
                privateKey
            );
            
            if (newIndex.success) {
                console.log(`✅ Created Chainlink index ${newIndex.indexId}`);
                console.log(`📤 Transaction: ${newIndex.transactionHash}\n`);
                
                console.log('📈 TEST 5: Update Index with Real Data');
                console.log('======================================');
                
                // Wait a moment for the index to be ready
                console.log('⏳ Waiting 5 seconds before update...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const updateResult = await chainlinkManager.updateChainlinkIndex(
                    newIndex.indexId,     // Index ID
                    'BTC',                // Template name
                    [],                   // Arguments (BTC template doesn't need args)
                    privateKey
                );
                
                if (updateResult.success) {
                    console.log(`✅ Chainlink Functions request sent for index ${newIndex.indexId}`);
                    console.log(`🔗 Request ID: ${updateResult.requestId}`);
                    console.log(`📤 Transaction: ${updateResult.transactionHash}`);
                    console.log(`⏳ The oracle will be updated when Chainlink Functions fulfills the request\n`);
                } else {
                    console.log(`❌ Update failed: ${updateResult.error}\n`);
                }
                
            } else {
                console.log(`❌ Index creation failed: ${newIndex.error}\n`);
            }
            
            console.log('🔄 TEST 6: Update Existing Index (VIX)');
            console.log('======================================');
            
            if (indices.success && indices.indices.length > 0) {
                const vixIndex = indices.indices.find(idx => idx.id === 0); // VIX is usually index 0
                
                if (vixIndex) {
                    const vixUpdate = await chainlinkManager.updateChainlinkIndex(
                        0,              // VIX Index ID
                        'VIX',          // Template name
                        [],             // Arguments
                        privateKey
                    );
                    
                    if (vixUpdate.success) {
                        console.log(`✅ VIX update request sent`);
                        console.log(`🔗 Request ID: ${vixUpdate.requestId}`);
                        console.log(`📤 Transaction: ${vixUpdate.transactionHash}\n`);
                    } else {
                        console.log(`❌ VIX update failed: ${vixUpdate.error}\n`);
                    }
                } else {
                    console.log('⚠️ VIX index (ID 0) not found\n');
                }
            }
            
        } else {
            console.log('⚠️ WRITE OPERATIONS SKIPPED');
            console.log('===========================');
            console.log('Private key not found in environment variables.');
            console.log('Set PRIVATE_KEY in .env to test write operations.\n');
        }
        
        console.log('🎯 FINAL STATUS: Check Oracle Again');
        console.log('===================================');
        const finalStatus = await chainlinkManager.getChainlinkOracleStatus();
        if (finalStatus.success) {
            console.log(`📊 Final Index Count: ${finalStatus.totalIndices}`);
            console.log(`🔗 Subscription ID: ${finalStatus.subscriptionId}`);
            console.log('');
        }
        
        console.log('✅ ALL CHAINLINK TESTS COMPLETED!');
        console.log('==================================');
        console.log('🔗 Chainlink Functions oracle is ready for decentralized data feeds');
        console.log('⏳ Note: Updates are asynchronous - check back in a few minutes');
        console.log('🔍 Monitor events on Basescan for RequestSent and RequestFulfilled');
        console.log('💡 Use the oracle in your trading strategies for truly decentralized conditions\n');
        
        console.log('💻 INTEGRATION EXAMPLES');
        console.log('=======================');
        
        console.log(`
🔧 Using Chainlink Oracle in Trading Strategy:

// Import the Chainlink oracle manager
const chainlinkManager = require('./chainlink-oracle-manager');

// Create a new trading condition based on real-world data
const createChainlinkCondition = async (indexId, operator, threshold) => {
  const indices = await chainlinkManager.getAllChainlinkIndices();
  const index = indices.indices.find(idx => idx.id === indexId);
  
  if (!index) {
    throw new Error(\`Index \${indexId} not found\`);
  }
  
  const currentValue = parseInt(index.value);
  const conditionMet = operator === 'gt' ? 
    currentValue > threshold : 
    currentValue < threshold;
  
  return {
    indexName: index.sourceUrl,
    currentValue: currentValue,
    threshold: threshold,
    operator: operator,
    conditionMet: conditionMet,
    lastUpdate: index.timestamp
  };
};

// Example: Check if BTC > $45,000
const btcCondition = await createChainlinkCondition(1, 'gt', 4500000);
console.log('BTC Condition:', btcCondition);

🔧 Integration with 1inch Orders:

// Use Chainlink data in your index-based orders
const { createIndexBasedOrder } = require('./index-order-creator');

const createChainlinkBasedOrder = async (chainlinkIndexId, ...otherParams) => {
  // Get current value from Chainlink oracle
  const indices = await chainlinkManager.getAllChainlinkIndices();
  const chainlinkIndex = indices.indices.find(idx => idx.id === chainlinkIndexId);
  
  // Create order using Chainlink data
  return await createIndexBasedOrder({
    ...otherParams,
    indexId: chainlinkIndexId,
    // Use Chainlink oracle instead of mock oracle
    oracleType: 'chainlink'
  });
};
`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
if (require.main === module) {
    testChainlinkOracle().catch(console.error);
}

module.exports = { testChainlinkOracle };