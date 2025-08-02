#!/usr/bin/env node

/**
 * Test script to diagnose admin controls issue with getting current index values
 */

console.log('🧪 Testing Admin Controls Issue...\n');

async function testGetIndexValue() {
  try {
    // Import the blockchain service
    const { blockchainService } = await import('./lib/blockchain-service.js');
    
    console.log('✅ Blockchain service imported successfully');
    
    // Test for a few different index IDs
    const testIndexIds = [0, 1, 2, 14];  // Test predefined indices and the custom index 14 from the admin screen
    
    for (const indexId of testIndexIds) {
      console.log(`\n🔍 Testing index ${indexId}...`);
      
      try {
        const result = await blockchainService.getIndexValue(indexId);
        console.log(`✅ Index ${indexId} - Value: ${result.value}, Timestamp: ${result.timestamp}`);
        console.log(`   Last updated: ${new Date(result.timestamp * 1000).toLocaleString()}`);
      } catch (error) {
        console.error(`❌ Error getting index ${indexId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to test getIndexValue:', error);
    console.error('Full error:', error);
  }
}

async function testOracleContract() {
  try {
    const { blockchainService } = await import('./lib/blockchain-service.js');
    
    console.log('\n🔧 Testing oracle contract initialization...');
    
    // Check if the oracle contract is properly initialized
    const indices = blockchainService.indices;
    console.log('Oracle contract object:', !!indices.oracle);
    
    if (indices.oracle) {
      console.log('Oracle contract address:', indices.oracle.options.address);
    }
    
  } catch (error) {
    console.error('❌ Failed to test oracle contract:', error);
  }
}

async function main() {
  await testOracleContract();
  await testGetIndexValue();
}

main().catch(console.error);